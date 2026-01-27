"""
System API
Provides system-level functionality like device listing and folder operations.
"""
import os
import platform
import subprocess
from pathlib import Path
from typing import List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/system", tags=["system"])


class ComputeDevice(BaseModel):
    """Represents a compute device (CPU or GPU)."""
    id: str
    name: str
    type: Literal["cpu", "gpu"]
    is_active: bool = False


class DeviceListResponse(BaseModel):
    """Response containing available compute devices."""
    devices: List[ComputeDevice]
    active_device: str


def get_compute_devices() -> List[ComputeDevice]:
    """Detect available compute devices."""
    devices = [
        ComputeDevice(
            id="cpu",
            name="CPU",
            type="cpu",
            is_active=True  # CPU is always available
        )
    ]
    
    # Try to detect NVIDIA GPUs using nvidia-smi
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,index", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line.strip():
                    parts = line.split(',')
                    if len(parts) >= 2:
                        name = parts[0].strip()
                        idx = parts[1].strip()
                        devices.append(ComputeDevice(
                            id=f"gpu:{idx}",
                            name=f"GPU: {name}",
                            type="gpu",
                            is_active=False
                        ))
    except (FileNotFoundError, subprocess.TimeoutExpired):
        # nvidia-smi not available
        pass
    
    return devices


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices():
    """List all available compute devices (CPU and GPUs)."""
    devices = get_compute_devices()
    active = next((d.id for d in devices if d.is_active), "cpu")
    return DeviceListResponse(devices=devices, active_device=active)


@router.post("/open-folder")
async def open_folder(folder_path: str = None):
    """
    Open a folder in the system's file manager.
    If no path provided, opens the plugins folder.
    """
    if folder_path is None:
        # Default to plugins folder
        folder_path = str(Path(__file__).parent.parent / "plugins" / "library")
    
    path = Path(folder_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Folder not found: {folder_path}")
    
    system = platform.system()
    
    try:
        if system == "Windows":
            os.startfile(str(path))  # type: ignore
        elif system == "Darwin":  # macOS
            subprocess.Popen(["open", str(path)])
        else:  # Linux and others
            subprocess.Popen(["xdg-open", str(path)])
        
        return {"success": True, "path": str(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open folder: {str(e)}")


class ReloadPluginsResponse(BaseModel):
    """Response from plugin reload."""
    success: bool
    plugins_loaded: int


@router.post("/reload-plugins", response_model=ReloadPluginsResponse)
async def reload_plugins():
    """Reload all plugins from the plugins directory."""
    from app.plugins.manager import initialize_plugins, plugin_manager
    
    initialize_plugins()
    
    return ReloadPluginsResponse(
        success=True,
        plugins_loaded=len(plugin_manager.get_all_plugins())
    )
