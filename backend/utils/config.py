import os
from typing import Optional

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    # Celery
    CELERY_BROKER_URL: str = Field(
        default=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    )
    CELERY_RESULT_BACKEND: str = Field(
        default=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    )
    # API
    API_HOST: str = Field(default=os.getenv("API_HOST", "0.0.0.0"))
    API_PORT: int = Field(default=int(os.getenv("API_PORT", "8000")))

    # Redis
    REDIS_HOST: str = Field(default=os.getenv("REDIS_HOST", "localhost"))
    REDIS_PORT: int = Field(default=int(os.getenv("REDIS_PORT", "6379")))

    # API keys
    GOOGLE_API_KEY: str | None = Field(default=os.getenv("GOOGLE_API_KEY", None))

    class Config:
        env_file = ".env"


settings = Settings()
