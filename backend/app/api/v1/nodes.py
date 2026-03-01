"""
GET /api/v1/nodes — returns all registered node definitions.

This endpoint is the single source of truth for:
1. Frontend node palette (what nodes are available)
2. LLM workflow generation (what node types, parameters, and outputs exist)
3. Node config modal (what fields to show for each node type)
"""

from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

from nodes.registry import get_registry
from nodes.base import NodeDefinition

router = APIRouter(prefix="/nodes", tags=["Nodes"])


class NodesResponse(BaseModel):
    count: int
    categories: List[str]
    nodes: List[NodeDefinition]


@router.get("", response_model=NodesResponse, summary="Get all node definitions")
async def get_nodes(category: Optional[str] = None):
    """
    Returns all registered workflow node definitions.

    Each definition includes:
    - `type`: canonical node type string (use this in workflow JSON)
    - `display_name`, `description`, `category`, `icon`, `color`
    - `is_trigger`: whether this node can start a workflow
    - `parameters`: list of config fields (with types, defaults, options)
    - `outputs`: list of output fields (for {{$node.x.field}} references)
    - `required_credentials`: credential types needed

    Use this endpoint to build the node palette UI and to provide context
    to an LLM for generating workflow JSON.
    """
    registry = get_registry()
    all_defs = registry.all_definitions()

    if category:
        all_defs = [d for d in all_defs if d.category.lower() == category.lower()]

    categories = sorted(set(d.category for d in all_defs))

    return NodesResponse(
        count=len(all_defs),
        categories=categories,
        nodes=all_defs,
    )


@router.get("/{node_type}", response_model=NodeDefinition, summary="Get a single node definition")
async def get_node(node_type: str):
    """Returns the definition for a specific node type."""
    from fastapi import HTTPException
    from nodes.base import UnknownNodeTypeError

    registry = get_registry()
    try:
        node_cls = registry.get(node_type)
        return node_cls.definition
    except UnknownNodeTypeError:
        raise HTTPException(status_code=404, detail=f"Node type '{node_type}' not found")
