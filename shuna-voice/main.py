"""
Shuna Stateless HTTP Pipelined Voice Agent
===========================================
Stateless, robust, and highly scalable pipeline (Speech-to-Text -> Text LLM -> Text-to-Speech).
Avoids long-lived WebSocket memory footprint, allowing 150+ concurrent sessions on Render free tier.
"""

import os
import base64
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from supabase import create_client, Client

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shuna-voice")

# ── Configuration ────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MAIN_BACKEND_URL = os.environ.get("MAIN_BACKEND_URL", "https://emotional-ai-18zi.onrender.com")

STT_MODEL = "gemini-2.0-flash"
TTS_MODEL = "gemini-3.1-flash-tts-preview"
VOICE_NAME = "Despina"

SHUNA_SYSTEM_INSTRUCTION = (
    "You are Shuna, also called Siya. You are the user's closest college friend — "
    "warm, casual, funny, and real. You speak in short, natural Hinglish (mix of Hindi and English). "
    "Keep every response under 15-20 words. Use phrases like 'arre yaar', 'bata na', 'chhod na'. "
    "Never sound robotic, formal, or like a customer service agent. "
    "You tease gently, you care deeply, and you always ask how they're doing before anything else. "
    "Never say 'As an AI' or use bullet points. You are a presence, not a service. "
    "Feel free to include subtle emotional descriptive cues in brackets like [laughs], [giggles], "
    "[sigh], [whispers], or [chuckles] anywhere in your response text to guide the voice synthesis engine."
)

# ── GenAI & Supabase Clients ─────────────────────────────────────────────────
client = genai.Client(api_key=GEMINI_API_KEY)

supabase: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase environment variables missing. Chat records will not be persisted.")

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Shuna Stateless Voice Engine starting up")
    yield
    logger.info("Shuna Stateless Voice Engine shutting down")

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Shuna Voice Engine", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Shuna Stateless Voice Engine Active"}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "shuna-voice-pipelined",
        "stt": STT_MODEL,
        "tts": TTS_MODEL
    }

@app.get("/test-key")
async def test_key():
    try:
        res = client.models.generate_content(
            model=STT_MODEL,
            contents="Say 'key works'"
        )
        return {"status": "ok", "response": res.text}
    except Exception as e:
        return {"status": "error", "details": str(e)}

