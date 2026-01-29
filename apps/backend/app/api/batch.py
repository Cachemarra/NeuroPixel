"""
Batch Processing API
Handles batch execution of pipelines on multiple images with WebSocket progress updates.
"""
import asyncio
import uuid
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.core.pipeline import Pipeline, PipelineStep
from app.api.images import image_cache, read_image_with_metadata, convert_to_display_png

# Router
router = APIRouter(prefix="/batch", tags=["batch"])

# Active batch jobs storage
batch_jobs: Dict[str, "BatchJob"] = {}

# WebSocket connections for progress updates
websocket_connections: List[WebSocket] = []


class BatchRunRequest(BaseModel):
    """Request to start a batch processing job."""
    source_image_ids: List[str] = []
    pipeline_steps: List[PipelineStep]
    output_folder: str = "/tmp/neuropixel_batch_output"
    input_folder: Optional[str] = None


class BatchProgressMessage(BaseModel):
    """Progress update message sent via WebSocket."""
    job_id: str
    status: Literal["pending", "processing", "completed", "failed", "cancelled"]
    current: int
    total: int
    filename: Optional[str] = None
    error: Optional[str] = None
    elapsed_seconds: float = 0.0


class BatchJobResult(BaseModel):
    """Final result of a batch job."""
    job_id: str
    status: Literal["completed", "failed", "cancelled"]
    processed: int
    failed: int
    total: int
    elapsed_seconds: float
    output_folder: str
    errors: List[str] = []


class BatchJob:
    """Represents an active batch processing job."""
    
    def __init__(
        self,
        job_id: str,
        source_image_ids: List[str],
        pipeline: Pipeline,
        output_folder: Path,
        source_paths: List[Path] = []
    ):
        self.job_id = job_id
        self.source_image_ids = source_image_ids
        self.source_paths = source_paths
        self.pipeline = pipeline
        self.output_folder = output_folder
        self.status: Literal["pending", "processing", "completed", "failed", "cancelled"] = "pending"
        self.current = 0
        self.total = len(source_image_ids) if source_image_ids else len(source_paths)
        self.processed = 0
        self.failed = 0
        self.errors: List[str] = []
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.cancelled = False
    
    @property
    def elapsed_seconds(self) -> float:
        if self.start_time is None:
            return 0.0
        end = self.end_time or time.time()
        return end - self.start_time
    
    def get_progress_message(self, filename: Optional[str] = None) -> BatchProgressMessage:
        return BatchProgressMessage(
            job_id=self.job_id,
            status=self.status,
            current=self.current,
            total=self.total,
            filename=filename,
            elapsed_seconds=self.elapsed_seconds
        )
    
    def get_result(self) -> BatchJobResult:
        return BatchJobResult(
            job_id=self.job_id,
            status=self.status,
            processed=self.processed,
            failed=self.failed,
            total=self.total,
            elapsed_seconds=self.elapsed_seconds,
            output_folder=str(self.output_folder),
            errors=self.errors
        )


async def broadcast_progress(message: BatchProgressMessage):
    """Send progress update to all connected WebSocket clients."""
    disconnected = []
    
    for ws in websocket_connections:
        try:
            await ws.send_json(message.model_dump())
        except Exception:
            disconnected.append(ws)
    
    # Remove disconnected clients
    for ws in disconnected:
        if ws in websocket_connections:
            websocket_connections.remove(ws)


