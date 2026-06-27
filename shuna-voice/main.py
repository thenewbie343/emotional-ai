"""
Shuna Stateless HTTP Pipelined Voice Agent (Local Kokoro TTS)
=============================================================
Stateless, robust, and highly scalable pipeline (Web Speech STT -> Text LLM -> Kokoro TTS).
Runs entirely locally to avoid cloud API rate limits, keeping RAM footprint under 512MB.
"""

import os
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
import torch
from kokoro import KPipeline

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shuna-voice")

# ── Configuration ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MAIN_BACKEND_URL = os.environ.get("MAIN_BACKEND_URL", "https://emotional-ai-18zi.onrender.com")

VOICES_DIR = os.path.join(os.path.dirname(__file__), "voices")
VOICE_HINDI_URL = "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices/hf_alpha.pt"
VOICE_ENGLISH_URL = "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices/af_bella.pt"

# Global states
supabase: Client = None
k_pipeline: KPipeline = None
SHUNA_VOICE = None

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
    urllib.request.urlretrieve(url, dest)
    logger.info(f"Downloaded {dest}")

def load_voice_profile():
    global SHUNA_VOICE
    os.makedirs(VOICES_DIR, exist_ok=True)
    
    hindi_path = os.path.join(VOICES_DIR, "hf_alpha.pt")
    english_path = os.path.join(VOICES_DIR, "af_bella.pt")
    
    if not os.path.exists(hindi_path):
        download_file(VOICE_HINDI_URL, hindi_path)
    if not os.path.exists(english_path):
        download_file(VOICE_ENGLISH_URL, english_path)
        
    logger.info("Loading Kokoro voice embeddings on CPU...")
    try:
        v_hindi = torch.load(hindi_path, map_location="cpu", weights_only=True)
        v_english = torch.load(english_path, map_location="cpu", weights_only=True)
        # Blend: 60% Hindi / 40% English
        SHUNA_VOICE = (v_hindi * 0.6) + (v_english * 0.4)
        logger.info("Voice blending successful!")
    except Exception as e:
        logger.error(f"Failed to load or blend voice embeddings: {e}")
        # Fallback to a zero tensor just in case (though it will sound broken, it prevents crashing if missing)
        SHUNA_VOICE = None

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global k_pipeline
    logger.info("Shuna Local Voice Engine starting up")
    
    load_voice_profile()
    
    logger.info("Initializing Kokoro Pipeline (Hindi lang code)...")
    try:
        # We use 'h' for Hindi to properly process Devanagari phonemes
        k_pipeline = KPipeline(lang_code='h')
        logger.info("Kokoro Pipeline initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Kokoro pipeline. Is espeak-ng installed? Error: {e}")
        
    yield
    logger.info("Shuna Local Voice Engine shutting down")

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Shuna Voice Engine", version="3.0.0", lifespan=lifespan)

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
    return {"status": "online", "message": "Shuna Local Voice Engine Active"}

@app.post("/api/v1/shuna/voice-chat")
async def voice_chat(req: VoiceChatRequest):
    """
    Stateless Pipelined Voice Chat Endpoint (Local TTS).
    1. Receive plain text transcript from frontend (Web Speech API).
    2. Retrieve recent message history from Supabase.
    3. Call the main backend chat API (multi-key pool) with 'isVoice': True to get JSON script.
    4. Synthesize voice locally using Kokoro-82M.
    5. Save chat records to Supabase and return the response payload.
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
                "isVoice": True  # Flag to trigger JSON output from LLM
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
            
            # The backend should return a JSON string. We parse it:
            import json
            try:
                # Remove markdown code blocks if present
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

        # ── Step 3: Text-to-Speech (Local Kokoro) ──
        audio_base64 = ""
        error_tts = None
        
        try:
            if not k_pipeline:
                raise Exception("Kokoro pipeline is not initialized")
            if SHUNA_VOICE is None:
                raise Exception("Voice profile is missing")

            # Generate audio using Kokoro generator
            # speed=0.88 to prevent rushed robotic output
            generator = k_pipeline(kokoro_script, voice=SHUNA_VOICE, speed=0.88, split_pattern=r'\n+')
            
            # Combine all chunks
            all_audio = []
            sample_rate = 24000
            for gs, ps, audio_chunk in generator:
                if audio_chunk is not None:
                    all_audio.append(audio_chunk)

            if all_audio:
                import numpy as np
                combined_audio = np.concatenate(all_audio)
                
                # Convert numpy array to WAV in memory
                wav_io = io.BytesIO()
                sf.write(wav_io, combined_audio, sample_rate, format='WAV', subtype='PCM_16')
                wav_bytes = wav_io.getvalue()
                
                audio_base64 = base64.b64encode(wav_bytes).decode("utf-8")
            else:
                raise Exception("Kokoro generator returned no audio chunks")
                
        except Exception as tts_err:
            logger.error(f"TTS Error: {tts_err}")
            error_tts = str(tts_err)

        # ── Step 4: Save Records to Supabase ──
        if supabase and req.user_id:
            try:
                # Save user transcript
                supabase.table("messages").insert({
                    "user_id": req.user_id,
                    "text": user_transcript,
                    "sender": "user",
                    "source": "aria"
                }).execute()
                
                # Save AI response (chat transcript)
                supabase.table("messages").insert({
                    "user_id": req.user_id,
                    "text": chat_transcript,
                    "sender": "ai",
                    "source": "aria"
                }).execute()
            except Exception as db_log_err:
                logger.error(f"Supabase logging error: {db_log_err}")

        # Return payload
        return {
            "success": True,
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
