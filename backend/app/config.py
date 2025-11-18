from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application settings loaded from environment variables.

    These settings map to the secrets we will configure in Render/Vercel
    and allow easy overrides for local development via a `.env` file.
    """

    # FastAPI global
    app_name: str = "Omaguva Backend"
    debug: bool = False

    # Database (Render Postgres) - optional for now since we're using fixture data
    database_url: Optional[str] = None
    
    # Database preference: 'render' or 'supabase' (defaults to 'supabase')
    database_preference: str = "supabase"
    
    # Supabase (for direct database access)
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    # Cloudflare R2 (S3-compatible)
    r2_account_id: Optional[str] = None
    r2_access_key_id: Optional[str] = None
    r2_secret_access_key: Optional[str] = None
    r2_bucket_name: Optional[str] = None
    r2_public_base_url: Optional[str] = None

    # PhonePe
    phonepe_enabled: bool = False
    phonepe_merchant_id: Optional[str] = None
    phonepe_merchant_secret: Optional[str] = None
    phonepe_salt_index: str = "1"
    phonepe_client_id: Optional[str] = None
    phonepe_client_secret: Optional[str] = None
    phonepe_client_version: str = "1"
    phonepe_pay_base_url: str = "https://api.phonepe.com/apis/pg"
    phonepe_oauth_base_url: str = "https://api.phonepe.com/apis/identity-manager"
    phonepe_checkout_v2: bool = True
    phonepe_allow_body_credentials: bool = False

    phonepe_payment_callback_url: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")


@lru_cache
def get_settings() -> Settings:
    return Settings()