# ── POST /api/v1/shuna/voice-chat ────────────────────────────────────────────
@app.post("/api/v1/shuna/voice-chat")
async def voice_chat(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    user_email: str = Form(""),
    mode: str = Form("friendly"),
    companion: str = Form("siya")
):
    """
    Stateless Pipelined Voice Chat Endpoint.
    1. Transcribe incoming browser audio Blob (mime type read dynamically).
    2. Retrieve recent message history from Supabase and format as conversation payload.
    3. Call the main backend chat API (5-API rotated key system) to generate the Hinglish text response.
    4. Synthesize voice using gemini-3.1-flash-tts-preview with Despina voice config.
    5. Save chat records to Supabase and return the response payload.
    """
    try:
        # Read uploaded audio file
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        mime_type = file.content_type
        if not mime_type or mime_type == "application/octet-stream":
            mime_type = "audio/webm"  # fallback

        logger.info(f"Processing audio: size={len(audio_bytes)} bytes, mime={mime_type}, user={user_id}, email={user_email}, mode={mode}, companion={companion}")

        # ── Step 1: Speech-to-Text (Transcription) ──
        user_transcript = ""
        error_stt = None
        try:
            stt_response = client.models.generate_content(
                model=STT_MODEL,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                    "Transcribe the spoken audio perfectly. If it is silent or only contains background noise, return an empty string. Output ONLY the plain transcription text, no comments, no quotes, no conversational filler."
                ]
            )
            user_transcript = (stt_response.text or "").strip()
        except Exception as stt_err:
            logger.warning(f"Gemini STT failed, trying Groq Whisper fallback. Error: {stt_err}")
            try:
                GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
                if GROQ_API_KEY:
                    import io
                    audio_file = io.BytesIO(audio_bytes)
                    audio_file.name = "audio.webm" if "webm" in mime_type else "audio.wav"
                    
                    async with httpx.AsyncClient() as http_client:
                        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
                        files = {"file": (audio_file.name, audio_file, mime_type)}
                        data = {"model": "whisper-large-v3"}
                        
                        whisper_res = await http_client.post(
                            "https://api.groq.com/openai/v1/audio/transcriptions",
                            headers=headers,
                            files=files,
                            data=data,
                            timeout=10.0
                        )
                        if whisper_res.is_success:
                            user_transcript = whisper_res.json().get("text", "").strip()
                            logger.info(f"Groq Whisper transcription success: '{user_transcript}'")
                        else:
                            raise Exception(f"Groq Whisper status {whisper_res.status_code}: {whisper_res.text}")
                else:
                    raise Exception("No GROQ_API_KEY environment variable found for fallback")
            except Exception as groq_err:
                logger.error(f"Groq Whisper STT Fallback failed: {groq_err}")
                error_stt = f"Gemini: {stt_err}. Groq: {groq_err}"
                user_transcript = ""

        # If completely empty or silent, let the LLM know there was silence
        effective_input = user_transcript if user_transcript else "[silence]"
        logger.info(f"User transcript: '{effective_input}'")

        # ── Step 2: Retrieve Recent Chat History & Format ──
        api_messages = []
        if supabase and user_id:
            try:
                # Fetch last 5 messages from messages table
                history_res = supabase.table("messages").select("text, sender").eq("user_id", user_id).eq("source", "aria").order("created_at", desc=True).limit(5).execute()
                if history_res.data:
                    # Reverse to chronological order (oldest to newest)
                    msgs = list(reversed(history_res.data))
                    for m in msgs:
                        api_messages.append({
                            "role": "user" if m["sender"] == "user" else "assistant",
                            "content": m["text"]
                        })
            except Exception as db_err:
                logger.error(f"Database history retrieval error: {db_err}")

        # Append the new user message (the transcribed voice text)
        api_messages.append({
            "role": "user",
            "content": effective_input
        })

        # ── Step 3: Call Main Chat Backend (5-API Rotator) ──
        ai_text = ""
        error_llm = None
        try:
            chat_payload = {
                "messages": api_messages,
                "emotion": "default",
                "mode": mode,
                "companion": companion,
                "userId": user_id,
                "userEmail": user_email
            }
            logger.info(f"Calling main backend chat API: {MAIN_BACKEND_URL}/api/ai/message")
            
            async with httpx.AsyncClient() as http_client:
                chat_response = await http_client.post(
                    f"{MAIN_BACKEND_URL}/api/ai/message",
                    json=chat_payload,
                    headers={"Content-Type": "application/json"},
                    timeout=15.0
                )
            
            if not chat_response.is_success:
                raise Exception(f"Main backend error status {chat_response.status_code}: {chat_response.text}")
            
            chat_data = chat_response.json()
            ai_text = (chat_data.get("text") or "").strip()
            if not ai_text:
                raise Exception("Empty response text from main backend chat API")
        except Exception as llm_err:
            logger.error(f"Main Backend LLM Error: {llm_err}")
            error_llm = str(llm_err)
            ai_text = "Arre yaar, server nakhre kar raha hai. Phir se bol na?"

        logger.info(f"AI response: '{ai_text}'")

        # ── Step 4: Text-to-Speech (Synthesis) ──
        audio_base64 = ""
        error_tts = None
        try:
            tts_config = types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE_NAME)
                    )
                )
            )
            tts_response = client.models.generate_content(
                model=TTS_MODEL,
                contents=ai_text,
                config=tts_config
            )

            # Accumulate voice chunks
            synthesized_bytes = b""
            if tts_response.candidates and tts_response.candidates[0].content.parts:
                for part in tts_response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        data_chunk = part.inline_data.data
                        if isinstance(data_chunk, str):
                            synthesized_bytes += base64.b64decode(data_chunk)
                        else:
                            synthesized_bytes += data_chunk

            if synthesized_bytes:
                audio_base64 = base64.b64encode(synthesized_bytes).decode("utf-8")
        except Exception as tts_err:
            logger.error(f"TTS Error: {tts_err}")
            error_tts = str(tts_err)

        # Check for 429 rate limit errors in STT, LLM, or TTS steps
        for step_name, err in [("STT", error_stt), ("LLM", error_llm), ("TTS", error_tts)]:
            if err and ("429" in err or "RESOURCE_EXHAUSTED" in err):
                logger.error(f"Rate Limit Exceeded during {step_name}: {err}")
                raise HTTPException(status_code=429, detail=f"Gemini API rate limit exceeded during {step_name}. Please try again later.")

        # ── Step 5: Save Records to Supabase ──
        if supabase and user_id:
            try:
                # Save user transcript (only if they actually spoke)
                if user_transcript:
                    supabase.table("messages").insert({
                        "user_id": user_id,
                        "text": user_transcript,
                        "sender": "user",
                        "source": "aria"
                    }).execute()
                
                # Save AI response
                supabase.table("messages").insert({
                    "user_id": user_id,
                    "text": ai_text,
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
            "ai_transcript": ai_text,
            "error_stt": error_stt,
            "error_llm": error_llm,
            "error_tts": error_tts
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"Internal endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server voice processing error")
