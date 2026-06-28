"""
Shuna Stateless HTTP Pipelined Voice Agent (Local ONNX TTS)
===========================================================
Stateless, robust, and highly scalable pipeline (Web Speech STT -> Text LLM -> Kokoro ONNX TTS).
Runs entirely locally to avoid cloud API rate limits, keeping RAM footprint under 200MB.
Optimized for 512MB RAM constraints on Render.
"""

import os
import gc

# ── ONNX Runtime Memory Optimizations ────────────────────────────────────────
# Force single-threaded execution at the OS level to reduce thread-pool memory overhead
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["ONNXRUNTIME_INTER_OP_NUM_THREADS"] = "1"
os.environ["ONNXRUNTIME_INTRA_OP_NUM_THREADS"] = "1"


# ── Rest of imports ──────────────────────────────────────────────────────────
import io
import base64
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import soundfile as sf
import numpy as np
from kokoro_onnx import Kokoro

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shuna-voice")

# ── Configuration ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MAIN_BACKEND_URL = os.environ.get("MAIN_BACKEND_URL", "https://emotional-ai-18zi.onrender.com")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "kokoro-v1.0.int8.onnx")
VOICES_BIN_PATH = os.path.join(os.path.dirname(__file__), "voices-v1.0.bin")
SHUNA_VOICE_PATH = os.path.join(os.path.dirname(__file__), "voices", "shuna_voice.npy")

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
VOICES_BIN_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

# Global states
supabase: Client = None
kokoro_engine: Kokoro = None
SHUNA_VOICE: np.ndarray = None

# ── Setup ────────────────────────────────────────────────────────────────────
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase environment variables missing. Chat records will not be persisted.")

def download_file(url: str, dest: str):
    logger.info(f"Downloading {url} to {dest}...")
    import urllib.request
    temp_dest = dest + ".tmp"
    urllib.request.urlretrieve(url, temp_dest)
    os.rename(temp_dest, dest)
    logger.info(f"Downloaded {dest} successfully.")
    gc.collect()  # Release memory from download operations

def ensure_assets():
    global SHUNA_VOICE
    
    # 1. Download ONNX model if missing
    if not os.path.exists(MODEL_PATH):
        logger.info("ONNX model file missing.")
        download_file(MODEL_URL, MODEL_PATH)
        
    # 2. Download Voices BIN file if missing
    if not os.path.exists(VOICES_BIN_PATH):
        logger.info("Voices binary file missing.")
        download_file(VOICES_BIN_URL, VOICES_BIN_PATH)

    # 3. Load Shuna custom blended voice style
    if os.path.exists(SHUNA_VOICE_PATH):
        try:
            SHUNA_VOICE = np.load(SHUNA_VOICE_PATH)
            logger.info(f"Loaded Shuna custom blended voice from {SHUNA_VOICE_PATH} (shape: {SHUNA_VOICE.shape})")
        except Exception as e:
            logger.error(f"Error loading custom voice npy style: {e}")
    else:
        logger.error(f"Custom voice style file missing at {SHUNA_VOICE_PATH}. Standard voices will be used as fallback.")

