"""
Exposure Plugin
Adjust image exposure using gamma correction.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="exposure",
    display_name="Exposure",
    description="Adjust exposure using gamma correction",
    category="Adjustments",
    icon="exposure",
    params=[
        FloatParam(
            name="exposure",
            label="Exposure",
            description="Exposure adjustment (EV stops, -3 to 3)",
            default=0.0,
            min=-3.0,
            max=3.0,
            step=0.1,
        ),
        FloatParam(
            name="gamma",
            label="Gamma",
            description="Gamma correction (0.2 to 5.0)",
            default=1.0,
            min=0.2,
            max=5.0,
            step=0.1,
        ),
    ],
)


class ExposurePlugin(ImagePlugin):
    """Exposure adjustment using gamma correction."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        exposure = params.get("exposure", 0.0)
        gamma = params.get("gamma", 1.0)
        
        # Convert exposure stops to multiplier (2^EV)
        exposure_mult = np.power(2.0, exposure)
        
        # Normalize to 0-1 range
        img_float = image.astype(np.float32) / 255.0
        
        # Apply exposure
        img_float = img_float * exposure_mult
        
        # Apply gamma correction (inverse gamma for natural look)
        inv_gamma = 1.0 / gamma
        img_float = np.power(np.clip(img_float, 0, 1), inv_gamma)
        
        # Convert back to 0-255
        return np.clip(img_float * 255.0, 0, 255).astype(np.uint8)


plugin = ExposurePlugin()
