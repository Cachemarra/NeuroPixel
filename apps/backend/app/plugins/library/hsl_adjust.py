"""
HSL Color Adjustment Plugin
Adjust Hue, Saturation, and Lightness.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="hsl_adjust",
    display_name="HSL Adjust",
    description="Adjust Hue, Saturation, and Lightness",
    category="Adjustments",
    icon="palette",
    params=[
        FloatParam(
            name="hue",
            label="Hue",
            description="Hue rotation (-180 to 180 degrees)",
            default=0.0,
            min=-180.0,
            max=180.0,
            step=5.0,
        ),
        FloatParam(
            name="saturation",
            label="Saturation",
            description="Saturation adjustment (-100 to 100)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
        FloatParam(
            name="lightness",
            label="Lightness",
            description="Lightness adjustment (-100 to 100)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
    ],
)


class HSLAdjustPlugin(ImagePlugin):
    """HSL color adjustment."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        hue_shift = params.get("hue", 0.0)
        sat_shift = params.get("saturation", 0.0)
        light_shift = params.get("lightness", 0.0)
        
        # Handle grayscale images
        if len(image.shape) == 2:
            # For grayscale, only lightness applies
            if light_shift != 0:
                img_float = image.astype(np.float32)
                img_float = img_float + light_shift * 2.55  # Scale to 0-255
                return np.clip(img_float, 0, 255).astype(np.uint8)
            return image
        
        # Convert to HLS (OpenCV uses HLS not HSL)
        hls = cv2.cvtColor(image, cv2.COLOR_BGR2HLS).astype(np.float32)
        
        # Adjust Hue (H channel is 0-180 in OpenCV)
        if hue_shift != 0:
            hls[:, :, 0] = (hls[:, :, 0] + hue_shift / 2) % 180
        
        # Adjust Lightness
        if light_shift != 0:
            hls[:, :, 1] = hls[:, :, 1] + light_shift * 1.275  # Scale to 0-255
            hls[:, :, 1] = np.clip(hls[:, :, 1], 0, 255)
        
        # Adjust Saturation
        if sat_shift != 0:
            hls[:, :, 2] = hls[:, :, 2] * (1 + sat_shift / 100)
            hls[:, :, 2] = np.clip(hls[:, :, 2], 0, 255)
        
        # Convert back to BGR
        return cv2.cvtColor(hls.astype(np.uint8), cv2.COLOR_HLS2BGR)


plugin = HSLAdjustPlugin()
