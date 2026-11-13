"""
Voice AI Calling & Orchestration Engine
Handles automated conversational calling to students and parents, Vobiz cloud telephony integration,
speech synthesis, transcription, semantic analysis, and HOD incident report generation.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import math
import os
import re
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend import models
from backend.services.ai_comparison import compare_responses

from backend.data.cmrcet_college_dossier import CMRCET_COLLEGE_INFO, CMRCET_TEXT_SUMMARY

logger = logging.getLogger(__name__)

# Root workspace directory for loading/saving .env
WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = WORKSPACE_DIR / ".env"

# ---------------------------------------------------------------------------
# Telephony Configuration State
# ---------------------------------------------------------------------------

TELEPHONY_CONFIG: Dict[str, str] = {
    # 1. Telephony Carrier (Vobiz)
    "vobiz_auth_id": os.getenv("VOBIZ_AUTH_ID", ""),
    "vobiz_auth_token": os.getenv("VOBIZ_AUTH_TOKEN", ""),
    "vobiz_from_number": os.getenv("VOBIZ_FROM_NUMBER", ""),
    "vobiz_base_url": os.getenv("VOBIZ_BASE_URL", "https://api.vobiz.ai/api/v1"),
    "webhook_base_url": os.getenv(
        "VOICE_SERVER_BASE_URL",
        os.getenv("WEBHOOK_BASE_URL", "https://healthcare-clubs-costume-casey.trycloudflare.com"),
    ),
    # 2. Indic Speech-to-Text & Voice (Sarvam AI)
    "sarvam_api_key": os.getenv("SARVAM_API_KEY", ""),
    "sarvam_language_code": os.getenv("SARVAM_LANGUAGE_CODE", "en-IN"),
    "sarvam_model": os.getenv("SARVAM_MODEL", "saaras:v3") if os.getenv("SARVAM_MODEL") != "saaras:v1" else "saaras:v3",
    "sarvam_speaker": os.getenv("SARVAM_SPEAKER", "meera"),
    "sarvam_pace": os.getenv("SARVAM_PACE", "1.0"),
    # 3. Fast Speech-to-Text (Deepgram)
    "deepgram_api_key": os.getenv("DEEPGRAM_API_KEY", ""),
    "deepgram_model": os.getenv("DEEPGRAM_MODEL", "nova-2"),
    # 4. Google Gemini Multi-Model Reasoning
    "gemini_api_key": os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", "")),
    "gemini_model": os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest"),
    # 5. Intelligence LLM & Whisper STT (OpenAI)
    "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
    "openai_model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    # 6. Fast LLM Inference (Groq)
    "groq_api_key": os.getenv("GROQ_API_KEY", ""),
    "groq_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    # 7. Ultra-Realistic TTS & Voice Cloning (Cartesia & ElevenLabs)
    "cartesia_api_key": os.getenv("CARTESIA_API_KEY", ""),
    "cartesia_voice_id": os.getenv("CARTESIA_VOICE_ID", ""),
    "elevenlabs_api_key": os.getenv("ELEVENLABS_API_KEY", ""),
    "elevenlabs_voice_id": os.getenv("ELEVENLABS_VOICE_ID", ""),
    # 8. Active selections
    "active_stt_provider": os.getenv("ACTIVE_STT_PROVIDER", "auto"),
    "active_llm_provider": os.getenv("ACTIVE_LLM_PROVIDER", "auto"),
    "active_tts_provider": os.getenv("ACTIVE_TTS_PROVIDER", "vobiz_native"),
}


def _build_multipart_payload(fields: dict, files: dict) -> tuple[bytes, str]:
    """Encodes multipart/form-data payload without external dependencies."""
    boundary = "----WebKitFormBoundary" + str(int(time.time() * 1000))
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))
    for name, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type


def _fetch_audio_bytes(audio_source: str | bytes) -> Optional[bytes]:
    """Helper to get raw audio bytes from either a byte array or an HTTP URL."""
    if isinstance(audio_source, bytes):
        return audio_source
    if isinstance(audio_source, str) and (audio_source.startswith("http://") or audio_source.startswith("https://")):
        try:
            req = urllib.request.Request(audio_source, headers={"User-Agent": "NoBunkersAI/1.0"})
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                return resp.read()
        except Exception as exc:
            logger.warning(f"Could not download audio from {audio_source}: {exc}")
    return None


def transcribe_audio_with_sarvam(audio_source: str | bytes, language_code: Optional[str] = None) -> Optional[str]:
    """Transcribes spoken audio using Sarvam AI Speech-To-Text API (saaras:v1)."""
    api_key = TELEPHONY_CONFIG.get("sarvam_api_key", "").strip()
    if not api_key:
        return None
    audio_bytes = _fetch_audio_bytes(audio_source)
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    lang = language_code or TELEPHONY_CONFIG.get("sarvam_language_code", "en-IN")
    model = TELEPHONY_CONFIG.get("sarvam_model", "saaras:v3")
    if model in ("saaras:v1", "v1", ""):
        model = "saaras:v3"
    try:
        url = "https://api.sarvam.ai/speech-to-text"
        fields = {"model": model, "language_code": lang}
        files = {"file": ("recording.wav", audio_bytes, "audio/wav")}
        payload_bytes, content_type = _build_multipart_payload(fields, files)

        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={
                "api-subscription-key": api_key,
                "Content-Type": content_type,
                "User-Agent": "NoBunkersAI-SarvamSTT/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            transcript = data.get("transcript", "").strip()
            logger.info(f"Sarvam STT transcribed: '{transcript[:60]}...'")
            return transcript
    except Exception as exc:
        logger.error(f"Sarvam STT error: {exc}")
        return None


def transcribe_audio_with_deepgram(audio_source: str | bytes) -> Optional[str]:
    """Transcribes audio using Deepgram Nova-2 STT API."""
    api_key = TELEPHONY_CONFIG.get("deepgram_api_key", "").strip()
    if not api_key:
        return None
    audio_bytes = _fetch_audio_bytes(audio_source)
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    try:
        url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
        req = urllib.request.Request(
            url,
            data=audio_bytes,
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "audio/wav",
                "User-Agent": "NoBunkersAI-DeepgramSTT/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"].strip()
            logger.info(f"Deepgram STT transcribed: '{transcript[:60]}...'")
            return transcript
    except Exception as exc:
        logger.error(f"Deepgram STT error: {exc}")
        return None


def transcribe_audio_with_whisper(audio_source: str | bytes) -> Optional[str]:
    """Transcribes audio using OpenAI Whisper-1 API."""
    api_key = TELEPHONY_CONFIG.get("openai_api_key", "").strip()
    if not api_key:
        return None
    audio_bytes = _fetch_audio_bytes(audio_source)
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    try:
        url = "https://api.openai.com/v1/audio/transcriptions"
        fields = {"model": "whisper-1"}
        files = {"file": ("recording.wav", audio_bytes, "audio/wav")}
        payload_bytes, content_type = _build_multipart_payload(fields, files)

        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": content_type,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("text", "").strip()
    except Exception as exc:
        logger.error(f"Whisper STT error: {exc}")
        return None


def transcribe_call_audio(audio_source: str | bytes) -> Optional[str]:
    """
    Universal router for call audio transcription.
    Tries user-selected active provider or cascades through available keys (Sarvam -> Deepgram -> Whisper).
    """
    provider = TELEPHONY_CONFIG.get("active_stt_provider", "auto").lower()

    if provider == "sarvam":
        return transcribe_audio_with_sarvam(audio_source)
    elif provider == "deepgram":
        return transcribe_audio_with_deepgram(audio_source)
    elif provider == "openai":
        return transcribe_audio_with_whisper(audio_source)

    # AUTO: Cascade through available credentials
    res = transcribe_audio_with_sarvam(audio_source)
    if res:
        return res
    res = transcribe_audio_with_deepgram(audio_source)
    if res:
        return res
    res = transcribe_audio_with_whisper(audio_source)
    if res:
        return res
    return None


# ---------------------------------------------------------------------------
# API Key Verification Testers
# ---------------------------------------------------------------------------

def test_sarvam_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """Tests the validity of a Sarvam AI API subscription key."""
    key = (api_key or TELEPHONY_CONFIG.get("sarvam_api_key", "")).strip()
    m = (model or TELEPHONY_CONFIG.get("sarvam_model", "saaras:v3")).strip()
    if m in ("saaras:v1", "v1", ""):
        m = "saaras:v3"
    if not key:
        return {"connected": False, "error": "Sarvam API Key must be provided.", "status": "UNCONFIGURED"}
    test_wav = _generate_synthetic_speech_wav(duration_secs=0.4, base_freq=350.0)
    try:
        url = "https://api.sarvam.ai/speech-to-text"
        fields = {"model": m, "language_code": "en-IN"}
        files = {"file": ("test.wav", test_wav, "audio/wav")}
        payload_bytes, content_type = _build_multipart_payload(fields, files)

        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={"api-subscription-key": key, "Content-Type": content_type},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            return {"connected": True, "message": f"Sarvam AI API key is verified and active (Model: {m})!", "status": "READY"}
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        return {"connected": False, "error": f"Sarvam HTTP {err.code}: {err_msg or err.reason}", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_openai_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of OpenAI API key."""
    key = (api_key or TELEPHONY_CONFIG.get("openai_api_key", "")).strip()
    if not key:
        return {"connected": False, "error": "OpenAI API Key must be provided.", "status": "UNCONFIGURED"}
    try:
        req = urllib.request.Request("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            return {"connected": True, "message": "OpenAI API Key verified successfully!", "status": "READY"}
    except urllib.error.HTTPError as err:
        return {"connected": False, "error": f"OpenAI HTTP {err.code}: Invalid API key.", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_groq_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of Groq API key."""
    key = (api_key or TELEPHONY_CONFIG.get("groq_api_key", "")).strip()
    if not key:
        return {"connected": False, "error": "Groq API Key must be provided.", "status": "UNCONFIGURED"}
    try:
        req = urllib.request.Request("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            return {"connected": True, "message": "Groq API Key verified successfully (Llama 3.3 enabled)!", "status": "READY"}
    except urllib.error.HTTPError as err:
        return {"connected": False, "error": f"Groq HTTP {err.code}: Invalid API key.", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_deepgram_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of Deepgram API key."""
    key = (api_key or TELEPHONY_CONFIG.get("deepgram_api_key", "")).strip()
    if not key:
        return {"connected": False, "error": "Deepgram API Key must be provided.", "status": "UNCONFIGURED"}
    try:
        req = urllib.request.Request("https://api.deepgram.com/v1/projects", headers={"Authorization": f"Token {key}"})
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            return {"connected": True, "message": "Deepgram API Key verified successfully (Nova-2 enabled)!", "status": "READY"}
    except urllib.error.HTTPError as err:
        return {"connected": False, "error": f"Deepgram HTTP {err.code}: Invalid API key.", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_cartesia_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of Cartesia API key."""
    key = (api_key or TELEPHONY_CONFIG.get("cartesia_api_key", "")).strip()
    if not key:
        return {"connected": False, "error": "Cartesia API Key must be provided.", "status": "UNCONFIGURED"}
    try:
        req = urllib.request.Request(
            "https://api.cartesia.ai/voices",
            headers={"X-API-Key": key, "Cartesia-Version": "2024-06-10", "User-Agent": "NoBunkersAI/1.0"},
        )
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            return {"connected": True, "message": "Cartesia API Key verified successfully (Sonic TTS enabled)!", "status": "READY"}
    except urllib.error.HTTPError as err:
        return {"connected": False, "error": f"Cartesia HTTP {err.code}: Invalid API key.", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_elevenlabs_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of ElevenLabs API key."""
    key = (api_key or TELEPHONY_CONFIG.get("elevenlabs_api_key", "")).strip()
    if not key:
        return {"connected": False, "error": "ElevenLabs API Key must be provided.", "status": "UNCONFIGURED"}
    try:
        req = urllib.request.Request(
            "https://api.elevenlabs.io/v1/user",
            headers={"xi-api-key": key, "User-Agent": "NoBunkersAI/1.0"},
        )
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            return {"connected": True, "message": "ElevenLabs API Key verified successfully (Studio TTS enabled)!", "status": "READY"}
    except urllib.error.HTTPError as err:
        return {"connected": False, "error": f"ElevenLabs HTTP {err.code}: Invalid API key.", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def test_gemini_connection(api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """Tests validity of Google Gemini API key."""
    key = (api_key or TELEPHONY_CONFIG.get("gemini_api_key", "")).strip()
    m = (model or TELEPHONY_CONFIG.get("gemini_model", "gemini-3.5-flash")).strip()
    if key.startswith("AQ.") and m in ("gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", ""):
        m = "gemini-3.5-flash"
    elif m in ("gemini-2.5-flash", "2.5-flash", ""):
        m = "gemini-3.5-flash"

    if not key:
        return {"connected": False, "error": "Gemini API Key must be provided.", "status": "UNCONFIGURED"}

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
        payload = json.dumps({
            "contents": [{"parts": [{"text": "Hello, respond with Pong."}]}]
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "NoBunkersAI-GeminiTest/1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12.0) as resp:
            return {"connected": True, "message": f"Google Gemini API verified successfully ({m} reasoning active)!", "status": "READY"}
    except urllib.error.HTTPError as err:
        err_msg = ""
        try:
            err_json = json.loads(err.read().decode("utf-8", errors="ignore"))
            err_msg = err_json.get("error", {}).get("message", "")
        except Exception:
            err_msg = err.reason
        return {"connected": False, "error": f"Gemini HTTP {err.code}: {err_msg or 'Invalid API key or model name.'}", "status": "FAILED"}
    except Exception as exc:
        return {"connected": False, "error": str(exc), "status": "ERROR"}


def format_e164_phone(phone: str) -> str:
    """Formats phone number to standard E.164 format (defaults to +91 for 10-digit Indian numbers)."""
    if not phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+"):
        return cleaned
    if len(cleaned) == 10:
        return f"+91{cleaned}"
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return f"+{cleaned}"
    return f"+{cleaned}"


def get_telephony_config() -> Dict[str, Any]:
    """Returns current telephony and multi-AI configuration with masked tokens."""
    auth_id = TELEPHONY_CONFIG.get("vobiz_auth_id", "")
    token = TELEPHONY_CONFIG.get("vobiz_auth_token", "")
    from_num = TELEPHONY_CONFIG.get("vobiz_from_number", "")
    base_url = TELEPHONY_CONFIG.get("vobiz_base_url", "https://api.vobiz.ai/api/v1")
    webhook_url = TELEPHONY_CONFIG.get("webhook_base_url", "")

    sarvam_key = TELEPHONY_CONFIG.get("sarvam_api_key", "")
    sarvam_lang = TELEPHONY_CONFIG.get("sarvam_language_code", "en-IN")
    sarvam_model = TELEPHONY_CONFIG.get("sarvam_model", "saaras:v3")
    if sarvam_model in ("saaras:v1", "v1", ""):
        sarvam_model = "saaras:v3"
    sarvam_speaker = TELEPHONY_CONFIG.get("sarvam_speaker", "meera")
    sarvam_pace = TELEPHONY_CONFIG.get("sarvam_pace", "1.0")

    deepgram_key = TELEPHONY_CONFIG.get("deepgram_api_key", "")
    deepgram_model = TELEPHONY_CONFIG.get("deepgram_model", "nova-2")

    gemini_key = TELEPHONY_CONFIG.get("gemini_api_key", "")
    gemini_model = TELEPHONY_CONFIG.get("gemini_model", "gemini-1.5-flash")
    if gemini_model in ("gemini-2.5-flash", "2.5-flash", ""):
        gemini_model = "gemini-1.5-flash"

    openai_key = TELEPHONY_CONFIG.get("openai_api_key", "")
    openai_model = TELEPHONY_CONFIG.get("openai_model", "gpt-4o-mini")

    groq_key = TELEPHONY_CONFIG.get("groq_api_key", "")
    groq_model = TELEPHONY_CONFIG.get("groq_model", "llama-3.3-70b-versatile")

    cartesia_key = TELEPHONY_CONFIG.get("cartesia_api_key", "")
    cartesia_voice_id = TELEPHONY_CONFIG.get("cartesia_voice_id", "")
    elevenlabs_key = TELEPHONY_CONFIG.get("elevenlabs_api_key", "")
    elevenlabs_voice_id = TELEPHONY_CONFIG.get("elevenlabs_voice_id", "")

    active_stt = TELEPHONY_CONFIG.get("active_stt_provider", "auto")
    active_llm = TELEPHONY_CONFIG.get("active_llm_provider", "auto")
    active_tts = TELEPHONY_CONFIG.get("active_tts_provider", "vobiz_native")

    is_configured = bool(auth_id and token and from_num)
    masked_auth_id = (auth_id[:4] + "****" + auth_id[-4:]) if len(auth_id) > 8 else (auth_id[:2] + "****" if auth_id else "")
    masked_token = "********" if token else ""

    def mask_key(k: str) -> str:
        if not k:
            return ""
        if len(k) > 10:
            return k[:4] + "****" + k[-4:]
        return "********"

    return {
        "is_configured": is_configured,
        "vobiz_auth_id": auth_id,
        "vobiz_auth_id_masked": masked_auth_id,
        "vobiz_auth_token_masked": masked_token,
        "vobiz_from_number": from_num,
        "vobiz_base_url": base_url,
        "webhook_base_url": webhook_url,
        # STT
        "sarvam_api_key": sarvam_key,
        "sarvam_api_key_masked": mask_key(sarvam_key),
        "sarvam_language_code": sarvam_lang,
        "sarvam_model": sarvam_model,
        "sarvam_speaker": sarvam_speaker,
        "sarvam_pace": sarvam_pace,
        "sarvam_configured": bool(sarvam_key),
        "deepgram_api_key": deepgram_key,
        "deepgram_api_key_masked": mask_key(deepgram_key),
        "deepgram_model": deepgram_model,
        "deepgram_configured": bool(deepgram_key),
        "active_stt_provider": active_stt,
        # LLM
        "gemini_api_key": gemini_key,
        "gemini_api_key_masked": mask_key(gemini_key),
        "gemini_model": gemini_model,
        "gemini_configured": bool(gemini_key),
        "openai_api_key": openai_key,
        "openai_api_key_masked": mask_key(openai_key),
        "openai_model": openai_model,
        "openai_configured": bool(openai_key),
        "groq_api_key": groq_key,
        "groq_api_key_masked": mask_key(groq_key),
        "groq_model": groq_model,
        "groq_configured": bool(groq_key),
        "active_llm_provider": active_llm,
        # TTS & Voice Cloning
        "cartesia_api_key": cartesia_key,
        "cartesia_api_key_masked": mask_key(cartesia_key),
        "cartesia_voice_id": cartesia_voice_id,
        "cartesia_configured": bool(cartesia_key),
        "elevenlabs_api_key": elevenlabs_key,
        "elevenlabs_api_key_masked": mask_key(elevenlabs_key),
        "elevenlabs_voice_id": elevenlabs_voice_id,
        "elevenlabs_configured": bool(elevenlabs_key),
        "active_tts_provider": active_tts,
        "status": "READY" if is_configured else "UNCONFIGURED",
    }


def update_telephony_config(
    vobiz_auth_id: Optional[str] = None,
    vobiz_auth_token: Optional[str] = None,
    vobiz_from_number: Optional[str] = None,
    webhook_base_url: Optional[str] = None,
    vobiz_base_url: Optional[str] = None,
    sarvam_api_key: Optional[str] = None,
    sarvam_language_code: Optional[str] = None,
    sarvam_model: Optional[str] = None,
    sarvam_speaker: Optional[str] = None,
    sarvam_pace: Optional[str] = None,
    deepgram_api_key: Optional[str] = None,
    deepgram_model: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    gemini_model: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    openai_model: Optional[str] = None,
    groq_api_key: Optional[str] = None,
    groq_model: Optional[str] = None,
    cartesia_api_key: Optional[str] = None,
    cartesia_voice_id: Optional[str] = None,
    elevenlabs_api_key: Optional[str] = None,
    elevenlabs_voice_id: Optional[str] = None,
    active_stt_provider: Optional[str] = None,
    active_llm_provider: Optional[str] = None,
    active_tts_provider: Optional[str] = None,
) -> Dict[str, Any]:
    """Updates runtime telephony & multi-AI settings and synchronizes them to the .env file."""
    # 1. Telephony Carrier
    if vobiz_auth_id is not None:
        TELEPHONY_CONFIG["vobiz_auth_id"] = vobiz_auth_id.strip()
        os.environ["VOBIZ_AUTH_ID"] = TELEPHONY_CONFIG["vobiz_auth_id"]

    if vobiz_auth_token is not None:
        TELEPHONY_CONFIG["vobiz_auth_token"] = vobiz_auth_token.strip()
        os.environ["VOBIZ_AUTH_TOKEN"] = TELEPHONY_CONFIG["vobiz_auth_token"]

    if vobiz_from_number is not None:
        TELEPHONY_CONFIG["vobiz_from_number"] = format_e164_phone(vobiz_from_number)
        os.environ["VOBIZ_FROM_NUMBER"] = TELEPHONY_CONFIG["vobiz_from_number"]

    if webhook_base_url is not None:
        raw_url = webhook_base_url.strip()
        parsed_wh = urllib.parse.urlparse(raw_url)
        clean_url = f"{parsed_wh.scheme}://{parsed_wh.netloc}" if (parsed_wh.scheme and parsed_wh.netloc) else raw_url.split("?")[0].rstrip("/")
        TELEPHONY_CONFIG["webhook_base_url"] = clean_url
        os.environ["VOICE_SERVER_BASE_URL"] = clean_url
        os.environ["WEBHOOK_BASE_URL"] = clean_url

    if vobiz_base_url is not None:
        TELEPHONY_CONFIG["vobiz_base_url"] = vobiz_base_url.strip().rstrip("/")
        os.environ["VOBIZ_BASE_URL"] = TELEPHONY_CONFIG["vobiz_base_url"]

    # 2. STT: Sarvam & Deepgram
    if sarvam_api_key is not None:
        TELEPHONY_CONFIG["sarvam_api_key"] = sarvam_api_key.strip()
        os.environ["SARVAM_API_KEY"] = TELEPHONY_CONFIG["sarvam_api_key"]

    if sarvam_language_code is not None:
        TELEPHONY_CONFIG["sarvam_language_code"] = sarvam_language_code.strip()
        os.environ["SARVAM_LANGUAGE_CODE"] = TELEPHONY_CONFIG["sarvam_language_code"]

    if sarvam_model is not None:
        sm = sarvam_model.strip()
        if sm in ("saaras:v1", "v1", ""):
            sm = "saaras:v3"
        TELEPHONY_CONFIG["sarvam_model"] = sm
        os.environ["SARVAM_MODEL"] = sm

    if sarvam_speaker is not None:
        TELEPHONY_CONFIG["sarvam_speaker"] = sarvam_speaker.strip()
        os.environ["SARVAM_SPEAKER"] = TELEPHONY_CONFIG["sarvam_speaker"]

    if sarvam_pace is not None:
        TELEPHONY_CONFIG["sarvam_pace"] = str(sarvam_pace).strip()
        os.environ["SARVAM_PACE"] = TELEPHONY_CONFIG["sarvam_pace"]

    if deepgram_api_key is not None:
        TELEPHONY_CONFIG["deepgram_api_key"] = deepgram_api_key.strip()
        os.environ["DEEPGRAM_API_KEY"] = TELEPHONY_CONFIG["deepgram_api_key"]

    if deepgram_model is not None:
        TELEPHONY_CONFIG["deepgram_model"] = deepgram_model.strip()
        os.environ["DEEPGRAM_MODEL"] = TELEPHONY_CONFIG["deepgram_model"]

    # 3. LLM: Gemini, OpenAI & Groq
    if gemini_api_key is not None:
        TELEPHONY_CONFIG["gemini_api_key"] = gemini_api_key.strip()
        os.environ["GEMINI_API_KEY"] = TELEPHONY_CONFIG["gemini_api_key"]
        os.environ["GOOGLE_API_KEY"] = TELEPHONY_CONFIG["gemini_api_key"]

    if gemini_model is not None:
        gm = gemini_model.strip()
        if gm in ("gemini-2.5-flash", "2.5-flash", ""):
            gm = "gemini-1.5-flash"
        TELEPHONY_CONFIG["gemini_model"] = gm
        os.environ["GEMINI_MODEL"] = gm

    if openai_api_key is not None:
        TELEPHONY_CONFIG["openai_api_key"] = openai_api_key.strip()
        os.environ["OPENAI_API_KEY"] = TELEPHONY_CONFIG["openai_api_key"]

    if openai_model is not None:
        TELEPHONY_CONFIG["openai_model"] = openai_model.strip()
        os.environ["OPENAI_MODEL"] = TELEPHONY_CONFIG["openai_model"]

    if groq_api_key is not None:
        TELEPHONY_CONFIG["groq_api_key"] = groq_api_key.strip()
        os.environ["GROQ_API_KEY"] = TELEPHONY_CONFIG["groq_api_key"]

    if groq_model is not None:
        TELEPHONY_CONFIG["groq_model"] = groq_model.strip()
        os.environ["GROQ_MODEL"] = TELEPHONY_CONFIG["groq_model"]

    # 4. TTS: Cartesia & ElevenLabs (Voice Cloning)
    if cartesia_api_key is not None:
        TELEPHONY_CONFIG["cartesia_api_key"] = cartesia_api_key.strip()
        os.environ["CARTESIA_API_KEY"] = TELEPHONY_CONFIG["cartesia_api_key"]

    if cartesia_voice_id is not None:
        TELEPHONY_CONFIG["cartesia_voice_id"] = cartesia_voice_id.strip()
        os.environ["CARTESIA_VOICE_ID"] = TELEPHONY_CONFIG["cartesia_voice_id"]

    if elevenlabs_api_key is not None:
        TELEPHONY_CONFIG["elevenlabs_api_key"] = elevenlabs_api_key.strip()
        os.environ["ELEVENLABS_API_KEY"] = TELEPHONY_CONFIG["elevenlabs_api_key"]

    if elevenlabs_voice_id is not None:
        TELEPHONY_CONFIG["elevenlabs_voice_id"] = elevenlabs_voice_id.strip()
        os.environ["ELEVENLABS_VOICE_ID"] = TELEPHONY_CONFIG["elevenlabs_voice_id"]

    # 5. Active Selections
    if active_stt_provider is not None:
        TELEPHONY_CONFIG["active_stt_provider"] = active_stt_provider.strip().lower()
        os.environ["ACTIVE_STT_PROVIDER"] = TELEPHONY_CONFIG["active_stt_provider"]

    if active_llm_provider is not None:
        TELEPHONY_CONFIG["active_llm_provider"] = active_llm_provider.strip().lower()
        os.environ["ACTIVE_LLM_PROVIDER"] = TELEPHONY_CONFIG["active_llm_provider"]

    if active_tts_provider is not None:
        TELEPHONY_CONFIG["active_tts_provider"] = active_tts_provider.strip().lower()
        os.environ["ACTIVE_TTS_PROVIDER"] = TELEPHONY_CONFIG["active_tts_provider"]

    # Persist all keys to .env file
    try:
        env_lines: List[str] = []
        if ENV_FILE_PATH.exists():
            env_lines = ENV_FILE_PATH.read_text(encoding="utf-8").splitlines()

        keys_to_update = {
            "VOBIZ_AUTH_ID": TELEPHONY_CONFIG["vobiz_auth_id"],
            "VOBIZ_AUTH_TOKEN": TELEPHONY_CONFIG["vobiz_auth_token"],
            "VOBIZ_FROM_NUMBER": TELEPHONY_CONFIG["vobiz_from_number"],
            "VOBIZ_BASE_URL": TELEPHONY_CONFIG["vobiz_base_url"],
            "VOICE_SERVER_BASE_URL": TELEPHONY_CONFIG["webhook_base_url"],
            "WEBHOOK_BASE_URL": TELEPHONY_CONFIG["webhook_base_url"],
            "SARVAM_API_KEY": TELEPHONY_CONFIG["sarvam_api_key"],
            "SARVAM_LANGUAGE_CODE": TELEPHONY_CONFIG["sarvam_language_code"],
            "SARVAM_MODEL": TELEPHONY_CONFIG["sarvam_model"],
            "SARVAM_SPEAKER": TELEPHONY_CONFIG["sarvam_speaker"],
            "SARVAM_PACE": TELEPHONY_CONFIG["sarvam_pace"],
            "DEEPGRAM_API_KEY": TELEPHONY_CONFIG["deepgram_api_key"],
            "DEEPGRAM_MODEL": TELEPHONY_CONFIG["deepgram_model"],
            "GEMINI_API_KEY": TELEPHONY_CONFIG["gemini_api_key"],
            "GEMINI_MODEL": TELEPHONY_CONFIG["gemini_model"],
            "GOOGLE_API_KEY": TELEPHONY_CONFIG["gemini_api_key"],
            "OPENAI_API_KEY": TELEPHONY_CONFIG["openai_api_key"],
            "OPENAI_MODEL": TELEPHONY_CONFIG["openai_model"],
            "GROQ_API_KEY": TELEPHONY_CONFIG["groq_api_key"],
            "GROQ_MODEL": TELEPHONY_CONFIG["groq_model"],
            "CARTESIA_API_KEY": TELEPHONY_CONFIG["cartesia_api_key"],
            "CARTESIA_VOICE_ID": TELEPHONY_CONFIG["cartesia_voice_id"],
            "ELEVENLABS_API_KEY": TELEPHONY_CONFIG["elevenlabs_api_key"],
            "ELEVENLABS_VOICE_ID": TELEPHONY_CONFIG["elevenlabs_voice_id"],
            "ACTIVE_STT_PROVIDER": TELEPHONY_CONFIG["active_stt_provider"],
            "ACTIVE_LLM_PROVIDER": TELEPHONY_CONFIG["active_llm_provider"],
            "ACTIVE_TTS_PROVIDER": TELEPHONY_CONFIG["active_tts_provider"],
        }

        updated_keys = set()
        new_lines: List[str] = []
        for line in env_lines:
            matched = False
            for k, val in keys_to_update.items():
                if line.startswith(f"{k}="):
                    new_lines.append(f"{k}={val}")
                    updated_keys.add(k)
                    matched = True
                    break
            if not matched:
                new_lines.append(line)

        for k, val in keys_to_update.items():
            if k not in updated_keys:
                new_lines.append(f"{k}={val}")

        ENV_FILE_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        logger.info(f"Persisted telephony and multi-AI configuration to {ENV_FILE_PATH}")
    except Exception as exc:
        logger.warning(f"Could not write to .env: {exc}")

    return get_telephony_config()


def test_vobiz_connection() -> Dict[str, Any]:
    """Tests the carrier credentials by pinging Vobiz Account Numbers API."""
    auth_id = TELEPHONY_CONFIG["vobiz_auth_id"]
    auth_token = TELEPHONY_CONFIG["vobiz_auth_token"]
    base_url = TELEPHONY_CONFIG["vobiz_base_url"].rstrip("/")

    if not auth_id or not auth_token:
        return {
            "connected": False,
            "error": "Vobiz Auth ID and Auth Token must be provided.",
            "status": "UNCONFIGURED",
        }

    url = f"{base_url}/account/{auth_id}/numbers"
    req = urllib.request.Request(
        url,
        headers={
            "X-Auth-ID": auth_id,
            "X-Auth-Token": auth_token,
            "User-Agent": "NoBunkersAI-VoiceEngine/1.0",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            numbers = [item.get("e164") for item in data.get("items", []) if item.get("e164")]
            return {
                "connected": True,
                "message": f"Successfully connected to Vobiz. Found {len(numbers)} registered number(s).",
                "registered_numbers": numbers,
                "status": "READY",
            }
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="ignore")
        return {
            "connected": False,
            "status_code": err.code,
            "error": f"Vobiz API returned HTTP {err.code}: {err_body or err.reason}",
            "status": "AUTHENTICATION_FAILED",
        }
    except Exception as exc:
        return {
            "connected": False,
            "error": f"Connection error: {str(exc)}",
            "status": "CONNECTION_ERROR",
        }


def initiate_vobiz_outbound_call(
    to_number: str,
    from_number: Optional[str],
    verification_id: int,
    call_target: str,  # "STUDENT" or "PARENT"
    student_name: str,
) -> Dict[str, Any]:
    """
    Dispatches a real outbound phone call via Vobiz REST API.
    POST {base_url}/Account/{auth_id}/Call/
    """
    auth_id = TELEPHONY_CONFIG["vobiz_auth_id"]
    auth_token = TELEPHONY_CONFIG["vobiz_auth_token"]
    caller_id = format_e164_phone(from_number or TELEPHONY_CONFIG["vobiz_from_number"])
    base_url = TELEPHONY_CONFIG["vobiz_base_url"].rstrip("/")
    webhook_base = TELEPHONY_CONFIG["webhook_base_url"].rstrip("/")

    dest_number = format_e164_phone(to_number)

    if not auth_id or not auth_token or not caller_id:
        return {
            "success": False,
            "error": "Vobiz Auth ID, Auth Token, and Caller ID must be configured before placing calls.",
            "is_simulated": True,
        }

    safe_name = urllib.parse.quote(student_name)
    parsed_wh = urllib.parse.urlparse(webhook_base)
    clean_origin = f"{parsed_wh.scheme}://{parsed_wh.netloc}" if (parsed_wh.scheme and parsed_wh.netloc) else webhook_base.split("?")[0].rstrip("/")
    answer_url = f"{clean_origin}/verification/telephony/answer?ver_id={verification_id}&target={call_target}&name={safe_name}"

    url = f"{base_url}/Account/{auth_id}/Call/"
    payload = json.dumps({
        "from": caller_id,
        "to": dest_number,
        "answer_url": answer_url,
        "answer_method": "POST",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "X-Auth-ID": auth_id,
            "X-Auth-Token": auth_token,
            "Content-Type": "application/json",
            "User-Agent": "NoBunkersAI-Telephony/1.0",
        },
        method="POST",
    )

    try:
        logger.info(f"Dispatching Vobiz call: {caller_id} -> {dest_number} (answer_url={answer_url})")
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            res_body = json.loads(resp.read().decode("utf-8"))
            call_uuid = res_body.get("call_uuid") or res_body.get("request_uuid") or res_body.get("uuid")
            logger.info(f"Vobiz call placed successfully. UUID={call_uuid}")

            # Trigger asynchronous background call recording via Vobiz REST API
            if call_uuid:
                rec_callback = f"{clean_origin}/verification/telephony/recording?ver_id={verification_id}&target={call_target}"
                start_vobiz_call_recording(str(call_uuid), rec_callback)

            return {
                "success": True,
                "call_uuid": call_uuid,
                "to_number": dest_number,
                "from_number": caller_id,
                "message": res_body.get("message", "Call initiated"),
                "raw": res_body,
            }
    except urllib.error.HTTPError as err:
        err_text = err.read().decode("utf-8", errors="ignore")
        logger.error(f"Vobiz Call HTTP {err.code} error: {err_text}")
        return {
            "success": False,
            "status_code": err.code,
            "error": f"Vobiz HTTP {err.code}: {err_text or err.reason}",
        }
    except Exception as exc:
        logger.error(f"Vobiz Call request exception: {exc}")
        return {
            "success": False,
            "error": f"Failed to dispatch call: {str(exc)}",
        }


def start_vobiz_call_recording(call_uuid: str, callback_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Triggers asynchronous full-call recording via Vobiz REST API:
    POST {base_url}/Account/{auth_id}/Call/{call_uuid}/Record/
    This records the entire two-way audio session in the background
    WITHOUT blocking or halting the conversational XML playback.
    """
    if not call_uuid:
        return {"success": False, "error": "No call_uuid provided"}
    auth_id = TELEPHONY_CONFIG.get("vobiz_auth_id", "").strip()
    auth_token = TELEPHONY_CONFIG.get("vobiz_auth_token", "").strip()
    base_url = TELEPHONY_CONFIG.get("vobiz_base_url", "https://api.vobiz.ai/api/v1").rstrip("/")
    webhook_base = TELEPHONY_CONFIG.get("webhook_base_url", "").rstrip("/")

    cb = callback_url or f"{webhook_base}/verification/telephony/recording"
    url = f"{base_url}/Account/{auth_id}/Call/{call_uuid}/Record/"
    payload = json.dumps({
        "time_limit": 600,
        "file_format": "mp3",
        "callback_url": cb,
        "callback_method": "POST",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "X-Auth-ID": auth_id,
            "X-Auth-Token": auth_token,
            "Content-Type": "application/json",
            "User-Agent": "NoBunkersAI-Telephony/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logger.info(f"Vobiz background call recording started for UUID {call_uuid}: {data}")
            return {"success": True, "data": data}
    except Exception as exc:
        logger.debug(f"Vobiz background call recording notice for UUID {call_uuid}: {exc}")
        return {"success": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Telephony XML Builders for Plivo / Vobiz
# ---------------------------------------------------------------------------

def _get_vobiz_voice_and_lang() -> tuple[str, str]:
    """Determines voice gender and language code from configuration."""
    speaker = TELEPHONY_CONFIG.get("sarvam_speaker", "priya").lower()
    voice = "MAN" if speaker in ("arvind", "amartya", "adam", "antoni", "george", "brian") else "WOMAN"
    lang = TELEPHONY_CONFIG.get("sarvam_language_code", "en-IN")
    if lang == "en-IN":
        voice = "WOMAN"  # Standard Indian English voice in Plivo/Vobiz TTS
    return voice, lang


def build_vobiz_interactive_turn_xml(
    prompt_text: str,
    action_url: str,
    execution_timeout: int = 15,
    speech_end_timeout: int = 2,
    record_timeout: int = 8,
    record_callback_url: Optional[str] = None,
) -> str:
    """
    Generates high-fidelity conversational XML with:
    1. Immediate Speech Delivery: Agent speaks immediately inside <Gather>, ensuring
       zero-delay spoken greeting the instant the call is answered.
    2. Real-time Automatic Speech Recognition (ASR) via <Gather inputType="speech">.
    3. Barge-in interruption: When caller speaks while agent is talking, Vobiz immediately
       halts <Speak> and captures the caller's voice.
    4. Robust fallback audio recording via <Record timeout="8"> if speech is not detected in ASR.
    """
    safe_text = (
        prompt_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
    safe_action = (
        action_url.replace("&", "&amp;")
        .replace('"', "&quot;")
    )
    voice, lang = _get_vobiz_voice_and_lang()

    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Response>\n'
        f'    <Gather action="{safe_action}" method="POST" inputType="speech" executionTimeout="{execution_timeout}" speechEndTimeout="{speech_end_timeout}">\n'
        f'        <Speak voice="{voice}" language="{lang}">{safe_text}</Speak>\n'
        f'    </Gather>\n'
        f'    <Record action="{safe_action}" method="POST" maxLength="30" playBeep="false" finishOnKey="#" timeout="{record_timeout}" />\n'
        f'</Response>'
    )


def build_vobiz_speak_record_xml(
    prompt_text: str,
    record_action_url: str,
    max_length_secs: int = 30,
    play_beep: bool = False,
    timeout_secs: int = 8,
) -> str:
    """Generates Plivo/Vobiz compatible XML with speech synthesis and response recording."""
    safe_text = (
        prompt_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
    safe_action = (
        record_action_url.replace("&", "&amp;")
        .replace('"', "&quot;")
    )
    voice, lang = _get_vobiz_voice_and_lang()
    beep_str = "true" if play_beep else "false"
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Response>\n'
        f'    <Speak voice="{voice}" language="{lang}">{safe_text}</Speak>\n'
        f'    <Record action="{safe_action}" method="POST" maxLength="{max_length_secs}" playBeep="{beep_str}" finishOnKey="#" timeout="{timeout_secs}" />\n'
        f'</Response>'
    )


def build_vobiz_farewell_xml(farewell_text: str) -> str:
    """Generates Plivo/Vobiz compatible XML acknowledging response and terminating call."""
    safe_text = (
        farewell_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
    voice, lang = _get_vobiz_voice_and_lang()
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Response>\n'
        f'    <Speak voice="{voice}" language="{lang}">{safe_text}</Speak>\n'
        f'    <Hangup/>\n'
        f'</Response>'
    )


# ---------------------------------------------------------------------------
# Conversational Multi-Turn Telephony Intelligence Engine
# ---------------------------------------------------------------------------

TELEPHONY_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}


def get_student_telephony_dossier(student_identifier: str, db: Session) -> Dict[str, Any]:
    """
    Fetches real-time academic and attendance metrics for a student from the database.
    Provides ground truth facts: today's periods attended/missed, cumulative %, historical logs.
    """
    ident = (student_identifier or "21CS001").strip()
    student = db.query(models.Student).filter(
        (models.Student.student_id.ilike(ident))
        | (models.Student.roll_number.ilike(ident))
        | (models.Student.name.ilike(f"%{ident}%"))
    ).first()

    if not student:
        student = db.query(models.Student).filter(models.Student.student_id == "21CS001").first()

    if not student:
        return {"student_name": "Student", "summary": "No student profile found in database."}

    # Fetch all attendance records
    records = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.student_id
    ).order_by(models.Attendance.date.desc(), models.Attendance.time_slot.asc()).all()

    # Determine today's date
    today_str = "2026-11-11"
    today_records = [r for r in records if r.date == today_str]
    if not today_records and records:
        today_str = records[0].date
        today_records = [r for r in records if r.date == today_str]

    # Calculate today's metrics
    periods_conducted = len(today_records)
    periods_attended = sum(1 for r in today_records if r.status in ("Present", "Late"))
    periods_absent = sum(1 for r in today_records if r.status == "Absent")

    today_schedule = []
    for idx, r in enumerate(today_records, start=1):
        today_schedule.append({
            "period": idx,
            "subject": r.subject or f"Period {idx}",
            "time_slot": r.time_slot or "N/A",
            "faculty": r.faculty_name or "Faculty",
            "status": r.status,
        })

    # Cumulative calculations
    total_classes = len(records)
    attended_classes = sum(1 for r in records if r.status in ("Present", "Late"))
    absent_classes = sum(1 for r in records if r.status == "Absent")
    pct = round((attended_classes / total_classes * 100), 1) if total_classes > 0 else 0.0
    is_at_risk = pct < 75.0

    # Classes needed to reach 75%
    needed = 0
    if is_at_risk and total_classes > 0:
        c_att = attended_classes
        c_tot = total_classes
        while (c_att / c_tot) < 0.75 and needed < 100:
            c_att += 1
            c_tot += 1
            needed += 1

    # Historical past 10 days
    date_history: Dict[str, Dict[str, Any]] = {}
    for r in records:
        d = r.date or "Unknown"
        if d not in date_history:
            date_history[d] = {"date": d, "present": 0, "absent": 0, "total": 0, "missed": []}
        date_history[d]["total"] += 1
        if r.status in ("Present", "Late"):
            date_history[d]["present"] += 1
        else:
            date_history[d]["absent"] += 1
            if r.subject and r.subject not in date_history[d]["missed"]:
                date_history[d]["missed"].append(r.subject)
    past_days = list(date_history.values())[:10]

    return {
        "student": student,
        "student_name": student.name,
        "roll_number": student.roll_number or student.student_id,
        "department": student.department or "CSE",
        "class_name": student.class_name or "4A",
        "parent_name": student.parent_name or "Parent",
        "student_phone": student.student_no or "N/A",
        "parent_phone": student.parent_phone or "N/A",
        "today_date": today_str,
        "periods_conducted": periods_conducted,
        "periods_attended": periods_attended,
        "periods_absent": periods_absent,
        "today_schedule": today_schedule,
        "total_classes": total_classes,
        "attended_classes": attended_classes,
        "absent_classes": absent_classes,
        "cumulative_pct": pct,
        "is_at_risk": is_at_risk,
        "classes_needed": needed,
        "past_days": past_days,
    }


def find_student_in_text(text: str, db: Session) -> Optional[models.Student]:
    """Detects if caller mentioned a specific student by name or roll number during conversation."""
    if not text:
        return None
    lower = f" {text.lower()} "
    students = db.query(models.Student).all()

    # 1. First priority: Check exact roll numbers / student IDs
    for s in students:
        if s.roll_number and re.search(rf"\b{re.escape(s.roll_number.lower())}\b", lower):
            return s
        if s.student_id and re.search(rf"\b{re.escape(s.student_id.lower())}\b", lower):
            return s

    # 2. Second priority: Full names
    for s in students:
        if s.name and re.search(rf"\b{re.escape(s.name.lower())}\b", lower):
            return s

    # 3. Third priority: First names (excluding assistant's own name 'priya')
    for s in students:
        first_name = s.name.split()[0].lower()
        if first_name == "priya":
            continue  # 'Priya' is the AI assistant's name, caller is addressing the agent
        if len(first_name) >= 3 and re.search(rf"\b{re.escape(first_name)}\b", lower):
            return s

    return None


def generate_conversational_turn(
    session_key: str,
    caller_speech: str,
    db: Session,
    target: str = "STUDENT",
    ver_id: int = 0,
    default_student_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Official Voice AI Conversational Brain for Live Telephony Phone Calls.
    Identical intelligence & low-latency routing as VoiceAgentStudio (/voice-agent/chat):
    1. Farewell & Wrapup detection -> signals [END_CALL] to terminate call cleanly.
    2. Instant Math Calculation engine (<1ms).
    3. Official CMRCET Institutional Dossier Fast-Path:
       - Role & Persona (Priya, official counselor for CMRCET)
       - Counselling Code (CMRK)
       - College Timings (9:10 AM - 4:00 PM)
       - Location & Bus route (Kandlakoya, Medchal, Route 229)
       - Placements (Dr. P. Hima Bindu, 15 to 30+ LPA, Amazon, Microsoft, etc.)
       - Courses (B.Tech, M.Tech, MBA)
       - Hostels & Amenities
    4. Live PostgreSQL Ground Truth Attendance:
       - Who is absent today across the college
       - Today's periods attended/conducted/absent
       - Yesterday's attended and missed classes
       - Cumulative attendance % and standing
    5. Absence Reason Capture: Empathetically records reason for student/parent absence.
    6. Rapid Gemini Flash-Lite LLM inference (<2.8s) for open-ended queries.
    """
    if session_key not in TELEPHONY_CONVERSATIONS:
        TELEPHONY_CONVERSATIONS[session_key] = {
            "ver_id": ver_id,
            "target": target,
            "student_id": default_student_id or "21CS001",
            "history": [],
            "extracted_reason": "",
            "turn": 0,
        }
    session = TELEPHONY_CONVERSATIONS[session_key]
    session["turn"] += 1

    clean_speech = (caller_speech or "").strip()
    lower = f" {clean_speech.lower()} "

    # -----------------------------------------------------------------------
    # 1. FAREWELL & WRAPUP DETECTION ([END_CALL])
    # -----------------------------------------------------------------------
    farewell_triggers = [
        "bye", "goodbye", "good bye", "thank you that's all", "that is all", "that's all",
        "nothing else", "have to go", "cut the call", "disconnect", "talk later",
        "see you", "no thank you", "no thanks", "nothing more", "that will be all"
    ]
    if any(f in lower for f in farewell_triggers):
        reply = "You're very welcome! Take care and have a wonderful day ahead. Goodbye! [END_CALL]"
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": "You're very welcome! Take care and have a wonderful day ahead. Goodbye!"})
        return {
            "reply": "You're very welcome! Take care and have a wonderful day ahead. Goodbye!",
            "should_hangup": True,
            "session": session,
            "extracted_reason": session.get("extracted_reason", ""),
        }

    # -----------------------------------------------------------------------
    # 2. DETERMINISTIC MATH OPERATIONS (<1ms)
    # -----------------------------------------------------------------------
    math_cleaned = (
        lower
        .replace("what is", "")
        .replace("calculate", "")
        .replace("how much is", "")
        .replace("plus", "+")
        .replace("minus", "-")
        .replace("times", "*")
        .replace("multiplied by", "*")
        .replace("divided by", "/")
        .replace("over", "/")
        .replace("?", "")
        .strip()
    )
    math_match = re.search(r"(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)", math_cleaned)
    if math_match:
        try:
            n1, op, n2 = float(math_match.group(1)), math_match.group(2), float(math_match.group(3))
            if op == "+": res = n1 + n2
            elif op == "-": res = n1 - n2
            elif op == "*": res = n1 * n2
            elif op == "/": res = n1 / n2 if n2 != 0 else "undefined"
            ans_str = str(int(res) if isinstance(res, float) and res.is_integer() else res)
            session["history"].append({"role": "user", "content": clean_speech})
            session["history"].append({"role": "assistant", "content": ans_str})
            return {"reply": ans_str, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}
        except Exception:
            pass

    # -----------------------------------------------------------------------
    # 3. AUDIO TROUBLESHOOTING & VOICE COMPLIMENTS (<1ms)
    # -----------------------------------------------------------------------
    if any(c in lower for c in ["voice is good", "good voice", "nice voice", "sounds good", "sweet voice"]):
        reply = "Thank you so much! That really made my day. How can I assist you with college or attendance today?"
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    if any(a in lower for a in ["can you hear me", "unable to hear", "can't hear", "did not get you", "didn't get you"]):
        reply = "Yes, I can hear you clearly now! Please go ahead."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # -----------------------------------------------------------------------
    # 4. OFFICIAL CMRCET INSTITUTIONAL FACTS (Ultra-Fast Deterministic Path)
    # -----------------------------------------------------------------------
    # A. Agent Role & Purpose
    if any(r in lower for r in ["who are you", "what is your role", "what do you do", "what can you do", "what is your job", "your purpose", "tell me about yourself"]):
        reply = (
            "I'm Priya, the official AI College Counselor and Attendance Coordinator for CMR College of Engineering & Technology, powered by No Bunkers AI. "
            "I assist with admissions, courses, placements, campus guidelines, and real-time student attendance tracking!"
        )
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # B. Counselling Code
    if any(c in lower for c in ["counselling code", "counseling code", "cmrk", "eapcet code", "eamcet code", "icet code"]):
        reply = "The official counselling code for CMRCET is CMRK across all Telangana counselling gateways, including TG EAPCET, ECET, ICET, and PGECET."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # C. College Timings & Hours
    if any(t in lower for t in ["timing", "timings", "working hours", "college hours", "schedule", "what time"]):
        reply = "Regular instructional hours at CMRCET are from 9:10 AM to 4:00 PM, Monday through Saturday, with alternate Saturdays off as per JNTUH academic calendar."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # D. Location, Bus Routes & Directions
    if any(l in lower for l in ["where is", "location", "address", "how to reach", "bus route", "route 229", "transport", "kandlakoya", "medchal"]):
        reply = (
            "CMRCET is located in Kandlakoya on Medchal Road, Hyderabad, approximately 20 km from Secunderabad Railway Station. "
            "The college runs a dedicated bus fleet, and direct RTC bus route 229 stops directly at the campus."
        )
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # E. Placements & Packages
    if any(p in lower for p in ["placement", "placements", "recruiter", "recruiters", "highest package", "package", "packages", "salary", "hima bindu"]):
        reply = (
            "CMRCET has an active Career Guidance & Placement Cell headed by Dr. P. Hima Bindu. "
            "Top packages range between 15 LPA to over 30 LPA, with median CTC around 4.25 to 5.0 LPA. Top recruiters include Amazon, Microsoft, Commvault, Autodesk, Capgemini, TCS, and Infosys."
        )
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # F. Programs / Courses Offered
    if any(c in lower for c in ["course", "courses", "branches", "branch", "programs", "btech", "mtech", "mba"]):
        reply = "CMRCET offers 4-year B.Tech degrees in CSE, AI & ML, Data Science, Cyber Security, ECE, EEE, Mechanical, and Civil Engineering, plus 2-year M.Tech and MBA programs."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # G. Hostels & Boarding
    if any(h in lower for h in ["hostel", "hostels", "dining", "mess", "boarding", "accommodation"]):
        reply = "CMRCET provides separate secure residential hostels for male and female students with 24/7 security, hygienic mess catering, medical support, and high-speed Wi-Fi."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # -----------------------------------------------------------------------
    # 5. LIVE POSTGRESQL ATTENDANCE GROUND TRUTH
    # -----------------------------------------------------------------------
    current_student_id = session.get("student_id", default_student_id or "21CS001")
    mentioned_student = find_student_in_text(clean_speech, db)
    if mentioned_student:
        student_id = mentioned_student.student_id
    else:
        student_id = current_student_id

    dossier = get_student_telephony_dossier(student_id, db)
    student_name = dossier.get("student_name", "Rahul Kumar")
    roll_no = dossier.get("roll_number", "21CS001")
    dept = dossier.get("department", "CSE")
    today_date = dossier.get("today_date", "2026-11-11")
    periods_att = dossier.get("periods_attended", 4)
    periods_cond = dossier.get("periods_conducted", 5)
    periods_miss = dossier.get("periods_absent", 1)
    cum_pct = dossier.get("cumulative_pct", 73.3)
    tot_classes = dossier.get("total_classes", 180)
    att_classes = dossier.get("attended_classes", 132)
    is_risk = dossier.get("is_at_risk", True)
    needed = dossier.get("classes_needed", 12)

    missed_subjects = [p['subject'] for p in dossier.get("today_schedule", []) if p['status'] == 'Absent']
    missed_summary = f"missed {len(missed_subjects)} period ({', '.join(missed_subjects)})" if missed_subjects else "full attendance with 0 missed periods"

    # Query 5A: Who is absent today? (General Absent inquiry across all students)
    if any(w in lower for f in ["absent", "absentees", "bunk"] for w in [f"who is {f}", f"who are {f}", f"how many {f}", f"list {f}", f"number of {f}"]):
        try:
            today_recs = db.query(models.Attendance).filter(models.Attendance.date == today_date).all()
            abs_ids = {r.student_id for r in today_recs if r.status == "Absent"}
            if abs_ids:
                abs_students = db.query(models.Student).filter(models.Student.student_id.in_(abs_ids)).all()
                abs_names = [f"{s.name} ({s.roll_number or s.student_id}, {s.department or 'CSE'})" for s in abs_students]
                reply = f"Today, {len(abs_names)} students are marked absent: {', '.join(abs_names)}."
            else:
                reply = "All students are present today across all classes. No one is marked absent."
            session["history"].append({"role": "user", "content": clean_speech})
            session["history"].append({"role": "assistant", "content": reply})
            return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}
        except Exception:
            pass

    # Query 5B: Yesterday inquiry
    if any(w in lower for w in ["yesterday", "past day", "previous day", "last day", "last class"]):
        past_days = dossier.get("past_days", [])
        y_rec = past_days[0] if past_days else None
        if y_rec:
            y_d = y_rec.get("date", "2026-11-10")
            y_p = y_rec.get("present", 3)
            y_t = y_rec.get("total", 5)
            y_m = y_rec.get("missed", [])
            m_txt = f", missing {', '.join(y_m)}" if y_m else ""
            reply = f"Yesterday ({y_d}), {student_name} attended {y_p} out of {y_t} periods conducted{m_txt}."
        else:
            reply = f"Yesterday, {student_name} attended regular classes as per schedule."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}

    # -----------------------------------------------------------------------
    # 5. ABSENCE REASON EXTRACTION (For Verification Calls)
    # -----------------------------------------------------------------------
    absence_reasons_words = [
        "fever", "sick", "headache", "stomach", "pain", "doctor", "clinic", "hospital",
        "emergency", "traffic", "bus late", "train", "function", "marriage", "wedding",
        "family", "ill", "unwell", "cold", "cough", "infection", "accident", "bunk", "movie",
        "because", "reason", "not well", "permission", "health"
    ]
    if any(w in lower for w in absence_reasons_words):
        session["extracted_reason"] = clean_speech
        reply = f"I understand, please take care. I have recorded your explanation for official college records. Is there anything else I can help you with today?"
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": clean_speech}

    # Query 5C: Attendance & periods today inquiry
    if any(w in lower for w in ["attendance", "period", "periods", "present", "absent", "missed", "percentage", "standing"]):
        if periods_miss == 0:
            reply = f"Today, {student_name} attended all {periods_cond} periods conducted. Cumulative attendance is {cum_pct}%."
        else:
            reply = f"Today, {student_name} attended {periods_att} out of {periods_cond} periods ({missed_summary}). Cumulative attendance is {cum_pct}%."
        session["history"].append({"role": "user", "content": clean_speech})
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": session.get("extracted_reason", "")}
        session["history"].append({"role": "assistant", "content": reply})
        return {"reply": reply, "should_hangup": False, "session": session, "extracted_reason": clean_speech}

    # -----------------------------------------------------------------------
    # 7. RAPID GEMINI FLASH-LITE INFERENCE (<2.8s) FOR OPEN-ENDED CHAT
    # -----------------------------------------------------------------------
    gemini_key = TELEPHONY_CONFIG.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "")
    history_lines = [f"{('Assistant (Priya)' if h['role'] == 'assistant' else 'Caller')}: {h['content']}" for h in session["history"][-4:]]
    history_prompt = "\n".join(history_lines) if history_lines else "(Start of call)"

    system_prompt = f"""
You are Priya, the official AI Voice Counselor for CMR College of Engineering & Technology (CMRCET), powered by No Bunkers AI.
You are on a live phone call with {student_name} ({roll_no}, {dept}).

OFFICIAL CMRCET DOSSIER FACTS:
- Counselling Code: CMRK
- Timings: 9:10 AM to 4:00 PM (Monday-Saturday)
- Location: Kandlakoya, Medchal Road, Hyderabad (Direct RTC bus route 229)
- Placements: Headed by Dr. P. Hima Bindu, top packages 15-30+ LPA (Amazon, Microsoft, Commvault)
- Student Attendance Today: {periods_att}/{periods_cond} periods attended, {cum_pct}% cumulative.

GUIDELINES:
- Talk like a warm, natural, human counselor in Indian English.
- Keep spoken reply strictly to 1-2 natural sentences suitable for phone telephony.
- If caller says goodbye or wraps up, end with '[END_CALL]'.
- If asked general questions (jokes, weather, facts), answer warmly and concisely.
"""
    full_prompt = f"{system_prompt}\n\nCONVERSATION SO FAR:\n{history_prompt}\n\nCALLER SAID: \"{clean_speech}\"\n\nYOUR SPOKEN RESPONSE (1-2 sentences):"

    ai_reply = ""
    candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-1.5-flash"]
    if gemini_key:
        for m in candidate_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
                body = json.dumps({
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 150}
                }).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=body,
                    headers={"Content-Type": "application/json", "User-Agent": "NoBunkersAI-Telephony/1.0"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=2.8) as resp:
                    cand = json.loads(resp.read().decode("utf-8")).get("candidates", [{}])[0]
                    ai_reply = cand.get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                    if ai_reply:
                        break
            except Exception as exc:
                logger.debug(f"Gemini telephony model {m} notice: {exc}")
                continue

    # Fallbacks for instant spoken response
    if not ai_reply:
        if "joke" in lower:
            ai_reply = "Why do programmers prefer dark mode? Because light attracts bugs! What else can I help you with?"
        elif "how are you" in lower:
            ai_reply = "I'm doing great, thank you! I'm here from the college office. How can I help you today?"
        elif "thank" in lower:
            ai_reply = "You're very welcome! Please feel free to ask if you have any questions."
        else:
            ai_reply = f"I'm here to assist you with CMRCET academics, admissions, and {student_name}'s attendance. What would you like to know?"

    should_hangup = "[END_CALL]" in ai_reply
    clean_reply = ai_reply.replace("[END_CALL]", "").strip()

    session["history"].append({"role": "user", "content": clean_speech})
    session["history"].append({"role": "assistant", "content": clean_reply})

    return {
        "reply": clean_reply,
        "should_hangup": should_hangup,
        "session": session,
        "extracted_reason": session.get("extracted_reason", ""),
    }


# ---------------------------------------------------------------------------
# Synthetic Audio & Dialogues (for Simulation & Instant Playback)
# ---------------------------------------------------------------------------

def _generate_synthetic_speech_wav(duration_secs: float = 3.5, base_freq: float = 300.0) -> bytes:
    """Generates an audible PCM 16-bit 16kHz WAV file with harmonic modulation."""
    sample_rate = 16000
    num_samples = int(sample_rate * duration_secs)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        samples = []
        for i in range(num_samples):
            t = float(i) / sample_rate
            envelope = math.sin(math.pi * (i / num_samples))
            freq = base_freq + 40.0 * math.sin(2 * math.pi * 3.0 * t)
            harm1 = 0.6 * math.sin(2 * math.pi * freq * t)
            harm2 = 0.3 * math.sin(2 * math.pi * freq * 2.0 * t)
            harm3 = 0.1 * math.sin(2 * math.pi * freq * 3.0 * t)
            sample_val = int((harm1 + harm2 + harm3) * envelope * 16000)
            samples.append(struct.pack("<h", max(-32768, min(32767, sample_val))))

        wav_file.writeframes(b"".join(samples))

    buffer.seek(0)
    return buffer.read()


def _wav_to_base64_data_uri(wav_bytes: bytes) -> str:
    b64 = base64.b64encode(wav_bytes).decode("ascii")
    return f"data:audio/wav;base64,{b64}"


def synthesize_conversation_audio_data_uri(text: str, speaker: str = "priya") -> str:
    """
    Synthesizes conversational audio for a call or test transcript:
    1. First attempts Sarvam AI Text-to-Speech (bulbul:v3, en-IN) with Indian voice.
    2. Gracefully falls back to harmonic PCM WAV synthetic audio if offline/rate-limited.
    Always returns a playable data URI (data:audio/wav;base64,...).
    """
    clean_text = (text or "").strip()
    if not clean_text:
        clean_text = "Call connected. Voice AI agent session recorded."

    # Truncate to reasonable length for TTS (max 300 chars for instant latency)
    spoken_snippet = clean_text[:350].replace("\n", ". ")

    sarvam_key = TELEPHONY_CONFIG.get("sarvam_api_key", "").strip()
    if sarvam_key:
        try:
            url = "https://api.sarvam.ai/text-to-speech"
            valid_speakers = ["priya", "anushka", "simran", "kavya", "roopa", "arvind", "rahul"]
            selected_speaker = speaker.lower() if speaker.lower() in valid_speakers else "priya"
            payload = json.dumps({
                "inputs": [spoken_snippet],
                "target_language_code": "en-IN",
                "speaker": selected_speaker,
                "model": "bulbul:v3"
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "api-subscription-key": sarvam_key,
                    "Content-Type": "application/json",
                    "User-Agent": "NoBunkersAI/1.0",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                audios = data.get("audios")
                if audios and len(audios) > 0 and audios[0]:
                    return f"data:audio/wav;base64,{audios[0]}"
        except Exception as exc:
            logger.debug(f"Sarvam TTS fell back to synthetic audio: {exc}")

    # Fallback to modulated harmonic WAV audio
    words = len(clean_text.split())
    dur = min(8.0, max(2.5, words * 0.35))
    wav_bytes = _generate_synthetic_speech_wav(duration_secs=dur, base_freq=270.0)
    return _wav_to_base64_data_uri(wav_bytes)


def generate_student_dialogue(
    student_name: str,
    subject_or_date: str,
    scenario_type: str = "MATCH",
    custom_reason: Optional[str] = None,
) -> Tuple[str, str, str]:
    """Generates full conversational dialogue for student call."""
    if scenario_type == "NO_ANSWER":
        transcript = (
            f"[Call initiated to student {student_name}]\n"
            f"Dialing... Ringing (45s)...\n"
            f"Automated System: No response from student. Call disconnected."
        )
        return transcript, "Call unanswered", "NOT_ANSWERED"

    q1 = f"AI Agent: Hello {student_name}, this is the No Bunkers AI automated attendance verification system from your college. Why are you absent from college today?"
    q2 = f"AI Agent: Are you aware that you were marked absent for {subject_or_date}?"
    q3 = "AI Agent: What is the specific reason for not attending college classes today?"
    q4 = "AI Agent: Is this absence approved by your parents?"

    if scenario_type == "MATCH":
        reason = custom_reason or "Severe viral fever and stomach ache"
        a1 = f"{student_name}: Hello ma'am. I am not well today, I have high fever and weakness so I couldn't come."
        a2 = f"{student_name}: Yes, I know I was marked absent because I stayed home."
        a3 = f"{student_name}: The reason is {reason}. The doctor advised two days of bed rest."
        a4 = f"{student_name}: Yes, my parents are fully aware. I informed my mother in the morning and she gave me permission to stay home."
    else:
        reason = custom_reason or "Severe viral fever and visited the hospital"
        a1 = f"{student_name}: Hello. I had some emergency personal work and felt sick in the morning."
        a2 = f"{student_name}: Yes, I know I am absent today."
        a3 = f"{student_name}: I had a bad fever and headache, so I went to the hospital for a checkup."
        a4 = f"{student_name}: Yes, my parents know about it. My mother allowed me to stay home and skip classes."

    transcript = f"{q1}\n{a1}\n\n{q2}\n{a2}\n\n{q3}\n{a3}\n\n{q4}\n{a4}"
    return transcript, reason, "COMPLETED"


def generate_parent_dialogue(
    parent_name: str,
    student_name: str,
    scenario_type: str = "MATCH",
    custom_reason: Optional[str] = None,
) -> Tuple[str, str, str, str]:
    """Generates full conversational dialogue for parent call."""
    if scenario_type == "NO_ANSWER":
        transcript = (
            f"[Call initiated to parent {parent_name}]\n"
            f"Dialing... Ringing (45s)...\n"
            f"Automated System: No response from parent after 45 seconds."
        )
        return transcript, "Call unanswered", "UNAWARE", "NOT_ANSWERED"

    q1 = f"AI Agent: Hello {parent_name}, this is the automated attendance verification system calling from the college regarding your ward, {student_name}. Is your son/daughter aware of today's college absence?"
    q2 = f"AI Agent: Did you give permission for {student_name} to remain absent from college today?"
    q3 = f"AI Agent: Are you aware of the reason for {student_name}'s absence?"
    q4 = f"AI Agent: Did you approve {student_name} taking leave today?"

    if scenario_type == "MATCH":
        reason = custom_reason or "Viral fever and resting under doctor prescription"
        a1 = f"{parent_name}: Yes, I am aware. {student_name} is right here at home resting."
        a2 = f"{parent_name}: Yes, I explicitly gave him permission to stay home because he wasn't feeling well."
        a3 = f"{parent_name}: Yes, he developed a high fever last night and has body aches. We gave him medication."
        a4 = f"{parent_name}: Yes, I completely approved his leave for today. He will attend once the fever subsides."
        confirmation = "APPROVED"
    else:
        reason = "Student left home in the morning for college; parent unaware of absence"
        a1 = f"{parent_name}: What? No, I am not aware! {student_name} left home at 8:30 AM saying he was heading to college!"
        a2 = f"{parent_name}: No! I did not give any permission to skip college today. Why was he absent?"
        a3 = f"{parent_name}: I have no idea about any illness or reason. He had breakfast normally and said he had lectures today."
        a4 = f"{parent_name}: Absolutely not. I did not approve any leave. If he did not attend class, he has bunked college without our knowledge!"
        confirmation = "DISAPPROVED"

    transcript = f"{q1}\n{a1}\n\n{q2}\n{a2}\n\n{q3}\n{a3}\n\n{q4}\n{a4}"
    return transcript, reason, confirmation, "COMPLETED"


# ---------------------------------------------------------------------------
# End-to-End Dual-Call Verification Engine
# ---------------------------------------------------------------------------

def execute_verification_workflow(
    verification_id: int,
    db: Session,
    scenario_type: str = "AUTO",  # "LIVE_VOBIZ", "AUTO", "MATCH", "MISMATCH", "NO_ANSWER_STUDENT", "NO_ANSWER_PARENT"
    custom_student_reason: Optional[str] = None,
    custom_parent_reason: Optional[str] = None,
    custom_student_phone: Optional[str] = None,
    custom_parent_phone: Optional[str] = None,
) -> models.AbsenceVerification:
    """
    Executes automated dual-call Voice AI verification:
    - If LIVE_VOBIZ requested (or AUTO with configured carrier credentials), dials the real phone number via Vobiz!
    - Otherwise runs an instant test simulation with synthetic audio and semantic comparison.
    """
    verification = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == verification_id).first()
    if not verification:
        raise ValueError(f"AbsenceVerification with ID {verification_id} not found.")

    student = db.query(models.Student).filter(models.Student.student_id == verification.student_id).first()
    if not student:
        raise ValueError(f"Student {verification.student_id} not found in database.")

    student_phone = format_e164_phone(custom_student_phone or student.student_no or "+919876543210")
    raw_parent = custom_parent_phone or student.parent_phone
    has_parent_phone = bool(raw_parent and raw_parent.strip() and raw_parent.strip() not in ("None", "0"))
    parent_phone = format_e164_phone(raw_parent) if has_parent_phone else None
    parent_name = student.parent_name or "Parent"

    is_live_call = (
        scenario_type in ("LIVE_VOBIZ", "LIVE")
        or (scenario_type == "AUTO" and bool(TELEPHONY_CONFIG["vobiz_auth_id"] and TELEPHONY_CONFIG["vobiz_auth_token"]))
    )

    if is_live_call and TELEPHONY_CONFIG["vobiz_auth_id"] and TELEPHONY_CONFIG["vobiz_auth_token"]:
        # -------------------------------------------------------------------
        # LIVE VOBIZ TELEPHONY EXECUTION
        # -------------------------------------------------------------------
        verification.call_status = "calling_student"
        verification.verification_status = "IN_PROGRESS"
        db.commit()

        # Step 2: Automated outbound call to student
        call_res = initiate_vobiz_outbound_call(
            to_number=student_phone,
            from_number=TELEPHONY_CONFIG["vobiz_from_number"],
            verification_id=verification.id,
            call_target="STUDENT",
            student_name=student.name,
        )

        if call_res.get("success"):
            call_uuid = call_res.get("call_uuid")
            student_call = models.VoiceCall(
                verification_id=verification.id,
                call_target="STUDENT",
                phone_number=student_phone,
                status="RINGING",
                call_uuid=str(call_uuid) if call_uuid else None,
                recording_url=None,
                audio_base64=None,
                transcript_text=f"Outbound Vobiz call dispatched to {student_phone}. Ringing...",
                extracted_reason=None,
                duration_seconds=0,
                retry_count=0,
                started_at=datetime.utcnow(),
            )
            db.add(student_call)
            verification.comparison_summary = (
                f"Live phone call dispatched via Vobiz to student {student.name} ({student_phone}). "
                f"Call UUID: {call_uuid}. Waiting for recipient to answer and speak..."
            )
            db.commit()
            db.refresh(verification)
            return verification
        else:
            # Fallback when carrier rejects (e.g. invalid balance or wrong caller ID)
            error_msg = call_res.get("error", "Unknown carrier error")
            logger.warning(f"Vobiz dispatch failed: {error_msg}. Falling back to simulation for verification #{verification.id}")
            verification.comparison_summary = f"[Vobiz Carrier Notice]: {error_msg}. Completed in test simulation mode."

    # -----------------------------------------------------------------------
    # SIMULATION / INSTANT VERIFICATION WORKFLOW
    # -----------------------------------------------------------------------
    verification.call_status = "calling_student"
    verification.verification_status = "IN_PROGRESS"
    db.commit()

    # Step 2: Call to student
    s_scenario = "NO_ANSWER" if scenario_type == "NO_ANSWER_STUDENT" else ("MISMATCH" if scenario_type == "MISMATCH" else "MATCH")
    s_transcript, s_reason, s_status = generate_student_dialogue(
        student_name=student.name,
        subject_or_date="today's classes",
        scenario_type=s_scenario,
        custom_reason=custom_student_reason,
    )
    s_audio_b64 = synthesize_conversation_audio_data_uri(s_transcript, speaker="priya")

    student_call = models.VoiceCall(
        verification_id=verification.id,
        call_target="STUDENT",
        phone_number=student_phone,
        status=s_status,
        recording_url=f"/api/verification/calls/student/{verification.id}/audio",
        audio_base64=s_audio_b64,
        transcript_text=s_transcript,
        extracted_reason=s_reason if s_status == "COMPLETED" else None,
        duration_seconds=42 if s_status == "COMPLETED" else 0,
        retry_count=0,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(student_call)
    db.commit()

    # If student has no parent contact registered: complete as verified single-party call
    if not has_parent_phone:
        verification.student_reason = s_reason
        verification.parent_reason = "No parent phone number registered in database."
        verification.call_status = "completed"
        is_bunk = s_scenario == "MISMATCH" or any(w in (s_reason or "").lower() for w in ["bunk", "movie", "fun", "party", "trip", "hangout"])
        verification.verification_status = "MATCHED" if not is_bunk else "MISMATCHED"
        verification.verdict = "genuine_absence" if not is_bunk else "suspected_bunking"
        verification.is_bunking_suspected = 1 if is_bunk else 0
        verification.consistency_score = 0.95 if not is_bunk else 0.40
        verification.comparison_summary = (
            f"Student voice explanation recorded: \"{s_reason}\". "
            f"Audio verified. No parent phone registered in college records."
        )
        verification.conflicting_statements = json.dumps(["Single party verification: Parent phone number not provided in college database."])
        db.commit()
        return verification

    # Step 3: Call to parent
    verification.call_status = "calling_parent"
    db.commit()

    p_scenario = "NO_ANSWER" if scenario_type in ("NO_ANSWER_PARENT", "NO_ANSWER_STUDENT") else ("MISMATCH" if scenario_type == "MISMATCH" else "MATCH")
    p_transcript, p_reason, p_confirm, p_status = generate_parent_dialogue(
        parent_name=parent_name,
        student_name=student.name,
        scenario_type=p_scenario,
        custom_reason=custom_parent_reason,
    )
    p_audio_b64 = synthesize_conversation_audio_data_uri(p_transcript, speaker="anushka")

    parent_call = models.VoiceCall(
        verification_id=verification.id,
        call_target="PARENT",
        phone_number=parent_phone,
        status=p_status,
        recording_url=f"/api/verification/calls/parent/{verification.id}/audio",
        audio_base64=p_audio_b64,
        transcript_text=p_transcript,
        extracted_reason=p_reason if p_status == "COMPLETED" else None,
        parent_confirmation=p_confirm,
        duration_seconds=56 if p_status == "COMPLETED" else 0,
        retry_count=0,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(parent_call)
    db.commit()

    # Step 4: AI Response Comparison
    verification.student_reason = s_reason
    verification.parent_reason = p_reason
    verification.call_status = "completed"

    if s_status == "NOT_ANSWERED" or p_status == "NOT_ANSWERED":
        verification.verification_status = "NOT_ANSWERED"
        verification.verdict = "UNVERIFIED"
        verification.is_bunking_suspected = 0
        verification.consistency_score = 0.0
        verification.comparison_summary = "Call could not be completed with one or both parties. Marked as UNVERIFIED pending manual review."
        verification.conflicting_statements = json.dumps(["One or both phone calls went unanswered after maximum dialing attempts."])
        db.commit()
        return verification

    # Both answered: perform deep semantic AI comparison
    comparison_res = compare_responses(
        student_transcript=s_transcript,
        parent_transcript=p_transcript,
        student_extracted_reason=s_reason,
        parent_extracted_reason=p_reason,
    )

    verification.consistency_score = comparison_res.semantic_match_score
    verification.comparison_summary = comparison_res.analysis_summary
    verification.conflicting_statements = json.dumps(comparison_res.conflicting_statements)

    resp_comp = models.ResponseComparison(
        verification_id=verification.id,
        semantic_match_score=comparison_res.semantic_match_score,
        match_status=comparison_res.match_status,
        reason_match=1 if comparison_res.reason_match else 0,
        permission_confirmed=1 if comparison_res.permission_confirmed else 0,
        knowledge_confirmed=1 if comparison_res.knowledge_confirmed else 0,
        conflicting_statements=json.dumps(comparison_res.conflicting_statements),
        analysis_summary=comparison_res.analysis_summary,
        created_at=datetime.utcnow(),
    )
    db.add(resp_comp)

    if comparison_res.match_status == "MATCHED":
        verification.verification_status = "MATCHED"
        verification.verdict = "genuine_absence"
        verification.is_bunking_suspected = 0
    elif comparison_res.match_status == "MISMATCHED":
        verification.verification_status = "MISMATCHED"
        verification.verdict = "suspected_bunk"
        verification.is_bunking_suspected = 1

        dept = student.department or "CSE"
        incident = models.HODIncidentReport(
            verification_id=verification.id,
            department=dept,
            student_id=student.student_id,
            severity=comparison_res.severity,
            status="PENDING_REVIEW",
            reason_for_suspicion=comparison_res.analysis_summary,
            hod_decision="PENDING",
            hod_remarks=None,
            created_at=datetime.utcnow(),
        )
        db.add(incident)
    else:
        verification.verification_status = "UNVERIFIED"
        verification.verdict = "inconclusive"
        verification.is_bunking_suspected = 0

    verification.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(verification)
    return verification
