"""
Shadows & Highlights Plugin
Adjust shadow and highlight regions independently.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
)


SPEC = PluginSpec(
    name="shadows_highlights",
    display_name="Shadows & Highlights",
    description="Recover detail in shadows and highlights",
    category="Adjustments",
    icon="contrast",
    params=[
        FloatParam(
            name="shadows",
            label="Shadows",
            description="Shadow recovery (-100 = darker, 100 = lighter)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
        FloatParam(
            name="highlights",
            label="Highlights",
            description="Highlight recovery (-100 = darker, 100 = lighter)",
            default=0.0,
            min=-100.0,
            max=100.0,
            step=5.0,
        ),
        FloatParam(
            name="blacks",
            label="Blacks",
            description="Black point adjustment",
            default=0.0,
            min=-50.0,
            max=50.0,
            step=5.0,
        ),
        FloatParam(
            name="whites",
            label="Whites",
            description="White point adjustment",
            default=0.0,
            min=-50.0,
            max=50.0,
            step=5.0,
        ),
    ],
)


class ShadowsHighlightsPlugin(ImagePlugin):
    """Shadows and highlights adjustment."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        shadows = params.get("shadows", 0.0)
        highlights = params.get("highlights", 0.0)
        blacks = params.get("blacks", 0.0)
        whites = params.get("whites", 0.0)
        
        # Work in float, normalized
        img_float = image.astype(np.float32) / 255.0
        
        # Get luminance for masking
        if len(image.shape) == 3:
            luminance = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        else:
            luminance = img_float.copy()
        
        # Create shadow and highlight masks using smooth curves
        shadow_mask = np.power(1.0 - luminance, 2)  # Strong in dark areas
        highlight_mask = np.power(luminance, 2)  # Strong in bright areas
        
        # Apply shadows adjustment
        if shadows != 0:
            shadow_factor = shadows / 100.0 * 0.5
            if len(image.shape) == 3:
                for c in range(3):
                    img_float[:, :, c] = img_float[:, :, c] + shadow_mask * shadow_factor
            else:
                img_float = img_float + shadow_mask * shadow_factor
        
        # Apply highlights adjustment
        if highlights != 0:
            highlight_factor = highlights / 100.0 * 0.5
            if len(image.shape) == 3:
                for c in range(3):
                    img_float[:, :, c] = img_float[:, :, c] + highlight_mask * highlight_factor
            else:
                img_float = img_float + highlight_mask * highlight_factor
        
        # Apply blacks (shift dark end)
        if blacks != 0:
            blacks_factor = blacks / 100.0
            img_float = img_float + img_float * (1 - luminance[:, :, np.newaxis] if len(image.shape) == 3 else (1 - luminance)) * blacks_factor * 0.3
        
        # Apply whites (shift bright end)
        if whites != 0:
            whites_factor = whites / 100.0
            if len(image.shape) == 3:
                img_float = img_float + luminance[:, :, np.newaxis] * whites_factor * 0.3
            else:
                img_float = img_float + luminance * whites_factor * 0.3
        
        # Clip and convert back
        return np.clip(img_float * 255.0, 0, 255).astype(np.uint8)


plugin = ShadowsHighlightsPlugin()
