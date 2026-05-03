import json
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NUVA API"
    api_v1_prefix: str = "/api"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    mongodb_url: str
    mongodb_db_name: str = "nuva"
    b2_region: str
    b2_endpoint_url: str
    b2_access_key_id: str
    b2_secret_access_key: str
    b2_bucket_name: str
    cloudflare_cdn_base_url: str
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nuvajewellery.store",
        "https://www.nuvajewellery.store",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, list):
            return value

        if isinstance(value, str):
            stripped_value = value.strip()
            if not stripped_value:
                return []

            if stripped_value.startswith("["):
                parsed_value = json.loads(stripped_value)
                if isinstance(parsed_value, list):
                    return [item.strip() for item in parsed_value if item and item.strip()]

            return [item.strip() for item in stripped_value.split(",") if item.strip()]

        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
