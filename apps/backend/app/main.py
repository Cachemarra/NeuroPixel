"""
NeuroPixel Backend - FastAPI Application
Scientific Image Analysis Workstation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="NeuroPixel",
    description="Scientific Image Analysis Workstation API",
    version="0.1.0"
)

# CORS configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {"message": "NeuroPixel API", "docs": "/docs"}
