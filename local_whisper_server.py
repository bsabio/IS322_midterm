#!/usr/bin/env python3
"""Local OpenAI-compatible Whisper transcription server.

Run:
  uvicorn local_whisper_server:app --host 127.0.0.1 --port 8001
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI(title="Local Whisper Server", version="1.0.0")

# Allow browser clients from localhost static servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_CACHE: Dict[str, WhisperModel] = {}
DEFAULT_MODEL = os.getenv("WHISPER_MODEL", "small")
DEFAULT_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
DEFAULT_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")


def get_model(model_name: str) -> WhisperModel:
    """Load and cache models lazily so first request can warm the model."""
    if model_name not in MODEL_CACHE:
        MODEL_CACHE[model_name] = WhisperModel(
            model_name,
            device=DEFAULT_DEVICE,
            compute_type=DEFAULT_COMPUTE_TYPE,
        )
    return MODEL_CACHE[model_name]


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "default_model": DEFAULT_MODEL,
        "device": DEFAULT_DEVICE,
        "compute_type": DEFAULT_COMPUTE_TYPE,
    }


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form(DEFAULT_MODEL),
    language: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    temperature: float = Form(0.0),
) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    suffix = Path(file.filename).suffix or ".audio"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                tmp.write(chunk)

        whisper = get_model(model)
        segments, info = whisper.transcribe(
            str(tmp_path),
            language=language or None,
            initial_prompt=prompt or None,
            temperature=temperature,
            vad_filter=True,
        )

        text = " ".join(segment.text.strip() for segment in segments).strip()

        return {
            "text": text,
            "language": getattr(info, "language", None),
            "duration": getattr(info, "duration", None),
            "model": model,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        try:
            if "tmp_path" in locals() and tmp_path.exists():
                tmp_path.unlink()
        except OSError:
            pass
