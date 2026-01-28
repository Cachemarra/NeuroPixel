"""
Color Temperature Plugin
Adjust white balance / color temperature.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="temperature",
    display_name="Temperature",
    description="Adjust color temperature (warm/cool) and tint",
    category="Adjustments",
    icon="thermostat",
    params=[
        FloatParam(
            name="temperature",
            label="Temperature",
            description="Color temperature (-100 = cool/blue, 100 = warm/orange)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
        FloatParam(
            name="tint",
            label="Tint",
            description="Color tint (-100 = green, 100 = magenta)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
    ],
)


class TemperaturePlugin(ImagePlugin):
    """Color temperature and tint adjustment."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        temperature = params.get("temperature", 0.0)
        tint = params.get("tint", 0.0)
        
        # Handle grayscale images
        if len(image.shape) == 2:
            return image
        
        # Work in float
        img_float = image.astype(np.float32)
        
        # Temperature: adjust blue and red channels
        # Warm = more red, less blue
        # Cool = more blue, less red
        temp_factor = temperature / 100.0 * 50  # Scale to reasonable shift
        
        img_float[:, :, 0] = img_float[:, :, 0] - temp_factor  # Blue channel
        img_float[:, :, 2] = img_float[:, :, 2] + temp_factor  # Red channel
        
        # Tint: adjust green channel
        # Magenta = less green
        # Green = more green
        tint_factor = -tint / 100.0 * 30  # Scale to reasonable shift
        img_float[:, :, 1] = img_float[:, :, 1] + tint_factor  # Green channel
        
        # Clip and convert
        return np.clip(img_float, 0, 255).astype(np.uint8)


plugin = TemperaturePlugin()
