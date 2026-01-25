"""
Image upload and preview API endpoints
"""
import uuid
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

# Create router
router = APIRouter(prefix="/images", tags=["images"])

# Storage for uploaded images (in-memory cache + disk)
UPLOAD_DIR = Path("/tmp/neuropixel_uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory image cache: id -> {path, metadata, original_name, source_id, ...}
image_cache: Dict[str, Dict[str, Any]] = {}


class ImageMetadata(BaseModel):
    width: int
    height: int
    channels: int
    bit_depth: str
    file_size: int


class UploadResponse(BaseModel):
    id: str
    name: str
    url: str
    thumbnail_url: str
    metadata: ImageMetadata
    source_id: Optional[str] = None


def get_bit_depth_string(dtype) -> str:
    """Convert numpy dtype to human-readable bit depth string."""
    dtype_map = {
        np.uint8: "8-bit",
        np.uint16: "16-bit",
        np.float32: "32-bit Float",
        np.float64: "64-bit Float",
    }
    return dtype_map.get(dtype.type, str(dtype))


def read_image_with_metadata(file_path: Path) -> tuple[np.ndarray, ImageMetadata]:
    """Read image and extract metadata using OpenCV or tifffile."""
    file_ext = file_path.suffix.lower()
    
    # Try tifffile for TIFF files (better 16-bit support)
    if file_ext in ['.tif', '.tiff']:
        try:
            import tifffile
            img = tifffile.imread(str(file_path))
        except Exception:
            img = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
    else:
        # Use OpenCV for other formats
        img = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
    
    if img is None:
        raise ValueError("Could not read image file")
    
    # Get dimensions
    if len(img.shape) == 2:
        height, width = img.shape
        channels = 1
    else:
        height, width, channels = img.shape
    
    metadata = ImageMetadata(
        width=width,
        height=height,
        channels=channels,
        bit_depth=get_bit_depth_string(img.dtype),
        file_size=file_path.stat().st_size
    )
    
    return img, metadata


def convert_to_display_png(img: np.ndarray) -> bytes:
    """Convert image to 8-bit PNG for browser display."""
    # Handle different bit depths
    if img.dtype == np.uint16:
        # Normalize 16-bit to 8-bit
        img_8bit = (img / 256).astype(np.uint8)
    elif img.dtype in [np.float32, np.float64]:
        # Normalize float to 8-bit (assuming 0-1 range or auto-scale)
        img_min, img_max = img.min(), img.max()
        if img_max > img_min:
            img_8bit = ((img - img_min) / (img_max - img_min) * 255).astype(np.uint8)
        else:
            img_8bit = np.zeros_like(img, dtype=np.uint8)
    else:
        img_8bit = img.astype(np.uint8)
    
    # Convert grayscale to BGR for PNG encoding if needed
    if len(img_8bit.shape) == 2:
        img_8bit = cv2.cvtColor(img_8bit, cv2.COLOR_GRAY2BGR)
    elif img_8bit.shape[2] == 4:
        # RGBA to BGR
        img_8bit = cv2.cvtColor(img_8bit, cv2.COLOR_RGBA2BGR)
    
    # Encode as PNG
    success, buffer = cv2.imencode('.png', img_8bit)
    if not success:
        raise ValueError("Failed to encode image as PNG")
    
    return buffer.tobytes()


@router.get("", response_model=List[UploadResponse])
async def list_images():
    """
    Get list of all uploaded and processed images.
    Used to populate the file explorer on startup/refresh.
    """
    results = []
    for image_id, entry in image_cache.items():
        results.append(UploadResponse(
            id=image_id,
            name=entry["original_name"],
            url=f"http://localhost:8000/images/{image_id}/preview",
            thumbnail_url=f"http://localhost:8000/images/{image_id}/thumbnail",
            metadata=entry["metadata"],
            source_id=entry.get("source_id")
        ))
    return results


@router.post("/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file for analysis.
    Supports: PNG, JPG, TIFF (8/16/32-bit)
    """
    # Validate file type
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.raw'}
    file_ext = Path(file.filename or "image.png").suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}"
        )
    
    # Generate unique ID
    image_id = str(uuid.uuid4())
    
    # Save file to disk
    file_path = UPLOAD_DIR / f"{image_id}{file_ext}"
    
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Read image and extract metadata
        img, metadata = read_image_with_metadata(file_path)
        
        # Store in cache
        image_cache[image_id] = {
            "path": file_path,
            "original_name": file.filename,
            "metadata": metadata,
            "image": img  # Keep in memory for fast preview
        }
        
        return UploadResponse(
            id=image_id,
            name=file.filename or "image",
            url=f"http://localhost:8000/images/{image_id}/preview",
            thumbnail_url=f"http://localhost:8000/images/{image_id}/thumbnail",
            metadata=metadata
        )
        
    except Exception as e:
        # Clean up on failure
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


@router.get("/{image_id}/preview")
async def get_image_preview(image_id: str):
    """
    Get the full-resolution preview of an uploaded image.
    Converts 16-bit/float to 8-bit PNG for browser compatibility.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache[image_id]
    img = cache_entry.get("image")
    
    # If not in memory, reload from disk
    if img is None:
        file_path = cache_entry["path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        img, _ = read_image_with_metadata(file_path)
    
    # Convert to displayable PNG
    png_bytes = convert_to_display_png(img)
    
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{image_id}/thumbnail")
async def get_image_thumbnail(image_id: str, size: int = 80):
    """
    Get a thumbnail of the image for the file explorer.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache[image_id]
    img = cache_entry.get("image")
    
    # If not in memory, reload from disk
    if img is None:
        file_path = cache_entry["path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        img, _ = read_image_with_metadata(file_path)
    
    # Resize for thumbnail
    h, w = img.shape[:2]
    scale = size / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    # Convert to displayable PNG
    png_bytes = convert_to_display_png(resized)
    
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{image_id}/metadata")
async def get_image_metadata(image_id: str):
    """
    Get metadata for an uploaded image.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache[image_id]
    return {
        "id": image_id,
        "name": cache_entry["original_name"],
        "metadata": cache_entry["metadata"],
        "source_id": cache_entry.get("source_id")
    }


@router.delete("/{image_id}")
async def delete_image(image_id: str):
    """
    Delete an uploaded image.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache.pop(image_id)
    file_path = cache_entry["path"]
    
    if file_path.exists():
        file_path.unlink()
    
    return {"status": "deleted", "id": image_id}
