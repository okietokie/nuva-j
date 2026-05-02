from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
