"""
Denoise Plugin
Reduce image noise using various methods.
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
    name="denoise",
    display_name="Denoise",
    description="Reduce image noise",
    category="Enhancement",
    icon="filter_hdr",
    params=[
        FloatParam(
            name="strength",
            label="Strength",
            description="Denoising strength (0-50)",
            default=10.0,
            min=0.0,
            max=50.0,
            step=1.0,
        ),
        SelectParam(
            name="method",
            label="Method",
            description="Denoising algorithm",
            default="nlmeans",
            options=[
                {"value": "nlmeans", "label": "Non-Local Means (best quality)"},
                {"value": "bilateral", "label": "Bilateral (preserves edges)"},
                {"value": "median", "label": "Median (simple, fast)"},
            ],
        ),
        FloatParam(
            name="color_strength",
            label="Color Strength",
            description="Color noise reduction (for NL Means)",
            default=10.0,
            min=0.0,
            max=50.0,
            step=1.0,
        ),
    ],
)


class DenoisePlugin(ImagePlugin):
    """Image denoising plugin."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        strength = params.get("strength", 10.0)
        method = params.get("method", "nlmeans")
        color_strength = params.get("color_strength", 10.0)
        
        if strength == 0:
            return image
        
        if method == "nlmeans":
            if len(image.shape) == 2:
                # Grayscale
                return cv2.fastNlMeansDenoising(
                    image, 
                    None, 
                    h=strength,
                    templateWindowSize=7,
                    searchWindowSize=21
                )
            else:
                # Color
                return cv2.fastNlMeansDenoisingColored(
                    image,
                    None,
                    h=strength,
                    hForColorComponents=color_strength,
                    templateWindowSize=7,
                    searchWindowSize=21
                )
                
        elif method == "bilateral":
            d = int(strength / 5) * 2 + 1  # Diameter
            return cv2.bilateralFilter(image, d, strength * 2, strength * 2)
            
        elif method == "median":
            ksize = int(strength / 10) * 2 + 1
            ksize = max(3, min(ksize, 31))  # Clamp to valid range
            return cv2.medianBlur(image, ksize)
        
        return image


plugin = DenoisePlugin()
