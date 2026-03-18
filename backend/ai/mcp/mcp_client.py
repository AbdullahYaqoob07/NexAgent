"""MCP Client for AI nodes to access database tools.

This is a lightweight client that allows AI nodes to make database queries
through the MCP tool registry without needing direct database connections.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class MCPClient:
    """
    Client for calling MCP tools (including database tools) from AI nodes.

    Usage in AI nodes:
        mcp = MCPClient()
        result = await mcp.call_tool(
            "query_database",
            {
                "database_type": "postgres",
                "query": "SELECT * FROM users LIMIT 10"
            }
        )
    """

    def __init__(self) -> None:
        """Initialize MCP client."""
        self.tools_registry = None
        self._initialize_registries()

    def _initialize_registries(self) -> None:
        """Import and initialize all available tool registries."""
        try:
            from ai.mcp.database_tools import get_tool_registry

            self.tools_registry = get_tool_registry()
        except ImportError:
            logger.warning("Could not import database tool registry")

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Call an MCP tool by name.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments as dict

        Returns:
            Tool result (structure depends on the tool)
        """
        if not self.tools_registry:
            return {
                "error": "MCP infrastructure not initialized",
                "rows": [],
            }

        logger.info("📤 MCP tool call: %s with args: %s", tool_name, arguments)

        try:
            result = await self.tools_registry.call_tool(tool_name, arguments)
            logger.info("📥 MCP tool result: %s", result)
            return result
        except Exception as exc:
            logger.error("❌ MCP tool call failed: %s", exc)
            return {
                "error": str(exc),
                "rows": [],
                "row_count": 0,
            }

    def get_available_tools(self) -> list[Dict[str, Any]]:
        """
        Get list of all available MCP tools in OpenAI format.

        Returns tools in OpenAI function format:
        {
            "type": "function",
            "function": {
                "name": "...",
                "description": "...",
                "parameters": {...}  (JSON schema)
            }
        }
        """
        if not self.tools_registry:
            return []

        raw_tools = self.tools_registry.get_tools()

        # Convert raw tools to OpenAI format
        formatted_tools = []
        for tool in raw_tools:
            formatted_tools.append({
                "type": "function",
                "function": {
                    "name": tool.get("name", ""),
                    "description": tool.get("description", ""),
                    "parameters": tool.get("inputSchema", {})
                }
            })

        return formatted_tools

    def tool_exists(self, tool_name: str) -> bool:
        """Check if a tool is available."""
        tools = self.get_available_tools()
        return any(t.get("name") == tool_name for t in tools)


# Global MCP client instance
_mcp_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get or create the global MCP client."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client
