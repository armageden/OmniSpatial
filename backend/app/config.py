from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    app_name: str = "OmniSpatial API"
    meta_model_api_key: str = "mock_key"
    meta_api_base_url: str = "https://api.meta.ai/v1"
    modal_token_id: str = ""
    modal_token_secret: str = ""
    baseten_api_key: str = ""
    fireworks_api_key: str = ""
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    cors_allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(
        env_file=[str(ENV_PATH), ".env"],
        extra="ignore"
    )

settings = Settings()
