"""
Crop Plugin
Crop images with various options.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    IntParam,
    SelectParam,
)


SPEC = PluginSpec(
    name="crop",
    display_name="Crop",
    description="Crop image to specified region",
    category="Transform",
    icon="crop",
    params=[
        IntParam(
            name="left",
            label="Left",
            description="Pixels to crop from left",
            default=0,
            min=0,
            max=4096,
            step=1,
        ),
        IntParam(
            name="top",
            label="Top",
            description="Pixels to crop from top",
            default=0,
            min=0,
            max=4096,
            step=1,
        ),
        IntParam(
            name="right",
            label="Right",
            description="Pixels to crop from right",
            default=0,
            min=0,
            max=4096,
            step=1,
        ),
        IntParam(
            name="bottom",
            label="Bottom",
            description="Pixels to crop from bottom",
            default=0,
            min=0,
            max=4096,
            step=1,
        ),
        SelectParam(
            name="mode",
            label="Crop Mode",
            description="How to interpret crop values",
            default="margins",
            options=[
                {"value": "margins", "label": "Margins (crop amount)"},
                {"value": "percentage", "label": "Percentage (% to remove)"},
            ],
        ),
    ],
)


class CropPlugin(ImagePlugin):
    """Image cropping plugin."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        left = params.get("left", 0)
        top = params.get("top", 0)
        right = params.get("right", 0)
        bottom = params.get("bottom", 0)
        mode = params.get("mode", "margins")
        
        h, w = image.shape[:2]
        
        if mode == "percentage":
            # Convert percentage to pixels
            left = int(w * left / 100)
            right = int(w * right / 100)
            top = int(h * top / 100)
            bottom = int(h * bottom / 100)
        
        # Calculate crop region
        x1 = max(0, left)
        y1 = max(0, top)
        x2 = max(x1 + 1, w - right)  # Ensure at least 1 pixel width
        y2 = max(y1 + 1, h - bottom)  # Ensure at least 1 pixel height
        
        return image[y1:y2, x1:x2]


plugin = CropPlugin()
