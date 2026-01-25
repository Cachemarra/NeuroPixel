"""
Plugin Specification Contract
Defines the Pydantic models for the plugin system.
"""
from abc import ABC, abstractmethod
from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field
import numpy as np


# =============================================================================
# Parameter Types
# =============================================================================

class BaseParam(BaseModel):
    """Base parameter specification."""
    name: str = Field(..., description="Parameter identifier (snake_case)")
    label: str = Field(..., description="Human-readable label for UI")
    description: Optional[str] = Field(None, description="Tooltip/help text")


class FloatParam(BaseParam):
    """Floating point parameter with range."""
    type: Literal["float"] = "float"
    default: float = 0.0
    min: float = 0.0
    max: float = 1.0
    step: float = 0.01


class IntParam(BaseParam):
    """Integer parameter with range."""
    type: Literal["int"] = "int"
    default: int = 0
    min: int = 0
    max: int = 100
    step: int = 1


class BoolParam(BaseParam):
    """Boolean toggle parameter."""
    type: Literal["bool"] = "bool"
    default: bool = False


class SelectOption(BaseModel):
    """Option for select parameter."""
    value: str
    label: str


class SelectParam(BaseParam):
    """Dropdown/select parameter."""
    type: Literal["select"] = "select"
    default: str
    options: list[SelectOption]


class RangeParam(BaseParam):
    """Dual-value range parameter (e.g., thresholds)."""
    type: Literal["range"] = "range"
    default_low: float = 0.0
    default_high: float = 1.0
    min: float = 0.0
    max: float = 1.0
    step: float = 0.01


# Union of all parameter types
PluginParam = Union[FloatParam, IntParam, BoolParam, SelectParam, RangeParam]


# =============================================================================
# Plugin Specification
# =============================================================================

class PluginSpec(BaseModel):
    """
    Complete specification for a plugin.
    This is what gets exposed via the API and drives UI generation.
    """
    name: str = Field(..., description="Unique plugin identifier (snake_case)")
    display_name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="What the plugin does")
    category: str = Field(..., description="Category for grouping (e.g., 'Edge Detection', 'Morphology')")
    icon: str = Field("tune", description="Material Symbol icon name")
    params: list[PluginParam] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "canny_edge",
                "display_name": "Canny Edge Detection",
                "description": "Detect edges using the Canny algorithm",
                "category": "Edge Detection",
                "icon": "line_curve",
                "params": [
                    {"name": "sigma", "label": "Sigma", "type": "float", "default": 1.0, "min": 0.1, "max": 5.0, "step": 0.1},
                ]
            }
        }


# =============================================================================
# Plugin Base Class
# =============================================================================

class ImagePlugin(ABC):
    """
    Abstract base class for all image processing plugins.
    
    Each plugin must:
    1. Define a SPEC class attribute with its PluginSpec
    2. Implement the run() method
    """
    
    # Must be overridden by subclasses
    SPEC: PluginSpec
    
    @abstractmethod
    def run(self, image: np.ndarray, **kwargs) -> np.ndarray:
        """
        Process the input image with the given parameters.
        
        Args:
            image: Input image as numpy array (HWC or HW format, any bit depth)
            **kwargs: Plugin-specific parameters matching the SPEC.params
            
        Returns:
            Processed image as numpy array (same format as input where possible)
        """
        pass
    
    def validate_params(self, **kwargs) -> dict[str, Any]:
        """
        Validate and fill in default values for parameters.
        Returns a dict with all parameters (using defaults where not provided).
        """
        validated = {}
        
        for param in self.SPEC.params:
            name = param.name
            
            if name in kwargs:
                validated[name] = kwargs[name]
            elif param.type == "range":
                # For range params, use defaults
                validated[f"{name}_low"] = param.default_low
                validated[f"{name}_high"] = param.default_high
            else:
                validated[name] = param.default
                
        return validated


# =============================================================================
# Plugin Execution Request/Response
# =============================================================================

class PluginRunRequest(BaseModel):
    """Request to execute a plugin on an image."""
    image_id: str = Field(..., description="ID of the source image")
    plugin_name: str = Field(..., description="Plugin identifier to run")
    params: dict[str, Any] = Field(default_factory=dict, description="Plugin parameters")


class PluginRunResponse(BaseModel):
    """Response from plugin execution."""
    success: bool
    result_id: str = Field(..., description="ID of the processed image")
    result_url: str = Field(..., description="URL to fetch the result")
    execution_time_ms: float = Field(..., description="Processing time in milliseconds")
    plugin_name: str
    params_used: dict[str, Any]
