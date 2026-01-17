import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from celery import Celery

from backend.utils.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["backend.claude.scene_generation"],
)

# Optional: Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes
    worker_concurrency=4,
)