async def run_batch_job(job: BatchJob):
    """Execute a batch processing job in the background."""
    job.status = "processing"
    job.start_time = time.time()
    
    # Ensure output folder exists
    job.output_folder.mkdir(parents=True, exist_ok=True)
    
    await broadcast_progress(job.get_progress_message())
    
    items_to_process = []
    if job.source_paths:
        items_to_process = [(i, path) for i, path in enumerate(job.source_paths)]
    else:
        items_to_process = [(i, id) for i, id in enumerate(job.source_image_ids)]

    for i, item in items_to_process:
        if job.cancelled:
            job.status = "cancelled"
            break
        
        job.current = i + 1
        
        img = None
        filename = f"image_{i}.png"

        try:
            if job.source_paths:
                # Path-based processing
                path = item
                if not path.exists():
                     raise FileNotFoundError(f"File not found: {path}")
                filename = path.name
                img, _ = read_image_with_metadata(path)
            else:
                # Cache-based processing
                image_id = item
                cache_entry = image_cache.get(image_id)
                if cache_entry is None:
                    raise ValueError(f"Image {image_id} not found in cache")
                
                filename = cache_entry.get("original_name", f"image_{i}.png")
                img = cache_entry.get("image")
                if img is None:
                    file_path = cache_entry["path"]
                    img, _ = read_image_with_metadata(file_path)
            
            # Execute pipeline
            result_image, exec_result = job.pipeline.execute(img)
            
            if exec_result.errors:
                job.errors.extend(exec_result.errors)
            
            # Save result
            output_path = job.output_folder / f"processed_{filename}"
            
            # Convert to saveable format
            # Handle bit depth normalization
            if result_image.dtype != np.uint8:
                if result_image.dtype == np.uint16:
                    result_image = (result_image / 256).astype(np.uint8)
                elif result_image.dtype in [np.float32, np.float64]:
                    result_image = (result_image * 255).clip(0, 255).astype(np.uint8)
            
            # Convert RGB to BGR for saving
            if len(result_image.shape) == 3:
                save_image = cv2.cvtColor(result_image, cv2.COLOR_RGB2BGR)
            else:
                save_image = result_image
            
            cv2.imwrite(str(output_path), save_image)
            job.processed += 1
            
        except Exception as e:
            error_msg = f"Error processing {filename}: {str(e)}"
            job.errors.append(error_msg)
            job.failed += 1
        
        # Broadcast progress
        await broadcast_progress(job.get_progress_message(filename))
        
        # Small delay to allow WebSocket updates
        await asyncio.sleep(0.01)
    
    # Finalize
    job.end_time = time.time()
    job.status = "completed" if job.failed == 0 else "failed" if job.processed == 0 else "completed"
    
    await broadcast_progress(job.get_progress_message())


@router.post("/run", response_model=Dict[str, str])
async def start_batch_run(request: BatchRunRequest, background_tasks: BackgroundTasks):
    """
    Start a batch processing job.
    
    Returns immediately with a job_id. Progress is sent via WebSocket.
    """
    # Validate pipeline
    pipeline = Pipeline(request.pipeline_steps)
    is_valid, errors = pipeline.validate()
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline: {errors}")
    
    # Validate images exist
    source_paths = []
    
    if request.input_folder:
        input_path = Path(request.input_folder)
        if not input_path.exists():
            raise HTTPException(status_code=404, detail=f"Input folder not found: {request.input_folder}")
        
        # Scan for images
        extensions = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'}
        source_paths = [
            p for p in input_path.iterdir() 
            if p.is_file() and p.suffix.lower() in extensions
        ]
        
        if not source_paths:
            raise HTTPException(status_code=404, detail=f"No compatible images found in {request.input_folder}")
            
    elif request.source_image_ids:
        missing = [id for id in request.source_image_ids if id not in image_cache]
        if missing:
            raise HTTPException(status_code=404, detail=f"Images not found: {missing}")
    else:
        raise HTTPException(status_code=400, detail="Must provide either input_folder or source_image_ids")
    
    # Create job
    job_id = str(uuid.uuid4())
    output_folder = Path(request.output_folder)
    
    job = BatchJob(
        job_id=job_id,
        source_image_ids=request.source_image_ids,
        pipeline=pipeline,
        output_folder=output_folder,
        source_paths=source_paths
    )
    
    batch_jobs[job_id] = job
    
    # Start background task
    background_tasks.add_task(run_batch_job, job)
    
    return {"job_id": job_id, "status": "started"}


@router.get("/{job_id}", response_model=BatchJobResult)
async def get_batch_status(job_id: str):
    """Get the current status of a batch job."""
    job = batch_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job.get_result()


@router.post("/{job_id}/cancel")
async def cancel_batch_job(job_id: str):
    """Cancel a running batch job."""
    job = batch_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.cancelled = True
    return {"status": "cancellation_requested"}


@router.websocket("/ws/progress")
async def batch_progress_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time batch progress updates.
    
    Clients connect here to receive BatchProgressMessage updates.
    """
    await websocket.accept()
    websocket_connections.append(websocket)
    
    try:
        # Keep connection alive
        while True:
            # Wait for any message (ping/pong or close)
            data = await websocket.receive_text()
            
            # Client can send "status" to get current job statuses
            if data == "status":
                active_jobs = [
                    job.get_progress_message().model_dump()
                    for job in batch_jobs.values()
                    if job.status in ["pending", "processing"]
                ]
                await websocket.send_json({"active_jobs": active_jobs})
                
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
