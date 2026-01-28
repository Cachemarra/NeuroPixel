"""
Unsharp Mask Plugin
Enhances edges by subtracting a blurred version from the original.
"""
import numpy as np
import cv2
from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
    IntParam,
)

SPEC = PluginSpec(
    name="unsharp_mask",
    display_name="Unsharp Mask",
    description="Sharpens image by enhancing edge contrast using Gaussian blur subtraction.",
    category="Enhancement",
    icon="blur_off",
    params=[
        FloatParam(
            name="strength",
            label="Strength",
            description="Sharpening intensity (0.5 = subtle, 3.0 = strong)",
            default=1.0,
            min=0.1,
            max=3.0,
            step=0.1,
        ),
        FloatParam(
            name="radius",
            label="Radius",
            description="Blur radius for the unsharp mask",
            default=1.0,
            min=0.1,
            max=5.0,
            step=0.1,
        ),
        IntParam(
            name="threshold",
            label="Threshold",
            description="Minimum brightness change for sharpening to apply",
            default=0,
            min=0,
            max=50,
            step=1,
        ),
    ],
)


class UnsharpMaskPlugin(ImagePlugin):
    """Unsharp Mask implementation."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        strength = params.get("strength", 1.0)
        radius = params.get("radius", 1.0)
        threshold = params.get("threshold", 0)
        
        # Create Gaussian blur
        # Kernel size usually derived from radius (sigma). 
        # OpenCV uses sigmaX=radius. Kernel size (0,0) lets OpenCV compute it.
        blurred = cv2.GaussianBlur(image, (0, 0), radius)
        
        # Convert to float for calculation
        img_f = image.astype(np.float32)
        blur_f = blurred.astype(np.float32)
        
        # Calculate comparison mask if threshold > 0
        if threshold > 0:
            diff = np.abs(img_f - blur_f)
            mask = diff >= threshold
            
            sharpened = np.zeros_like(img_f)
            # Apply sharpening only where diff > threshold
            sharpened[mask] = img_f[mask] + strength * (img_f[mask] - blur_f[mask])
            # Keep original elsewhere
            sharpened[~mask] = img_f[~mask]
        else:
            sharpened = img_f + strength * (img_f - blur_f)
        
        # Safe cast
        sharpened = np.nan_to_num(sharpened, nan=0.0, posinf=255.0, neginf=0.0)
        
        # Clip to valid range and convert back
        if image.dtype == np.uint8:
            sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
        elif image.dtype == np.uint16:
             sharpened = np.clip(sharpened, 0, 65535).astype(np.uint16)
        
        return sharpened


plugin = UnsharpMaskPlugin()
