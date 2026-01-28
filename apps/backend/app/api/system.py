"""
System API
Provides system-level functionality like device listing and folder operations.
"""
import os
import platform
import subprocess
from pathlib import Path
from typing import List, Literal, Optional

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



class FileEntry(BaseModel):
    name: str
    path: str
    is_dir: bool

class BrowseResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    entries: List[FileEntry]

@router.post("/browse", response_model=BrowseResponse)
async def browse_folder(path: str = None):
    """
    List contents of a directory for the folder picker.
    """
    if path is None or not path.strip():
        path = str(Path.home())
    
    current = Path(path).resolve()
    if not current.exists() or not current.is_dir():
        # Fallback to home if invalid
        current = Path.home()
        
    entries = []
    
    # List directories first, then files (optional, maybe just dirs for folder picker)
    # The user wants to select a FOLDER, so we mainly care about dirs
    try:
        for p in current.iterdir():
            if p.is_dir() and not p.name.startswith('.'):
                 entries.append(FileEntry(name=p.name, path=str(p), is_dir=True))
    except Exception:
        pass # Ignore permission errors
        
    # Sort by name
    entries.sort(key=lambda x: x.name.lower())
    
    return BrowseResponse(
        current_path=str(current),
        parent_path=str(current.parent) if current.parent != current else None,
        entries=entries
    )

class ReloadPluginsResponse(BaseModel):
    """Response from plugin reload."""
    success: bool
    plugins_loaded: int

@router.post("/reload-plugins", response_model=ReloadPluginsResponse)
async def reload_plugins():
    """Reload all plugins from the plugins directory."""
    from app.plugins.manager import initialize_plugins, plugin_manager
    
    count = initialize_plugins()
    
    return ReloadPluginsResponse(
        success=True,
        plugins_loaded=count
    )
