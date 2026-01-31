"""
NeuroPixel Backend - FastAPI Application
Scientific Image Analysis Workstation
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.images import router as images_router
from app.api.plugins import router as plugins_router
from app.api.batch import router as batch_router
from app.api.system import router as system_router
from app.plugins.manager import initialize_plugins


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup: Load plugins
    initialize_plugins()
    yield
    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="LumaGraph",
    description="Scientific Image Analysis Workstation API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
import os
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8005")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(images_router)
app.include_router(plugins_router)
app.include_router(batch_router)
app.include_router(system_router)


@app.get("/health")
async def health_check():
    """Health check endpoint for frontend connectivity."""
    return {
        "status": "ok",
        "gpu_active": True,
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "LumaGraph API", "docs": "/docs"}
