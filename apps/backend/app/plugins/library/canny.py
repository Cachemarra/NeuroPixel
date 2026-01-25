"""
Canny Edge Detection Plugin
Uses scikit-image's Canny implementation for robust edge detection.
"""
import numpy as np
from skimage import feature, color, img_as_float, img_as_ubyte

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
    RangeParam,
    BoolParam,
)


# =============================================================================
# Plugin Specification
# =============================================================================

SPEC = PluginSpec(
    name="canny_edge",
    display_name="Canny Edge Detection",
    description="Detect edges using the Canny algorithm with hysteresis thresholding",
    category="Edge Detection",
    icon="line_curve",
    params=[
        FloatParam(
            name="sigma",
            label="Sigma (Blur)",
            description="Gaussian blur sigma for noise reduction",
            default=1.0,
            min=0.1,
            max=10.0,
            step=0.1,
        ),
        RangeParam(
            name="threshold",
            label="Thresholds",
            description="Low and high thresholds for hysteresis",
            default_low=0.1,
            default_high=0.3,
            min=0.0,
            max=1.0,
            step=0.01,
        ),
        BoolParam(
            name="use_quantiles",
            label="Use Quantiles",
            description="Interpret thresholds as quantiles (0-1 range)",
            default=True,
        ),
    ],
)


# =============================================================================
# Plugin Implementation
# =============================================================================

class CannyEdgePlugin(ImagePlugin):
    """Canny edge detection using scikit-image."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        """
        Apply Canny edge detection to the input image.
        
        Args:
            image: Input image (grayscale or color, any bit depth)
            sigma: Gaussian blur sigma
            threshold_low: Lower threshold for hysteresis
            threshold_high: Upper threshold for hysteresis
            use_quantiles: Whether to interpret thresholds as quantiles
            
        Returns:
            Edge map as uint8 image (255 for edges, 0 for non-edges)
        """
        params = self.validate_params(**kwargs)
        
        sigma = params.get("sigma", 1.0)
        low_threshold = params.get("threshold_low", 0.1)
        high_threshold = params.get("threshold_high", 0.3)
        use_quantiles = params.get("use_quantiles", True)
        
        # Convert to float for processing
        img_float = img_as_float(image)
        
        # Convert to grayscale if color
        if len(img_float.shape) == 3:
            if img_float.shape[2] == 4:
                # RGBA -> RGB -> Gray
                img_float = color.rgba2rgb(img_float)
            img_gray = color.rgb2gray(img_float)
        else:
            img_gray = img_float
        
        # Apply Canny edge detection
        edges = feature.canny(
            img_gray,
            sigma=sigma,
            low_threshold=low_threshold,
            high_threshold=high_threshold,
            use_quantiles=use_quantiles,
        )
        
        # Convert boolean edge map to uint8 (0-255)
        edge_image = (edges * 255).astype(np.uint8)
        
        # Return as 3-channel for consistency
        return np.stack([edge_image, edge_image, edge_image], axis=-1)


# Export the plugin instance
plugin = CannyEdgePlugin()
