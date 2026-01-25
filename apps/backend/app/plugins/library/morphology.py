"""
Morphological Operations Plugin
Dilation, Erosion, Opening, Closing operations.
"""
import numpy as np
import cv2
from skimage import color, img_as_ubyte

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    IntParam,
    SelectParam,
    SelectOption,
)


SPEC = PluginSpec(
    name="morphology",
    display_name="Morphological Operations",
    description="Apply morphological transformations (erosion, dilation, etc.)",
    category="Morphology",
    icon="blur_on",
    params=[
        SelectParam(
            name="operation",
            label="Operation",
            description="Type of morphological operation",
            default="dilate",
            options=[
                SelectOption(value="erode", label="Erosion"),
                SelectOption(value="dilate", label="Dilation"),
                SelectOption(value="open", label="Opening"),
                SelectOption(value="close", label="Closing"),
                SelectOption(value="gradient", label="Gradient"),
                SelectOption(value="tophat", label="Top Hat"),
                SelectOption(value="blackhat", label="Black Hat"),
            ],
        ),
        IntParam(
            name="kernel_size",
            label="Kernel Size",
            description="Size of the structuring element",
            default=3,
            min=3,
            max=21,
            step=2,
        ),
        IntParam(
            name="iterations",
            label="Iterations",
            description="Number of times to apply the operation",
            default=1,
            min=1,
            max=10,
            step=1,
        ),
        SelectParam(
            name="kernel_shape",
            label="Kernel Shape",
            description="Shape of the structuring element",
            default="rect",
            options=[
                SelectOption(value="rect", label="Rectangle"),
                SelectOption(value="ellipse", label="Ellipse"),
                SelectOption(value="cross", label="Cross"),
            ],
        ),
    ],
)


class MorphologyPlugin(ImagePlugin):
    """Morphological operations using OpenCV."""
    
    SPEC = SPEC
    
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        params = self.validate_params(**kwargs)
        
        operation = params.get("operation", "dilate")
        kernel_size = params.get("kernel_size", 3)
        iterations = params.get("iterations", 1)
        kernel_shape = params.get("kernel_shape", "rect")
        
        # Ensure kernel size is odd
        if kernel_size % 2 == 0:
            kernel_size += 1
        
        # Create structuring element
        shape_map = {
            "rect": cv2.MORPH_RECT,
            "ellipse": cv2.MORPH_ELLIPSE,
            "cross": cv2.MORPH_CROSS,
        }
        cv_shape = shape_map.get(kernel_shape, cv2.MORPH_RECT)
        kernel = cv2.getStructuringElement(cv_shape, (kernel_size, kernel_size))
        
        # Convert to grayscale if needed for better results
        if len(image.shape) == 3:
            process_img = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            was_color = True
        else:
            process_img = image
            was_color = False
        
        # Map operation to OpenCV function
        op_map = {
            "erode": cv2.MORPH_ERODE,
            "dilate": cv2.MORPH_DILATE,
            "open": cv2.MORPH_OPEN,
            "close": cv2.MORPH_CLOSE,
            "gradient": cv2.MORPH_GRADIENT,
            "tophat": cv2.MORPH_TOPHAT,
            "blackhat": cv2.MORPH_BLACKHAT,
        }
        cv_op = op_map.get(operation, cv2.MORPH_DILATE)
        
        # Apply morphological operation
        result = cv2.morphologyEx(process_img, cv_op, kernel, iterations=iterations)
        
        # Return as 3-channel
        return np.stack([result, result, result], axis=-1)


plugin = MorphologyPlugin()
