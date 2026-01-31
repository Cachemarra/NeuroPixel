"""
Plugin Manager
Dynamically loads and manages image processing plugins.
"""
import importlib
import importlib.util
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
import cv2

from app.core.plugin_spec import (
    ImagePlugin,
    PluginSpec,
    PluginRunRequest,
    PluginRunResponse,
)


class PluginManager:
    """
    Manages the discovery, loading, and execution of image processing plugins.
    
    Plugins are loaded from the /library subdirectory.
    Each plugin module must export:
    - SPEC: PluginSpec instance
    - plugin: ImagePlugin instance
    """
    
    def __init__(self):
        self._plugins: Dict[str, ImagePlugin] = {}
        self._specs: Dict[str, PluginSpec] = {}
        self._library_path = Path(__file__).parent / "library"
    
    def discover_plugins(self) -> int:
        """
        Scan the library directory and load all valid plugins.
        Returns the number of plugins loaded.
        """
        self._plugins.clear()
        self._specs.clear()
        
        if not self._library_path.exists():
            return 0
        
        count = 0
        for plugin_file in self._library_path.glob("*.py"):
            if plugin_file.name.startswith("_"):
                continue  # Skip __init__.py etc.
            
            try:
                # Import the module dynamically
                module_name = f"app.plugins.library.{plugin_file.stem}"
                spec = importlib.util.spec_from_file_location(module_name, plugin_file)
                
                if spec is None or spec.loader is None:
                    continue
                    
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Check for required exports
                if not hasattr(module, "SPEC") or not hasattr(module, "plugin"):
                    print(f"Warning: {plugin_file.name} missing SPEC or plugin exports")
                    continue
                
                plugin_spec: PluginSpec = module.SPEC
                plugin_instance: ImagePlugin = module.plugin
                
                # Register the plugin
                self._specs[plugin_spec.name] = plugin_spec
                self._plugins[plugin_spec.name] = plugin_instance
                
                print(f"Loaded plugin: {plugin_spec.display_name} ({plugin_spec.name})")
                count += 1
                
            except Exception as e:
                print(f"Error loading plugin {plugin_file.name}: {e}")
                continue
        
        return count
    
    def get_all_specs(self) -> list[PluginSpec]:
        """Return list of all loaded plugin specifications."""
        return list(self._specs.values())
    
    def get_specs_by_category(self) -> Dict[str, list[PluginSpec]]:
        """Return plugins grouped by category."""
        categories: Dict[str, list[PluginSpec]] = {}
        
        for spec in self._specs.values():
            if spec.category not in categories:
                categories[spec.category] = []
            categories[spec.category].append(spec)
        
        return categories
    
    def get_spec(self, plugin_name: str) -> Optional[PluginSpec]:
        """Get spec for a specific plugin."""
        return self._specs.get(plugin_name)
    
    def get_plugin(self, plugin_name: str) -> Optional[ImagePlugin]:
        """Get plugin instance by name."""
        return self._plugins.get(plugin_name)
    
    def execute(
        self,
        plugin_name: str,
        image: np.ndarray,
        params: Dict[str, Any],
        **kwargs,
    ) -> tuple[np.ndarray, float]:
        """
        Execute a plugin on an image.
        
        Args:
            plugin_name: Name of the plugin to run
            image: Input image as numpy array
            params: Plugin parameters
            
        Returns:
            Tuple of (processed_image, execution_time_ms)
            
        Raises:
            ValueError: If plugin not found
        """
        plugin = self._plugins.get(plugin_name)
        if plugin is None:
            raise ValueError(f"Plugin not found: {plugin_name}")
        
        start_time = time.perf_counter()
        result = plugin.run(image, **params, **kwargs)
        execution_time = (time.perf_counter() - start_time) * 1000
        
        return result, execution_time


# Global plugin manager instance
plugin_manager = PluginManager()


def initialize_plugins():
    """Initialize and load all plugins. Call this on app startup."""
    count = plugin_manager.discover_plugins()
    print(f"Plugin system initialized: {count} plugins loaded")
    return count
