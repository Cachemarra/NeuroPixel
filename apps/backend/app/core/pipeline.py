"""
Pipeline Module
Defines pipeline steps and execution logic for chaining multiple image processing plugins.
"""
from typing import Dict, Any, List
from pydantic import BaseModel
import numpy as np

from app.plugins.manager import plugin_manager


class PipelineStep(BaseModel):
    """
    Represents a single step in an image processing pipeline.
    
    Attributes:
        plugin_name: Name of the plugin to execute
        params: Dictionary of parameters to pass to the plugin
        active: Whether this step should be executed (allows disabling steps)
    """
    plugin_name: str
    params: Dict[str, Any] = {}
    active: bool = True


class PipelineExecutionResult(BaseModel):
    """Result of a pipeline execution on a single image."""
    success: bool
    total_time_ms: float
    steps_executed: int
    errors: List[str] = []


class Pipeline:
    """
    A chain of image processing plugins that are executed sequentially.
    
    The output of each step becomes the input to the next step.
    Inactive steps are skipped, and errors are logged but don't stop execution.
    """
    
    def __init__(self, steps: List[PipelineStep]):
        """
        Initialize a pipeline with a list of steps.
        
        Args:
            steps: List of PipelineStep instances defining the processing chain
        """
        self.steps = steps
    
    def execute(self, image: np.ndarray) -> tuple[np.ndarray, PipelineExecutionResult]:
        """
        Execute the pipeline on an input image.
        
        Args:
            image: Input image as numpy array
            
        Returns:
            Tuple of (processed_image, execution_result)
            
        Notes:
            - Inactive steps are skipped
            - If a step fails, the error is logged and the previous output is used
            - The pipeline continues even if individual steps fail
        """
        import time
        
        current_image = image.copy()
        errors: List[str] = []
        steps_executed = 0
        total_time = 0.0
        
        for i, step in enumerate(self.steps):
            if not step.active:
                continue
            
            try:
                result_image, exec_time = plugin_manager.execute(
                    step.plugin_name,
                    current_image,
                    step.params
                )
                current_image = result_image
                total_time += exec_time
                steps_executed += 1
                
            except Exception as e:
                error_msg = f"Step {i} ({step.plugin_name}): {str(e)}"
                errors.append(error_msg)
                print(f"Pipeline error: {error_msg}")
                # Continue with current image (don't use failed result)
        
        return current_image, PipelineExecutionResult(
            success=len(errors) == 0,
            total_time_ms=total_time,
            steps_executed=steps_executed,
            errors=errors
        )
    
    def validate(self) -> tuple[bool, List[str]]:
        """
        Validate that all plugins in the pipeline exist.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        for i, step in enumerate(self.steps):
            if plugin_manager.get_plugin(step.plugin_name) is None:
                errors.append(f"Step {i}: Plugin '{step.plugin_name}' not found")
        
        return len(errors) == 0, errors
    
    @classmethod
    def from_dict(cls, data: List[Dict[str, Any]]) -> "Pipeline":
        """
        Create a Pipeline from a list of dictionaries.
        
        Args:
            data: List of step dictionaries with 'plugin_name', 'params', 'active' keys
            
        Returns:
            Pipeline instance
        """
        steps = [PipelineStep(**step_data) for step_data in data]
        return cls(steps)
    
    def to_dict(self) -> List[Dict[str, Any]]:
        """Serialize the pipeline to a list of dictionaries."""
        return [step.model_dump() for step in self.steps]
