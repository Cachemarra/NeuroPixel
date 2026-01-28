"""
Saturation Plugin
Adjust image color saturation.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="saturation",
    display_name="Saturation",
    description="Adjust color saturation intensity",
    category="Adjustments",
    icon="water_drop",
    params=[
        FloatParam(
            name="saturation",
            label="Saturation",
            description="Saturation multiplier (0 = grayscale, 1 = normal, 2 = vivid)",
            default=1.0,
            min=0.0,
            max=3.0,
            step=0.1,
        ),
        FloatParam(
            name="vibrance",
            label="Vibrance",
            description="Vibrance adjustment (smart saturation for muted colors)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
    ],
)


class SaturationPlugin(ImagePlugin):
    """Saturation adjustment in HSV color space."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        saturation = params.get("saturation", 1.0)
        vibrance = params.get("vibrance", 0.0)
        
        # Handle grayscale images
        if len(image.shape) == 2:
            return image
        
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        
        # Apply saturation multiplier
        hsv[:, :, 1] = hsv[:, :, 1] * saturation
        
        # Apply vibrance (boost less saturated colors more)
        if vibrance != 0:
            # Calculate how saturated each pixel is (0-1 range)
            sat_level = hsv[:, :, 1] / 255.0
            # Less saturated pixels get more boost
            vibrance_factor = 1.0 + (vibrance / 100.0) * (1.0 - sat_level)
            hsv[:, :, 1] = hsv[:, :, 1] * vibrance_factor
        
        # Clip saturation to valid range
        hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
        
        # Convert back to BGR
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


plugin = SaturationPlugin()
