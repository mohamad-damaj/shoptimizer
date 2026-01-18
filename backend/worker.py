# Run Celery worker for processing Claude requests
import os

from app.utils.celery_app import celery_app


def run_worker():
    """Start the Celery worker process."""
    celery_command = "celery -A worker worker --loglevel=info"
    print(f"Starting Celery worker with command: {celery_command}")
    os.system(celery_command)


if __name__ == "__main__":
    # Check if run command is given
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "run":
        run_worker()
