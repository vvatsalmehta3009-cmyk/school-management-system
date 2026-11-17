from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env file.
    """
    PROJECT_NAME: str = "School Management Platform"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://neondb_owner:npg_lW9F8cQPBoEv@ep-dawn-brook-bc0vday6-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require"

    # JWT Authentication
    SECRET_KEY: str = "insecure-dev-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