init_error = None

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global kokoro_engine, init_error
    logger.info("Shuna Local ONNX Voice Engine starting up")
    
    try:
        ensure_assets()
    except Exception as e:
        logger.critical(f"Failed to ensure or download voice assets: {e}", exc_info=True)
        init_error = str(e)
    
    # Initialize Kokoro-ONNX engine
    # NOTE: We bypass Kokoro.__init__() because PyPI kokoro-onnx 0.5.0 was
    # re-published with a breaking change that tries to json.load() the binary
    # voices file. Instead, we manually construct the object using np.load()
    # which is how the original working version loads voices-v1.0.bin.
    logger.info("Initializing Kokoro ONNX engine (manual init)...")
    try:
        import onnxruntime as rt
        from kokoro_onnx import Kokoro
        from kokoro_onnx.config import KoKoroConfig, EspeakConfig
        from kokoro_onnx.tokenizer import Tokenizer

        # Create a blank Kokoro instance without calling __init__
        kokoro_engine = object.__new__(Kokoro)

        # 1. Load ONNX model session with strict memory limits
        sess_options = rt.SessionOptions()
        sess_options.enable_mem_pattern = True  # Allow memory pattern caching for faster inference
        sess_options.graph_optimization_level = rt.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.execution_mode = rt.ExecutionMode.ORT_SEQUENTIAL
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.add_session_config_entry("memory.enable_memory_arena_shrinkage", "cpu:0")
        
        providers = ["CPUExecutionProvider"]
        kokoro_engine.sess = rt.InferenceSession(MODEL_PATH, sess_options=sess_options, providers=providers)
        logger.info("ONNX InferenceSession created successfully with strict memory options.")

        # 2. Load voices as numpy array (NOT json)
        kokoro_engine.voices = np.load(VOICES_BIN_PATH, allow_pickle=True)
        logger.info(f"Loaded voices: type={type(kokoro_engine.voices)}")

        # 3. Initialize tokenizer (handle different API versions)
        kokoro_engine.config = KoKoroConfig(MODEL_PATH, VOICES_BIN_PATH)
        try:
            kokoro_engine.tokenizer = Tokenizer(None, vocab={})
        except TypeError:
            try:
                kokoro_engine.tokenizer = Tokenizer(None)
            except TypeError:
                kokoro_engine.tokenizer = Tokenizer()
        
        logger.info("Kokoro ONNX Engine initialized successfully (manual).")
    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        logger.critical(f"Failed to initialize Kokoro ONNX engine: {e}\n{tb_str}", exc_info=True)
        init_error = f"{e}\n{tb_str}"
        
    gc.collect()  # Final garbage collection to free up memory from startup/downloads
    yield
    logger.info("Shuna Local ONNX Voice Engine shutting down")

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Shuna ONNX Voice Engine", version="3.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ───────────────────────────────────────────────────────────────────
class VoiceChatRequest(BaseModel):
    text: str
    user_id: str
    user_email: str = ""
    mode: str = "friendly"
    companion: str = "siya"

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/")
async def health_check():
    return {
        "status": "online", 
        "message": "Shuna Local ONNX Voice Engine Active",
        "engine_loaded": kokoro_engine is not None,
        "voice_loaded": SHUNA_VOICE is not None,
        "init_error": init_error
    }

@app.get("/api/test-debug")
async def test_debug():
    import subprocess
    import sys
    try:
        pip_list = subprocess.check_output([sys.executable, "-m", "pip", "list"], text=True)
    except Exception as e:
        pip_list = f"Failed to get pip list: {e}"
        
    return {
        "kokoro_engine_type": str(type(kokoro_engine)),
        "kokoro_engine_is_none": kokoro_engine is None,
        "kokoro_engine_bool": bool(kokoro_engine) if kokoro_engine is not None else None,
        "init_error": init_error,
        "model_path_exists": os.path.exists(MODEL_PATH),
        "voices_path_exists": os.path.exists(VOICES_BIN_PATH),
        "pip_list": pip_list,
        "sys_modules": [m for m in sys.modules.keys() if "onnx" in m or "transformer" in m or "optimum" in m]
    }

