"""
Otsu Threshold Plugin
Automatic thresholding using Otsu's method for binarization.
"""
import numpy as np
import cv2
from skimage import color, img_as_ubyte

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    BoolParam,
    SelectParam,
    SelectOption,
)


SPEC = PluginSpec(
    name="otsu_threshold",
    display_name="Otsu Threshold",
    description="Automatic binarization using Otsu's method",
    category="Segmentation",
    icon="contrast",
    params=[
        BoolParam(
            name="invert",
            label="Invert",
            description="Invert the binary result",
            default=False,
        ),
        SelectParam(
            name="method",
            label="Method",
            description="Thresholding method variant",
            default="binary",
            options=[
                SelectOption(value="binary", label="Binary"),
                SelectOption(value="binary_inv", label="Binary Inverted"),
                SelectOption(value="trunc", label="Truncate"),
                SelectOption(value="tozero", label="To Zero"),
            ],
        ),
    ],
)


class OtsuThresholdPlugin(ImagePlugin):
    """Otsu thresholding using OpenCV."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        invert = params.get("invert", False)
        method = params.get("method", "binary")
        
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            if image.shape[2] == 4:
                # RGBA to RGB first
                gray = cv2.cvtColor(image, cv2.COLOR_RGBA2GRAY)
            else:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Ensure 8-bit
        if gray.dtype != np.uint8:
            gray = img_as_ubyte(gray)
        
        # Map method to OpenCV constant
        method_map = {
            "binary": cv2.THRESH_BINARY,
            "binary_inv": cv2.THRESH_BINARY_INV,
            "trunc": cv2.THRESH_TRUNC,
            "tozero": cv2.THRESH_TOZERO,
        }
        thresh_type = method_map.get(method, cv2.THRESH_BINARY)
        
        # Apply Otsu thresholding
        _, binary = cv2.threshold(gray, 0, 255, thresh_type + cv2.THRESH_OTSU)
        
        if invert:
            binary = 255 - binary
        
        # Return as 3-channel
        return np.stack([binary, binary, binary], axis=-1)


plugin = OtsuThresholdPlugin()
