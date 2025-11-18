# Omaguva Python Backend

This directory contains the new Python backend service that replaces the Supabase Edge Functions. It is built with FastAPI and targets deployment on Render.

## Local development

```bash
cd backend
python -m venv .venv
. .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. A basic health check is exposed at `/healthz`.

## Environment variables

The service reads configuration from the environment (or a `.env` file during local development). The most relevant settings so far:

- `DATABASE_URL` – Render Postgres connection string.
- `PHONEPE_ENABLED` – `true` to enable live PhonePe calls.
- `PHONEPE_MERCHANT_ID`, `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, etc. – PhonePe credentials.
- `PHONEPE_PAYMENT_CALLBACK_URL` – canonical callback URL shared with PhonePe.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` – Cloudflare R2 credentials.
- `R2_PUBLIC_BASE_URL` – Optional base URL when exposing public files directly from R2.

Refer to `app/config.py` for the full list.

## Verifying Cloudflare R2 integration

After exporting the credentials into your shell (or `.env`), you can run a quick smoke test:

```python
import asyncio
from app.services.storage import storage_client

async def smoke_test():
    await storage_client.upload_bytes("health.txt", b"hello from omaguva")
    async for obj in storage_client.list_objects("health"):
        print(obj)

asyncio.run(smoke_test())
```

This uses the high-level helper in `app/services/storage.py` to ensure uploads/listing work end-to-end.

## Project structure

- `app/main.py` – FastAPI application factory, middleware, and router wiring.
- `app/routers/` – API routers grouped by domain (`health`, `phonepe`, etc.).
- `app/services/` – Business logic extracted from the former Supabase functions.
- `app/config.py` – Centralised environment settings via `pydantic-settings`.

## Next steps

- Port the remaining Supabase functions (PhonePe status, webhooks, Easebuzz, Zoho, etc.) into Python routers/services.
- Introduce SQLAlchemy models and migrations (Alembic) based on the Supabase schema.
- Add unit tests (e.g. with `pytest`) and CI integration.
- Implement Cloudflare R2 upload/download helpers and replace Supabase storage usage.


