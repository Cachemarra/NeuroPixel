"""
Sharpening Algorithms Plugin
Provides Unsharp Mask and Laplacian sharpening filters.
"""
import cv2
import numpy as np
from app.plugins.base import NeuroPixelPlugin, plugin_param


class UnsharpMask(NeuroPixelPlugin):
    """
    Unsharp Mask sharpening filter.
    Enhances edges by subtracting a blurred version from the original.
    """
    
    name = "unsharp_mask"
    display_name = "Unsharp Mask"
    category = "Preprocessing"
    description = "Sharpens image by enhancing edge contrast using Gaussian blur subtraction."
    
    params = [
        plugin_param(
            name="strength",
            type="float",
            label="Strength",
            description="Sharpening intensity (0.5 = subtle, 2.0 = strong)",
            default=1.0,
            min=0.1,
            max=3.0,
            step=0.1,
        ),
        plugin_param(
            name="radius",
            type="float",
            label="Radius",
            description="Blur radius for the unsharp mask",
            default=1.0,
            min=0.1,
            max=5.0,
            step=0.1,
        ),
        plugin_param(
            name="threshold",
            type="int",
            label="Threshold",
            description="Minimum brightness change for sharpening to apply",
            default=0,
            min=0,
            max=50,
            step=1,
        ),
    ]
    
    def process(self, image: np.ndarray, **params) -> np.ndarray:
        strength = params.get("strength", 1.0)
        radius = params.get("radius", 1.0)
        threshold = params.get("threshold", 0)
        
        # Create Gaussian blur
        kernel_size = int(radius * 4) | 1  # Ensure odd number
        blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), radius)
        
        # Calculate the sharpened image
        if threshold > 0:
            # Apply threshold to avoid sharpening noise
            low_contrast_mask = np.abs(image.astype(np.float32) - blurred.astype(np.float32)) < threshold
            sharpened = image.astype(np.float32) + strength * (image.astype(np.float32) - blurred.astype(np.float32))
            sharpened = np.where(low_contrast_mask, image, sharpened)
        else:
            sharpened = image.astype(np.float32) + strength * (image.astype(np.float32) - blurred.astype(np.float32))
        
        # Clip and convert back
        sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
        
        return sharpened


class LaplacianSharpening(NeuroPixelPlugin):
    """
    Laplacian-based sharpening filter.
    Uses the Laplacian operator to enhance edges.
    """
    
    name = "laplacian_sharpening"
    display_name = "Laplacian Sharpening"
    category = "Preprocessing"
    description = "Sharpens image using Laplacian edge enhancement."
    
    params = [
        plugin_param(
            name="strength",
            type="float",
            label="Strength",
            description="How much to enhance edges",
            default=0.5,
            min=0.1,
            max=2.0,
            step=0.1,
        ),
        plugin_param(
            name="kernel_size",
            type="select",
            label="Kernel Size",
            description="Size of the Laplacian kernel",
            default="3",
            options=[
                {"value": "1", "label": "1x1"},
                {"value": "3", "label": "3x3"},
                {"value": "5", "label": "5x5"},
            ],
        ),
    ]
    
    def process(self, image: np.ndarray, **params) -> np.ndarray:
        strength = params.get("strength", 0.5)
        kernel_size = int(params.get("kernel_size", "3"))
        
        # Convert to grayscale if needed for Laplacian
        if len(image.shape) == 3:
            # Apply Laplacian to each channel
            channels = cv2.split(image)
            sharpened_channels = []
            
            for channel in channels:
                laplacian = cv2.Laplacian(channel, cv2.CV_64F, ksize=kernel_size)
                sharpened = channel.astype(np.float64) - strength * laplacian
                sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
                sharpened_channels.append(sharpened)
            
            return cv2.merge(sharpened_channels)
        else:
            laplacian = cv2.Laplacian(image, cv2.CV_64F, ksize=kernel_size)
            sharpened = image.astype(np.float64) - strength * laplacian
            return np.clip(sharpened, 0, 255).astype(np.uint8)
