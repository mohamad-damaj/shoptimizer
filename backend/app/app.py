"""Main FastAPI application for Shoptimizer backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown."""
    # Startup
    logger.info("Shoptimizer backend starting...")
    yield
    # Shutdown
    logger.info("Shoptimizer backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Shoptimizer",
    description="AI-powered 3D product visualization platform for Shopify",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


@app.get("/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Shoptimizer API",
        "docs": "/docs",
        "redoc": "/redoc",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
