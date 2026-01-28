"""
Brightness & Contrast Plugin
Adjust image brightness and contrast levels.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="brightness_contrast",
    display_name="Brightness & Contrast",
    description="Adjust image brightness and contrast",
    category="Adjustments",
    icon="brightness_6",
    params=[
        FloatParam(
            name="brightness",
            label="Brightness",
            description="Brightness adjustment (-100 to 100)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=1.0,
        ),
        FloatParam(
            name="contrast",
            label="Contrast",
            description="Contrast multiplier (0.5 to 2.0)",
            default=1.0,
            min=0.5,
            max=2.0,
            step=0.05,
        ),
    ],
)


class BrightnessContrastPlugin(ImagePlugin):
    """Brightness and contrast adjustment."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        brightness = params.get("brightness", 0.0)
        contrast = params.get("contrast", 1.0)
        
        # Convert to float for processing
        img_float = image.astype(np.float32)
        
        # Apply contrast (multiply from midpoint)
        img_float = (img_float - 127.5) * contrast + 127.5
        
        # Apply brightness (add)
        img_float = img_float + brightness
        
        # Clip and convert back
        return np.clip(img_float, 0, 255).astype(np.uint8)


plugin = BrightnessContrastPlugin()
