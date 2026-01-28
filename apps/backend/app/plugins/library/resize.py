"""
Resize Plugin
Resize images with various interpolation methods.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    IntParam,
    FloatParam,
    SelectParam,
    BoolParam,
)


SPEC = PluginSpec(
    name="resize",
    display_name="Resize",
    description="Resize image dimensions",
    category="Transform",
    icon="aspect_ratio",
    params=[
        IntParam(
            name="width",
            label="Width",
            description="Target width in pixels (0 = auto from height)",
            default=0,
            min=0,
            max=8192,
            step=1,
        ),
        IntParam(
            name="height",
            label="Height",
            description="Target height in pixels (0 = auto from width)",
            default=0,
            min=0,
            max=8192,
            step=1,
        ),
        FloatParam(
            name="scale",
            label="Scale %",
            description="Scale percentage (overrides width/height if > 0)",
            default=100.0,
            min=1.0,
            max=500.0,
            step=5.0,
        ),
        BoolParam(
            name="keep_aspect",
            label="Keep Aspect Ratio",
            description="Maintain original aspect ratio",
            default=True,
        ),
        SelectParam(
            name="interpolation",
            label="Interpolation",
            description="Interpolation method",
            default="lanczos",
            options=[
                {"value": "nearest", "label": "Nearest Neighbor"},
                {"value": "linear", "label": "Bilinear"},
                {"value": "cubic", "label": "Bicubic"},
                {"value": "lanczos", "label": "Lanczos"},
                {"value": "area", "label": "Area (best for downscaling)"},
            ],
        ),
    ],
)


INTERPOLATION_MAP = {
    "nearest": cv2.INTER_NEAREST,
    "linear": cv2.INTER_LINEAR,
    "cubic": cv2.INTER_CUBIC,
    "lanczos": cv2.INTER_LANCZOS4,
    "area": cv2.INTER_AREA,
}


class ResizePlugin(ImagePlugin):
    """Image resize with multiple interpolation options."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        width = params.get("width", 0)
        height = params.get("height", 0)
        scale = params.get("scale", 100.0)
        keep_aspect = params.get("keep_aspect", True)
        interpolation = params.get("interpolation", "lanczos")
        
        orig_h, orig_w = image.shape[:2]
        interp = INTERPOLATION_MAP.get(interpolation, cv2.INTER_LANCZOS4)
        
        # If scale is different from 100%, use it
        if scale != 100.0:
            new_w = int(orig_w * scale / 100.0)
            new_h = int(orig_h * scale / 100.0)
        elif width > 0 or height > 0:
            if keep_aspect:
                if width > 0 and height > 0:
                    # Fit within bounds
                    ratio = min(width / orig_w, height / orig_h)
                    new_w = int(orig_w * ratio)
                    new_h = int(orig_h * ratio)
                elif width > 0:
                    ratio = width / orig_w
                    new_w = width
                    new_h = int(orig_h * ratio)
                else:
                    ratio = height / orig_h
                    new_w = int(orig_w * ratio)
                    new_h = height
            else:
                new_w = width if width > 0 else orig_w
                new_h = height if height > 0 else orig_h
        else:
            # No resize needed
            return image
        
        # Ensure minimum dimensions
        new_w = max(1, new_w)
        new_h = max(1, new_h)
        
        return cv2.resize(image, (new_w, new_h), interpolation=interp)


plugin = ResizePlugin()
