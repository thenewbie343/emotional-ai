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

import onnxruntime as rt

# Monkey patch ONNX Runtime InferenceSession BEFORE importing kokoro_onnx.
# This forces the internal Kokoro-ONNX session to use strict memory-saving parameters.
_original_InferenceSession = rt.InferenceSession

def custom_InferenceSession(model_path, *args, **kwargs):
    sess_options = rt.SessionOptions()
    # Disable caching of memory allocation patterns (saves RAM for dynamic voice sizes)
    sess_options.enable_mem_pattern = False
    # Execute operators sequentially (reduces memory consumption compared to parallel execution)
    sess_options.execution_mode = rt.ExecutionMode.ORT_SEQUENTIAL
    # Limit execution threads strictly to 1
    sess_options.intra_op_num_threads = 1
    sess_options.inter_op_num_threads = 1
    # Enable aggressive memory arena shrinkage (forces ORT to release free RAM back to OS)
    sess_options.add_session_config_entry("memory.enable_memory_arena_shrinkage", "cpu:0")
    
    kwargs['sess_options'] = sess_options
    return _original_InferenceSession(model_path, *args, **kwargs)

rt.InferenceSession = custom_InferenceSession

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

MODEL_PATH = os.path.join(os.path.dirname(__file__), "kokoro-v1.0.onnx")
VOICES_BIN_PATH = os.path.join(os.path.dirname(__file__), "voices-v1.0.bin")
SHUNA_VOICE_PATH = os.path.join(os.path.dirname(__file__), "voices", "shuna_voice.npy")

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
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

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global kokoro_engine
    logger.info("Shuna Local ONNX Voice Engine starting up")
    
    try:
        ensure_assets()
    except Exception as e:
        logger.critical(f"Failed to ensure or download voice assets: {e}", exc_info=True)
    
    # Initialize Kokoro-ONNX engine
    logger.info("Initializing Kokoro ONNX engine...")
    try:
        kokoro_engine = Kokoro(MODEL_PATH, VOICES_BIN_PATH)
        logger.info("Kokoro ONNX Engine initialized successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize Kokoro ONNX engine: {e}", exc_info=True)
        
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
        "voice_loaded": SHUNA_VOICE is not None
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
            try:
                clean_json_str = raw_ai_text.replace("```json", "").replace("```", "").strip()
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
            
            voice_style = SHUNA_VOICE if SHUNA_VOICE is not None else "af_bella"

            samples, sample_rate = kokoro_engine.create(
                kokoro_script, 
                voice=voice_style, 
                speed=0.88, 
                lang="hi"
            )
            
            if samples is not None and len(samples) > 0:
                wav_io = io.BytesIO()
                sf.write(wav_io, samples, sample_rate, format='WAV', subtype='PCM_16')
                wav_bytes = wav_io.getvalue()
                
                audio_base64 = base64.b64encode(wav_bytes).decode("utf-8")
            else:
                raise Exception("Kokoro ONNX engine generated empty audio samples")
                
        except Exception as tts_err:
            logger.error(f"TTS Error: {tts_err}")
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