@app.post("/api/v1/shuna/voice-chat")
async def voice_chat(req: VoiceChatRequest):
    """
    Stateless Pipelined Voice Chat Endpoint (Local ONNX TTS).
    """
    try:
        user_transcript = req.text.strip()
        if not user_transcript:
            raise HTTPException(status_code=400, detail="Empty text input")

        logger.info(f"Processing text: '{user_transcript}' for user={req.user_id}")

        # ── Step 1: Retrieve Recent Chat History & Format ──
        api_messages = []
        if supabase and req.user_id:
            try:
                history_res = supabase.table("messages").select("text, sender").eq("user_id", req.user_id).eq("source", "aria").order("created_at", desc=True).limit(5).execute()
                if history_res.data:
                    msgs = list(reversed(history_res.data))
                    for m in msgs:
                        api_messages.append({
                            "role": "user" if m["sender"] == "user" else "assistant",
                            "content": m["text"]
                        })
            except Exception as db_err:
                logger.error(f"Database history retrieval error: {db_err}")

        api_messages.append({
            "role": "user",
            "content": user_transcript
        })

        # ── Step 2: Call Main Chat Backend (JSON Scriptwriter) ──
        chat_transcript = ""
        kokoro_script = ""
        error_llm = None
        
        try:
            chat_payload = {
                "text": req.text,
                "messages": api_messages,
                "emotion": "default",
                "mode": req.mode,
                "companion": req.companion,
                "userId": req.user_id,
                "userEmail": req.user_email,
                "isVoice": True
            }
            logger.info(f"Calling main backend chat API: {MAIN_BACKEND_URL}/api/ai/message")
            
            async with httpx.AsyncClient() as http_client:
                chat_response = await http_client.post(
                    f"{MAIN_BACKEND_URL}/api/ai/message",
                    json=chat_payload,
                    headers={"Content-Type": "application/json"},
                    timeout=20.0
                )
            
            if not chat_response.is_success:
                raise Exception(f"Main backend error status {chat_response.status_code}: {chat_response.text}")
            
            chat_data = chat_response.json()
            raw_ai_text = (chat_data.get("text") or "").strip()
            
            import json
            import re
            
            try:
                # Find JSON block using regex to ignore any preceding/trailing conversational text
                json_match = re.search(r'\{.*\}', raw_ai_text, re.DOTALL)
                clean_json_str = json_match.group(0) if json_match else raw_ai_text.replace("```json", "").replace("```", "").strip()
                
                parsed = json.loads(clean_json_str)
                chat_transcript = parsed.get("chat_transcript", raw_ai_text)
                kokoro_script = parsed.get("kokoro_script", raw_ai_text)
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON from LLM. Using raw text.")
                chat_transcript = raw_ai_text
                kokoro_script = raw_ai_text

        except Exception as llm_err:
            logger.error(f"Main Backend LLM Error: {llm_err}")
            error_llm = str(llm_err)
            chat_transcript = "Arre yaar, server down hai lagta hai."
            kokoro_script = "Arre yaar, server down hai lagta hai."

        logger.info(f"UI Transcript: '{chat_transcript}'")
        logger.info(f"Kokoro Script: '{kokoro_script}'")

        # ── Step 3: Text-to-Speech (Local ONNX) ──
        audio_base64 = ""
        error_tts = None
        
        try:
            if not kokoro_engine:
                raise Exception("Kokoro ONNX engine is not initialized")
            
            # Truncate to 1 sentence / max 60 chars to fit in Render free tier timeout
            import re as re_mod
            first_sentence = re_mod.split(r'[.!?,;]', kokoro_script)[0].strip()
            tts_text = first_sentence[:60] if first_sentence else kokoro_script[:60]
            logger.info(f"TTS text: '{tts_text}'")

            voice_style = SHUNA_VOICE if SHUNA_VOICE is not None else "af_heart"
            
            # kokoro-onnx only supports: en-us, en-gb, fr-fr, ja, ko, cmn (NO Hindi)
            samples, sample_rate = kokoro_engine.create(
                tts_text, 
                voice=voice_style, 
                speed=0.85, 
                lang="en-us"
            )
            
            if samples is not None and len(samples) > 0:
                wav_io = io.BytesIO()
                sf.write(wav_io, samples, sample_rate, format='WAV', subtype='PCM_16')
                wav_bytes = wav_io.getvalue()
                audio_base64 = base64.b64encode(wav_bytes).decode("utf-8")
                logger.info(f"TTS OK: {len(samples)} samples, {len(audio_base64)} b64 chars")
            else:
                raise Exception("TTS returned empty audio")
                
        except Exception as tts_err:
            import traceback
            logger.error(f"TTS Error: {tts_err}\n{traceback.format_exc()}")
            error_tts = str(tts_err)

        # Force garbage collection to prevent RAM creep during back-to-back voice turns
        gc.collect()

        # ── Step 4: Save Records to Supabase ──
        if supabase and req.user_id:
            try:
                supabase.table("messages").insert({
                    "user_id": req.user_id,
                    "text": user_transcript,
                    "sender": "user",
                    "source": "aria"
                }).execute()
                
                supabase.table("messages").insert({
                    "user_id": req.user_id,
                    "text": chat_transcript,
                    "sender": "ai",
                    "source": "aria"
                }).execute()
            except Exception as db_log_err:
                logger.error(f"Supabase logging error: {db_log_err}")

        return {
            "success": True if audio_base64 else False,
            "audio": audio_base64,
            "user_transcript": user_transcript,
            "ai_transcript": chat_transcript,
            "error_llm": error_llm,
            "error_tts": error_tts
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"Internal endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server voice processing error")
