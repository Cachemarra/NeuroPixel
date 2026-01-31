"""
Save Batch Images Plugin
Saves the image to disk at the specified location, ensuring file names are unique (no overwrite).
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
    name="save_batch",
    display_name="Save Batch Images",
    description="Saves images to disk without overwriting existing files.",
    category="Utility",
    icon="snippet_folder",
    params=[
        StringParam(
            name="output_folder",
            label="Output Folder",
            description="Folder where the image will be saved",
            default="./output"
        ),
        StringParam(
            name="filename_prefix",
            label="Filename Prefix",
            description="Prefix for the file name. If empty, uses original name.",
            default=""
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

class SaveBatchPlugin(ImagePlugin):
    """Saves the image to disk with collision detection."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        output_folder_str = params.get("output_folder", "./output")
        prefix = params.get("filename_prefix", "")
        file_format = params.get("format", "png")
        
        original_filename = kwargs.get("original_filename")
        if original_filename:
             base_name = Path(original_filename).stem
        else:
             base_name = "image"
             
        if prefix:
            filename_base = f"{prefix}_{base_name}"
        else:
            filename_base = base_name
            
        # Resolve output directory
        try:
            target_dir = Path(output_folder_str).resolve()
            base_output_dir = Path("./output").resolve()
            
            if not target_dir.is_absolute():
                 target_dir = (base_output_dir / output_folder_str).resolve()

            target_dir.mkdir(parents=True, exist_ok=True)
            output_dir = target_dir
        except Exception as e:
            print(f"Error creating directory {output_folder_str}: {e}")
            output_dir = Path("./output").resolve()
            output_dir.mkdir(parents=True, exist_ok=True)
            
        # Collision detection loop
        counter = 0
        final_path = None
        
        # Try finding a unique name
        # If counter == 0, try "name.png"
        # If exists, try "name_1.png", etc.
        while True:
            suffix_str = f"_{counter}" if counter > 0 else ""
            candidate_name = f"{filename_base}{suffix_str}.{file_format}"
            candidate_path = output_dir / candidate_name
            
            if not candidate_path.exists():
                final_path = candidate_path
                break
            counter += 1
        
        # Save image
        save_image = image.copy()
        
        # Bit depth normalization
        if save_image.dtype != np.uint8:
            if save_image.dtype == np.uint16:
                save_image = (save_image / 256).astype(np.uint8)
            elif save_image.dtype in [np.float32, np.float64]:
                save_image = (save_image * 255).clip(0, 255).astype(np.uint8)
        
        # Color space
        if len(save_image.shape) == 3:
            if save_image.shape[2] == 3:
                save_image = cv2.cvtColor(save_image, cv2.COLOR_RGB2BGR)
            elif save_image.shape[2] == 4:
                save_image = cv2.cvtColor(save_image, cv2.COLOR_RGBA2BGR)
                
        cv2.imwrite(str(final_path), save_image)
        
        return image

plugin = SaveBatchPlugin()
