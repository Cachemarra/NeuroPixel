"""
Gaussian Blur Plugin
Applies Gaussian smoothing to reduce noise.
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
    name="gaussian_blur",
    display_name="Gaussian Blur",
    description="Apply Gaussian smoothing to reduce noise and detail",
    category="Preprocessing",
    icon="blur_on",
    params=[
        FloatParam(
            name="sigma",
            label="Sigma",
            description="Standard deviation of the Gaussian kernel",
            default=1.0,
            min=0.1,
            max=10.0,
            step=0.1,
        ),
        IntParam(
            name="kernel_size",
            label="Kernel Size",
            description="Size of the Gaussian kernel (must be odd)",
            default=5,
            min=3,
            max=31,
            step=2,
        ),
    ],
)


class GaussianBlurPlugin(ImagePlugin):
    """Gaussian blur using OpenCV."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        sigma = params.get("sigma", 1.0)
        kernel_size = params.get("kernel_size", 5)
        
        # Ensure kernel size is odd
        if kernel_size % 2 == 0:
            kernel_size += 1
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(
            image,
            (kernel_size, kernel_size),
            sigmaX=sigma,
            sigmaY=sigma
        )
        
        return blurred


plugin = GaussianBlurPlugin()
