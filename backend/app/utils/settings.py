"""Configuration settings for the backend."""
# TODO: WTF?
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Google Gemini AI
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    # Celery Configuration
    CELERY_BROKER_URL: str = os.getenv(
        "CELERY_BROKER_URL", "redis://localhost:6379/0"
    )
    CELERY_RESULT_BACKEND: str = os.getenv(
        "CELERY_RESULT_BACKEND", "redis://localhost:6379/0"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
