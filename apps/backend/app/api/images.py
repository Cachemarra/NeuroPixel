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
from skimage.metrics import structural_similarity as ssim

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
        # Use PIL for other formats to handle EXIF orientation
        try:
            from PIL import Image, ImageOps
            with Image.open(file_path) as pil_img:
                # Apply EXIF transpose (rotation)
                pil_img = ImageOps.exif_transpose(pil_img)
                
                # Convert to numpy array (RGB -> BGR for OpenCV)
                img_rgb = np.array(pil_img)
                
                # Handle grayscale
                if len(img_rgb.shape) == 2:
                    img = img_rgb
                # Handle RGBA
                elif img_rgb.shape[2] == 4:
                    img = cv2.cvtColor(img_rgb, cv2.COLOR_RGBA2BGRA)
                # Handle RGB
                else:
                    img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                    
        except ImportError:
            # Fallback if PIL not installed
            img = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
        except Exception:
             # Fallback on other errors
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


@router.get("/{image_id}/histogram")
async def get_image_histogram(image_id: str, bins: int = 256):
    """
    Get histogram data for an image.
    Returns histogram values for each channel.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache[image_id]
    img = cache_entry.get("image")
    
    # Reload from disk if needed
    if img is None:
        file_path = cache_entry["path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        img, _ = read_image_with_metadata(file_path)
    
    histograms = {}
    
    if len(img.shape) == 2:
        # Grayscale
        hist = cv2.calcHist([img], [0], None, [bins], [0, 256])
        histograms["gray"] = hist.flatten().tolist()
    else:
        # Color image (BGR)
        channel_names = ["blue", "green", "red"]
        for i, name in enumerate(channel_names):
            hist = cv2.calcHist([img], [i], None, [bins], [0, 256])
            histograms[name] = hist.flatten().tolist()
    
    return {
        "bins": bins,
        "channels": histograms
    }


@router.get("/{image_id}/statistics")
async def get_image_statistics(image_id: str):
    """
    Get statistical metrics for an image.
    """
    if image_id not in image_cache:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cache_entry = image_cache[image_id]
    img = cache_entry.get("image")
    
    # Reload from disk if needed
    if img is None:
        file_path = cache_entry["path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        img, _ = read_image_with_metadata(file_path)
    
    # Convert to float for calculations
    img_float = img.astype(np.float64)
    
    # Overall statistics
    mean_val = float(np.mean(img_float))
    std_val = float(np.std(img_float))
    min_val = float(np.min(img_float))
    max_val = float(np.max(img_float))
    
    # Calculate entropy (measure of randomness)
    # Use grayscale for entropy
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.flatten()
    hist = hist[hist > 0]  # Remove zeros
    prob = hist / hist.sum()
    entropy = float(-np.sum(prob * np.log2(prob)))
    
    # Calculate skewness and kurtosis
    if std_val > 0:
        skewness = float(np.mean(((img_float - mean_val) / std_val) ** 3))
        kurtosis = float(np.mean(((img_float - mean_val) / std_val) ** 4) - 3)
    else:
        skewness = 0.0
        kurtosis = 0.0
    
    # Per-channel statistics if color
    channel_stats = {}
    if len(img.shape) == 3:
        channel_names = ["blue", "green", "red"]
        for i, name in enumerate(channel_names):
            channel = img_float[:, :, i]
            channel_stats[name] = {
                "mean": float(np.mean(channel)),
                "std": float(np.std(channel)),
                "min": float(np.min(channel)),
                "max": float(np.max(channel)),
            }
    
    return {
        "mean": round(mean_val, 2),
        "std": round(std_val, 2),
        "min": min_val,
        "max": max_val,
        "entropy": round(entropy, 2),
        "skewness": round(skewness, 2),
        "kurtosis": round(kurtosis, 2),
        "channels": channel_stats if channel_stats else None
    }


@router.get("/compare/{id_a}/{id_b}")
async def compare_images(id_a: str, id_b: str):
    """
    Compare two images and return similarity metrics (SSIM, PSNR, MSE).
    Image A is treated as the reference.
    """
    if id_a not in image_cache or id_b not in image_cache:
        raise HTTPException(status_code=404, detail="One or both images not found")

    # Helper to get image data
    def get_img(img_id):
        entry = image_cache[img_id]
        img = entry.get("image")
        if img is None:
            file_path = entry["path"]
            if not file_path.exists():
                raise HTTPException(status_code=404, detail=f"Image file for {img_id} not found")
            img, _ = read_image_with_metadata(file_path)
        return img

    img_a = get_img(id_a)
    img_b = get_img(id_b)

    # Ensure dimensions match by resizing B to A
    if img_a.shape != img_b.shape:
        h, w = img_a.shape[:2]
        img_b = cv2.resize(img_b, (w, h), interpolation=cv2.INTER_LINEAR)

    # Convert to float64 for calculation to avoid overflow/underflow
    a_f = img_a.astype(np.float64)
    b_f = img_b.astype(np.float64)

    # Determine max pixel value based on bit depth of A
    if img_a.dtype == np.uint8:
        max_val = 255.0
    elif img_a.dtype == np.uint16:
        max_val = 65535.0
    else:
        # Float images, assume 0-1 or find max
        max_val = max(1.0, np.max(a_f))

    # MSE
    mse = np.mean((a_f - b_f) ** 2)

    # PSNR
    if mse == 0:
        psnr = float('inf')
    else:
        psnr = 20 * np.log10(max_val / np.sqrt(mse))

    # SSIM
    # Handle channel axis
    channel_axis = 2 if len(img_a.shape) == 3 else None
    
    # Determine window size (must be odd and <= min dimension)
    min_dim = min(img_a.shape[0], img_a.shape[1])
    win_size = min(7, min_dim)
    if win_size % 2 == 0:
        win_size -= 1
        
    try:
        # SSIM expects data_range to be specified for float data
        ssim_val = ssim(
            a_f, 
            b_f, 
            data_range=max_val,
            channel_axis=channel_axis,
            win_size=win_size
        )
    except Exception as e:
        print(f"SSIM calculation failed: {e}")
        ssim_val = 0.0

    return {
        "ssim": float(ssim_val),
        "psnr": float(psnr),
        "mse": float(mse)
    }
