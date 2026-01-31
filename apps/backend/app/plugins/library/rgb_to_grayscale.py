"""
RGB to Grayscale Conversion Plugin
Converts color images to grayscale using various methods.
"""
import cv2
import numpy as np
from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    SelectParam,
    SelectOption,
)


SPEC = PluginSpec(
    name="rgb_to_grayscale",
    display_name="RGB to Grayscale",
    description="Converts color images to grayscale using various conversion methods.",
    category="Preprocessing",
    icon="filter_vintage",
    params=[
        SelectParam(
            name="method",
            label="Method",
            description="Grayscale conversion algorithm",
            default="luminance",
            options=[
                SelectOption(value="luminance", label="Luminance (Rec. 709)"),
                SelectOption(value="average", label="Average (R+G+B)/3"),
                SelectOption(value="lightness", label="Lightness (max+min)/2"),
                SelectOption(value="red", label="Red Channel Only"),
                SelectOption(value="green", label="Green Channel Only"),
                SelectOption(value="blue", label="Blue Channel Only"),
            ],
        ),
        SelectParam(
            name="output_channels",
            label="Output",
            description="Output format",
            default="single",
            options=[
                SelectOption(value="single", label="Single Channel (Grayscale)"),
                SelectOption(value="rgb", label="3-Channel (Gray RGB)"),
            ],
        ),
    ],
)


class RGBToGrayscalePlugin(ImagePlugin):
    """
    Converts RGB images to grayscale using various methods.
    """
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        method = params.get("method", "luminance")
        output_channels = params.get("output_channels", "single")
        
        # Check if already grayscale
        if len(image.shape) == 2:
            gray = image
        elif image.shape[2] == 1:
            gray = image.squeeze()
        else:
            # OpenCV uses BGR by default
            if method == "luminance":
                # Using standard luminosity formula (Rec. 709)
                # Y = 0.2126*R + 0.7152*G + 0.0722*B
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            elif method == "average":
                # Simple average of all channels
                gray = np.mean(image, axis=2).astype(np.uint8)
            elif method == "lightness":
                # Lightness = (max + min) / 2
                max_val = np.max(image, axis=2)
                min_val = np.min(image, axis=2)
                gray = ((max_val.astype(np.float32) + min_val.astype(np.float32)) / 2).astype(np.uint8)
            elif method == "red":
                # BGR format - red is index 2
                gray = image[:, :, 2]
            elif method == "green":
                # Green is index 1
                gray = image[:, :, 1]
            elif method == "blue":
                # Blue is index 0
                gray = image[:, :, 0]
            else:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Convert to desired output format
        if output_channels == "rgb":
            return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        else:
            return gray


plugin = RGBToGrayscalePlugin()
