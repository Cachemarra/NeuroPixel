"""
Plugin API endpoints
"""
import uuid
from typing import Any, Dict
from pathlib import Path

import numpy as np
import cv2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.plugin_spec import PluginSpec, PluginRunRequest, PluginRunResponse
from app.plugins.manager import plugin_manager
from app.api.images import image_cache, UPLOAD_DIR, convert_to_display_png


router = APIRouter(prefix="/plugins", tags=["plugins"])


class PluginListResponse(BaseModel):
    """Response containing all available plugins."""
    plugins: list[PluginSpec]
    categories: Dict[str, list[str]]  # category -> list of plugin names


class PluginCategoriesResponse(BaseModel):
    """Response containing plugins grouped by category."""
    categories: Dict[str, list[PluginSpec]]


@router.get("", response_model=PluginListResponse)
async def list_plugins():
    """
    Get list of all available plugins and their specifications.
    Used by the frontend to auto-generate UI controls.
    """
    specs = plugin_manager.get_all_specs()
    
    # Build category index
    categories: Dict[str, list[str]] = {}
    for spec in specs:
        if spec.category not in categories:
            categories[spec.category] = []
        categories[spec.category].append(spec.name)
    
    return PluginListResponse(plugins=specs, categories=categories)


@router.get("/categories", response_model=PluginCategoriesResponse)
async def list_plugins_by_category():
    """Get plugins grouped by category."""
    return PluginCategoriesResponse(
        categories=plugin_manager.get_specs_by_category()
    )


@router.get("/{plugin_name}", response_model=PluginSpec)
async def get_plugin_spec(plugin_name: str):
    """Get specification for a specific plugin."""
    spec = plugin_manager.get_spec(plugin_name)
    if spec is None:
        raise HTTPException(status_code=404, detail=f"Plugin not found: {plugin_name}")
    return spec


@router.post("/run", response_model=PluginRunResponse)
async def run_plugin(request: PluginRunRequest):
    """
    Execute a plugin on an image.
    
    The processed result is saved as a new image and its ID/URL is returned.
    """
    # Validate plugin exists
    plugin = plugin_manager.get_plugin(request.plugin_name)
    if plugin is None:
        raise HTTPException(
            status_code=404,
            detail=f"Plugin not found: {request.plugin_name}"
        )
    
    # Validate source image exists
    if request.image_id not in image_cache:
        raise HTTPException(
            status_code=404,
            detail=f"Source image not found: {request.image_id}"
        )
    
    source_entry = image_cache[request.image_id]
    source_image = source_entry.get("image")
    
    # Reload from disk if not in memory
    if source_image is None:
        source_path = source_entry["path"]
        if not source_path.exists():
            raise HTTPException(status_code=404, detail="Source image file not found")
        
        # Load from disk and convert to RGB
        source_image_bgr = cv2.imread(str(source_path), cv2.IMREAD_UNCHANGED)
        if source_image_bgr is None:
            raise HTTPException(status_code=500, detail="Failed to read source image")
        
        if len(source_image_bgr.shape) == 3:
            source_image = cv2.cvtColor(source_image_bgr, cv2.COLOR_BGR2RGB)
        else:
            source_image = source_image_bgr
    
    try:
        # Execute the plugin
        result_image, execution_time = plugin_manager.execute(
            request.plugin_name,
            source_image,
            request.params
        )
        
        # Generate new ID for result
        result_id = str(uuid.uuid4())
        
        # Save result to disk
        result_path = UPLOAD_DIR / f"{result_id}_processed.png"
        
        # Convert RGB (internal) to BGR for cv2.imwrite
        if len(result_image.shape) == 3:
            save_image = cv2.cvtColor(result_image, cv2.COLOR_RGB2BGR)
        else:
            save_image = result_image
        
        cv2.imwrite(str(result_path), save_image)
        
        # Store in cache
        from app.api.images import ImageMetadata
        
        h, w = result_image.shape[:2]
        channels = result_image.shape[2] if len(result_image.shape) == 3 else 1
        
        image_cache[result_id] = {
            "path": result_path,
            "original_name": f"{Path(source_entry['original_name']).stem}_{request.plugin_name}.png",
            "metadata": ImageMetadata(
                width=w,
                height=h,
                channels=channels,
                bit_depth="8-bit",
                file_size=result_path.stat().st_size
            ),
            "image": result_image,
            "source_id": request.image_id,
            "plugin_name": request.plugin_name,
            "params": request.params,
        }
        
        return PluginRunResponse(
            success=True,
            result_id=result_id,
            result_url=f"http://localhost:8005/images/{result_id}/preview",
            thumbnail_url=f"http://localhost:8005/images/{result_id}/thumbnail",
            execution_time_ms=execution_time,
            plugin_name=request.plugin_name,
            params_used=request.params,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Plugin execution failed: {str(e)}"
        )
