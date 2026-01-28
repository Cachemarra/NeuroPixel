"""
Sharpen Plugin
Sharpen images using various methods.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
    SelectParam,
)


SPEC = PluginSpec(
    name="sharpen",
    display_name="Sharpen",
    description="Sharpen image details",
    category="Enhancement",
    icon="sharpness",
    params=[
        FloatParam(
            name="amount",
            label="Amount",
            description="Sharpening strength (0-200%)",
            default=100.0,
            min=0.0,
            max=200.0,
            step=10.0,
        ),
        FloatParam(
            name="radius",
            label="Radius",
            description="Sharpening radius (0.5-5.0)",
            default=1.0,
            min=0.5,
            max=5.0,
            step=0.5,
        ),
        SelectParam(
            name="method",
            label="Method",
            description="Sharpening method",
            default="unsharp",
            options=[
                {"value": "unsharp", "label": "Unsharp Mask"},
                {"value": "laplacian", "label": "Laplacian"},
                {"value": "highpass", "label": "High Pass"},
            ],
        ),
    ],
)


class SharpenPlugin(ImagePlugin):
    """Image sharpening plugin."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        amount = params.get("amount", 100.0) / 100.0
        radius = params.get("radius", 1.0)
        method = params.get("method", "unsharp")
        
        if amount == 0:
            return image
        
        if method == "unsharp":
            # Unsharp mask: sharp = original + amount * (original - blurred)
            kernel_size = int(radius * 2) * 2 + 1  # Ensure odd
            blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), radius)
            sharpened = cv2.addWeighted(image, 1 + amount, blurred, -amount, 0)
            return sharpened
            
        elif method == "laplacian":
            # Laplacian sharpening
            laplacian = cv2.Laplacian(image, cv2.CV_64F)
            sharpened = image.astype(np.float64) - amount * laplacian
            return np.clip(sharpened, 0, 255).astype(np.uint8)
            
        elif method == "highpass":
            # High pass sharpening
            kernel_size = int(radius * 4) * 2 + 1
            blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
            highpass = cv2.subtract(image, blurred)
            sharpened = cv2.addWeighted(image, 1, highpass, amount, 0)
            return sharpened
        
        return image


plugin = SharpenPlugin()
