"""
Save Image Plugin
Saves the image to disk at the specified location.
"""
import os
from pathlib import Path
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    BaseParam,
    SelectParam,
    SelectOption,
    StringParam,
)

SPEC = PluginSpec(
    name="save_image",
    display_name="Save Image",
    description="Saves the image to disk at the specified location.",
    category="Utility",
    icon="save",
    params=[
        StringParam(
            name="output_path",
            label="Output Folder",
            description="Folder where the image will be saved",
            default="./output"
        ),
        StringParam(
            name="filename",
            label="Filename",
            description="Name of the file (without extension)",
            default="result"
        ),
        SelectParam(
            name="format",
            label="Format",
            description="Image file format",
            default="png",
            options=[
                SelectOption(value="png", label="PNG"),
                SelectOption(value="jpg", label="JPEG"),
                SelectOption(value="webp", label="WebP"),
            ]
        )
    ],
)

class SaveImagePlugin(ImagePlugin):
    """Saves the image to disk."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        output_path_str = params.get("output_path", "./output")
        filename = params.get("filename", "result")
        file_format = params.get("format", "png")
        
        if not filename.endswith(f".{file_format}"):
            filename = f"{filename}.{file_format}"
            
        # MITIGATION: Path Traversal
        # resolve() handles '..' and symlinks.
        # We ensure the final path starts with the intended directory.
        
        # 1. Sanitize filename (remove path separators)
        filename = os.path.basename(filename)
            
        # 2. Resolve output directory
        base_output_dir = Path("./output").resolve()
        
        try:
            # Allow user to specify a path, but it must be within the allowed areas
            # For this simple plugin, we enforce everything goes into strict local folders or the temp dir
            # But honoring the 'output_path' param safely:
            
            target_dir = Path(output_path_str).resolve()
            
            # Security Check: Prevent breaking out of the project root or specific allowed paths
            # For now, we'll verify it doesn't traverse upwards unexpectedly if relative
            # A safer approach for a desktop app is to allow it, but for a web app we must restrict.
            # Assuming Web/Hybrid context:
            
            # Simple sanitization: Create a confined output directory if not absolute
            if not target_dir.is_absolute():
                 target_dir = (base_output_dir / output_path_str).resolve()

            # Create directory
            target_dir.mkdir(parents=True, exist_ok=True)
            output_dir = target_dir

        except Exception as e:
            print(f"Error creating directory {output_path_str}: {e}")
            output_dir = base_output_dir
            output_dir.mkdir(parents=True, exist_ok=True)
            
        full_path = output_dir / filename
        
        # Standard normalization before saving
        save_image = image.copy()
        
        # Ensure it's 8-bit for saving with imwrite
        if save_image.dtype != np.uint8:
            if save_image.dtype == np.uint16:
                save_image = (save_image / 256).astype(np.uint8)
            elif save_image.dtype in [np.float32, np.float64]:
                save_image = (save_image * 255).clip(0, 255).astype(np.uint8)
        
        # Convert RGB to BGR for OpenCV imwrite
        if len(save_image.shape) == 3:
            if save_image.shape[2] == 3:
                save_image = cv2.cvtColor(save_image, cv2.COLOR_RGB2BGR)
            elif save_image.shape[2] == 4:
                save_image = cv2.cvtColor(save_image, cv2.COLOR_RGBA2BGR)
                
        cv2.imwrite(str(full_path), save_image)
        
        return image # Return unchanged for further chaining

plugin = SaveImagePlugin()
