"""
NodeRegistry — auto-discovers and registers all BaseNode subclasses.

Usage:
    from nodes.registry import get_registry

    registry = get_registry()
    NodeClass = registry.get("Delay")
    definitions = registry.all_definitions()
"""

from __future__ import annotations

import importlib
import inspect
import logging
import pkgutil
from pathlib import Path
from typing import Dict, List, Optional, Type

from nodes.base import BaseNode, NodeDefinition, UnknownNodeTypeError

logger = logging.getLogger(__name__)

_registry_instance: Optional["NodeRegistry"] = None


class NodeRegistry:
    """
    Singleton registry of all available node types.

    Auto-discovers BaseNode subclasses by importing every module inside
    the `nodes/` package and collecting subclasses with a `definition` attribute.
    """

    def __init__(self) -> None:
        self._nodes: Dict[str, Type[BaseNode]] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, node_class: Type[BaseNode]) -> None:
        """Manually register a node class."""
        if not hasattr(node_class, "definition"):
            raise ValueError(f"{node_class.__name__} has no 'definition' attribute")
        node_type = node_class.definition.type
        if node_type in self._nodes:
            logger.warning(
                "Node type '%s' already registered; overwriting with %s",
                node_type,
                node_class.__name__,
            )
        self._nodes[node_type] = node_class
        logger.debug("Registered node: %s → %s", node_type, node_class.__name__)

    def discover(self) -> None:
        """
        Walk all sub-packages of `nodes/` and register every BaseNode subclass found.
        Called once at application startup.
        """
        nodes_pkg_dir = Path(__file__).parent
        nodes_pkg_name = "nodes"

        for finder, module_name, is_pkg in pkgutil.walk_packages(
            path=[str(nodes_pkg_dir)],
            prefix=f"{nodes_pkg_name}.",
            onerror=lambda name: logger.warning("Error walking package: %s", name),
        ):
            if module_name in (f"{nodes_pkg_name}.base", f"{nodes_pkg_name}.registry"):
                continue  # skip base classes

            try:
                module = importlib.import_module(module_name)
                for _, obj in inspect.getmembers(module, inspect.isclass):
                    if (
                        obj is not BaseNode
                        and issubclass(obj, BaseNode)
                        and hasattr(obj, "definition")
                        and not inspect.isabstract(obj)
                    ):
                        self.register(obj)
            except Exception as exc:
                logger.warning("Failed to import '%s': %s", module_name, exc)

        logger.info("NodeRegistry: %d node types registered", len(self._nodes))

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get(self, node_type: str) -> Type[BaseNode]:
        """Return the node class for a given type string."""
        cls = self._nodes.get(node_type)
        if cls is None:
            available = sorted(self._nodes.keys())
            raise UnknownNodeTypeError(
                f"Unknown node type '{node_type}'. "
                f"Available: {available}"
            )
        return cls

    def has(self, node_type: str) -> bool:
        return node_type in self._nodes

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def all_definitions(self) -> List[NodeDefinition]:
        """Return NodeDefinition for every registered node, sorted by category + type."""
        defs = [cls.definition for cls in self._nodes.values()]
        return sorted(defs, key=lambda d: (d.category, d.display_name))

    def all_types(self) -> List[str]:
        return sorted(self._nodes.keys())

    def __len__(self) -> int:
        return len(self._nodes)

    def __repr__(self) -> str:
        return f"NodeRegistry({len(self._nodes)} nodes)"


# ------------------------------------------------------------------
# Singleton accessor
# ------------------------------------------------------------------

def get_registry() -> NodeRegistry:
    """Return the global NodeRegistry, creating and discovering it if needed."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = NodeRegistry()
        _registry_instance.discover()
    return _registry_instance


def reset_registry() -> None:
    """Reset the singleton (useful for testing)."""
    global _registry_instance
    _registry_instance = None
