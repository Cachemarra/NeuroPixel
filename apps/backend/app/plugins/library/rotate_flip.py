"""
Rotate & Flip Plugin
Rotate and flip images.
"""
import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    FloatParam,
    SelectParam,
    BoolParam,
)


SPEC = PluginSpec(
    name="rotate_flip",
    display_name="Rotate & Flip",
    description="Rotate and flip images",
    category="Transform",
    icon="rotate_90_degrees_ccw",
    params=[
        FloatParam(
            name="angle",
            label="Angle",
            description="Rotation angle in degrees",
            default=0.0,
            min=-180.0,
            max=180.0,
            step=1.0,
        ),
        SelectParam(
            name="quick_rotate",
            label="Quick Rotate",
            description="Quick rotation presets (overrides angle)",
            default="none",
            options=[
                {"value": "none", "label": "Use Angle"},
                {"value": "90", "label": "90° CW"},
                {"value": "-90", "label": "90° CCW"},
                {"value": "180", "label": "180°"},
            ],
        ),
        BoolParam(
            name="flip_horizontal",
            label="Flip Horizontal",
            description="Mirror image horizontally",
            default=False,
        ),
        BoolParam(
            name="flip_vertical",
            label="Flip Vertical",
            description="Mirror image vertically",
            default=False,
        ),
        BoolParam(
            name="expand",
            label="Expand Canvas",
            description="Expand canvas to fit rotated image (vs crop)",
            default=True,
        ),
    ],
)


class RotateFlipPlugin(ImagePlugin):
    """Rotate and flip images."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        angle = params.get("angle", 0.0)
        quick_rotate = params.get("quick_rotate", "none")
        flip_h = params.get("flip_horizontal", False)
        flip_v = params.get("flip_vertical", False)
        expand = params.get("expand", True)
        
        result = image.copy()
        
        # Apply quick rotation if selected
        if quick_rotate == "90":
            result = cv2.rotate(result, cv2.ROTATE_90_CLOCKWISE)
        elif quick_rotate == "-90":
            result = cv2.rotate(result, cv2.ROTATE_90_COUNTERCLOCKWISE)
        elif quick_rotate == "180":
            result = cv2.rotate(result, cv2.ROTATE_180)
        elif angle != 0:
            # Custom angle rotation
            h, w = result.shape[:2]
            center = (w / 2, h / 2)
            
            # Get rotation matrix
            rot_mat = cv2.getRotationMatrix2D(center, -angle, 1.0)
            
            if expand:
                # Calculate new image bounds
                cos = np.abs(rot_mat[0, 0])
                sin = np.abs(rot_mat[0, 1])
                new_w = int(h * sin + w * cos)
                new_h = int(h * cos + w * sin)
                
                # Adjust rotation matrix for new center
                rot_mat[0, 2] += (new_w - w) / 2
                rot_mat[1, 2] += (new_h - h) / 2
                
                result = cv2.warpAffine(result, rot_mat, (new_w, new_h))
            else:
                result = cv2.warpAffine(result, rot_mat, (w, h))
        
        # Apply flips
        if flip_h:
            result = cv2.flip(result, 1)
        if flip_v:
            result = cv2.flip(result, 0)
        
        return result


plugin = RotateFlipPlugin()
