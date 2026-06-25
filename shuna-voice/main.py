"""
Shuna Live Voice — FastAPI WebSocket Transit Router
====================================================
Ultra-lightweight async relay between browser microphone and
Google Gemini 3.1 Flash Live Multimodal API.

Zero ML weights in memory. Pure I/O transit. ~50MB RAM footprint.
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("shuna-voice")

# ── Configuration ────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.1-flash-live-preview"
VOICE_NAME = "Aoede"
SAMPLE_RATE_HZ = 24000

SHUNA_SYSTEM_INSTRUCTION = (
    "You are Shuna, also called Siya. You are the user's closest college friend — "
    "warm, casual, funny, and real. You speak in short, natural Hinglish (mix of Hindi and English). "
    "Keep every response under 15-20 words. Use phrases like 'arre yaar', 'bata na', 'chhod na'. "
    "Never sound robotic, formal, or like a customer service agent. "
    "You tease gently, you care deeply, and you always ask how they're doing before anything else. "
    "Never say 'As an AI' or use bullet points. You are a presence, not a service."
)

# Heartbeat interval in seconds (Render kills idle sockets after 30s)
HEARTBEAT_INTERVAL = 25

# ── GenAI Client (initialized once at module level) ──────────────────────────
client = genai.Client(api_key=GEMINI_API_KEY)

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Shuna Voice relay starting up (RAM target: <50MB)")
    logger.info(f"Gemini model: {GEMINI_MODEL}, voice: {VOICE_NAME}")
    yield
    logger.info("Shuna Voice relay shutting down cleanly")


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Shuna Voice Relay", version="1.0.0", lifespan=lifespan)

@app.get("/")
async def health_check():
    """
    Responds to Render's automated pings to keep the logs clean 
    and confirm the server is awake.
    """
    return {"status": "online", "message": "Shuna Voice Engine Active"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "shuna-voice-relay", "model": GEMINI_MODEL}


# ── WebSocket Endpoint ──────────────────────────────────────────────────────
@app.websocket("/ws/v1/shuna/live-chat")
async def live_chat(ws: WebSocket):
    await ws.accept()
    session_id = id(ws)
    logger.info(f"[{session_id}] Client connected")

    # Build Gemini Live session config — audio-only output
    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE_NAME)
            )
        ),
        system_instruction=types.Content(
            parts=[types.Part(text=SHUNA_SYSTEM_INSTRUCTION)]
        ),
    )

    gemini_session = None
    heartbeat_task = None
    mic_relay_task = None
    gemini_relay_task = None

    try:
        # Open persistent Gemini Live session
        async with client.aio.live.connect(
            model=GEMINI_MODEL, config=live_config
        ) as session:
            gemini_session = session
            logger.info(f"[{session_id}] Gemini Live session established")

            # ── Task 1: Browser Mic → Gemini ─────────────────────────────
            async def relay_mic_to_gemini():
                """Read binary PCM frames from browser, forward to Gemini."""
                try:
                    while True:
                        data = await ws.receive()

                        # Handle binary audio data
                        if "bytes" in data and data["bytes"]:
                            audio_bytes = data["bytes"]
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=audio_bytes,
                                    mime_type="audio/pcm;rate=16000",
                                )
                            )

                        # Handle text messages (for text-based fallback)
                        elif "text" in data and data["text"]:
                            text_msg = data["text"]
                            if text_msg == "__ping__":
                                await ws.send_text("__pong__")
                            else:
                                await session.send(
                                    input=text_msg, end_of_turn=True
                                )

                except WebSocketDisconnect:
                    logger.info(f"[{session_id}] Client disconnected (mic relay)")
                except Exception as e:
                    logger.error(f"[{session_id}] Mic relay error: {e}")

            # ── Task 2: Gemini → Browser Speaker ─────────────────────────
            async def relay_gemini_to_browser():
                """Read audio chunks from Gemini, forward to browser."""
                try:
                    async for response in session.receive():
                        if response is None:
                            continue

                        # Stream audio data chunks immediately
                        server_content = response.server_content
                        if server_content and server_content.model_turn:
                            for part in server_content.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    # Send raw PCM bytes directly to browser
                                    await ws.send_bytes(part.inline_data.data)
                                if part.text:
                                    # Send text transcription chunk to browser
                                    await ws.send_text(f"__text__:{part.text}")

                        # Signal turn completion to frontend
                        if server_content and server_content.turn_complete:
                            await ws.send_text("__turn_done__")

                except WebSocketDisconnect:
                    logger.info(f"[{session_id}] Client disconnected (gemini relay)")
                except Exception as e:
                    logger.error(f"[{session_id}] Gemini relay error: {e}")

            # ── Task 3: Heartbeat (keep Render socket alive) ─────────────
            async def heartbeat():
                """Ping client every 25s to prevent Render idle timeout."""
                try:
                    while True:
                        await asyncio.sleep(HEARTBEAT_INTERVAL)
                        try:
                            await ws.send_text("__heartbeat__")
                        except Exception:
                            break
                except asyncio.CancelledError:
                    pass

            # Launch all three concurrent tasks
            mic_relay_task = asyncio.create_task(relay_mic_to_gemini())
            gemini_relay_task = asyncio.create_task(relay_gemini_to_browser())
            heartbeat_task = asyncio.create_task(heartbeat())

            # Wait until any task exits (means connection died)
            done, pending = await asyncio.wait(
                [mic_relay_task, gemini_relay_task, heartbeat_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    except WebSocketDisconnect:
        logger.info(f"[{session_id}] Client disconnected during setup")
    except Exception as e:
        logger.error(f"[{session_id}] Session error: {e}")
        try:
            await ws.close(code=1011, reason=str(e)[:120])
        except Exception:
            pass
    finally:
        # Clean cancellation of any lingering tasks
        for task in [mic_relay_task, gemini_relay_task, heartbeat_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

        logger.info(f"[{session_id}] All resources released cleanly")
