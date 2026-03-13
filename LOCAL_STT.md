# Local Whisper Transcription (No API Key)

This project now supports a local transcription backend through `local_whisper_server.py`.

## 1) Install dependencies

```bash
pip install -r requirements.txt
```

## 2) Start the local Whisper server

```bash
uvicorn local_whisper_server:app --host 127.0.0.1 --port 8001
```

Optional environment variables:

```bash
export WHISPER_MODEL=small
export WHISPER_DEVICE=cpu
export WHISPER_COMPUTE_TYPE=int8
```

Notes:
- `small` is a good default for quality/speed.
- For faster inference with a GPU, set `WHISPER_DEVICE=cuda` and choose a suitable compute type.

## 3) Use in the builder UI

1. Open `builder.html`.
2. Choose **Local Whisper Server (no API key)** from **Transcription Backend**.
3. Ensure endpoint is `http://127.0.0.1:8001/v1/audio/transcriptions`.
4. Click **Transcribe**.

## 4) Health check

```bash
curl http://127.0.0.1:8001/health
```

Expected response includes `"status":"ok"`.
