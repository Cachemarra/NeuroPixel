"""
Laplacian Sharpenimg Plugin
Uses the Laplacian operator to enhance edges.
"""
import numpy as np
import cv2
from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
    SelectParam,
    SelectOption,
)

SPEC = PluginSpec(
    name="laplacian_sharpening",
    display_name="Laplacian Sharpening",
    description="Sharpens image using Laplacian edge enhancement.",
    category="Enhancement",
    icon="filter_hdr",
    params=[
        FloatParam(
            name="strength",
            label="Strength",
            description="How much to enhance edges",
            default=0.5,
            min=0.1,
            max=2.0,
            step=0.1,
        ),
        SelectParam(
            name="kernel_size",
            label="Kernel Size",
            description="Size of the Laplacian kernel",
            default="3",
            options=[
                SelectOption(value="1", label="1x1"),
                SelectOption(value="3", label="3x3"),
                SelectOption(value="5", label="5x5"),
            ],
        ),
    ],
)


class LaplacianPlugin(ImagePlugin):
    """Laplacian sharpening implementation."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        strength = params.get("strength", 0.5)
        k_size_str = params.get("kernel_size", "3")
        kernel_size = int(k_size_str)
        
        # Convert to float
        if image.dtype == np.uint8:
            img_f = image.astype(np.float64) / 255.0
            max_val = 1.0
        elif image.dtype == np.uint16:
            img_f = image.astype(np.float64) / 65535.0
            max_val = 1.0
        else:
            img_f = image.astype(np.float64)
            max_val = np.max(image) if np.max(image) > 1.0 else 1.0
            
        # Helper for single channel processing
        def process_channel(chan):
            laplacian = cv2.Laplacian(chan, cv2.CV_64F, ksize=kernel_size)
            # Subtract Laplacian (finding edges) to sharpen
            # Note: Laplacian kernel typically has a positive center and negative surroundings 
            # or negative center and positive surroundings. 
            # cv2.Laplacian standard behavior: subtracting it adds edges back.
            sharpened = chan - (strength * laplacian)
            return sharpened

        if len(image.shape) == 3:
            # Process each channel
            channels = cv2.split(img_f)
            processed = [process_channel(c) for c in channels]
            merged = cv2.merge(processed)
        else:
            merged = process_channel(img_f)
            
        # Clip and convert back
        merged = np.clip(merged, 0, max_val)
        
        if image.dtype == np.uint8:
            return (merged * 255).astype(np.uint8)
        elif image.dtype == np.uint16:
            return (merged * 65535).astype(np.uint16)
        else:
            return merged.astype(image.dtype)


plugin = LaplacianPlugin()
