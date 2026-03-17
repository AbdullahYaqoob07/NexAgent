"""MCP Tool Server for database operations.

Exposes database query capabilities as MCP tools that can be called by AI nodes.
This server runs alongside the workflow engine and AI nodes can access it via MCP.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional, TYPE_CHECKING

import json

if TYPE_CHECKING:
    from executor.databases.base import DatabaseClient

logger = logging.getLogger(__name__)


class DatabaseToolRegistry:
    """
    Registry of database-related MCP tools.

    This is not a real MCP server - it's a registry that defines
    which tools are available and how to call them.
    The actual MCP integration happens in MCPClient.
    """

    def __init__(self) -> None:
        self.db_clients: Dict[str, "DatabaseClient"] = {}

    def register_client(self, db_type: str, client: "DatabaseClient") -> None:
        """Register a database client."""
        self.db_clients[db_type] = client

    def get_client(self, db_type: str) -> Optional["DatabaseClient"]:
        """Get a registered database client."""
        return self.db_clients.get(db_type)

    async def _ensure_client(self, db_type: str) -> Optional["DatabaseClient"]:
        """Lazily create and register a DB client from environment variables if missing."""
        existing = self.get_client(db_type)
        if existing:
            return existing

        try:
            if db_type == "postgres":
                conn = os.getenv("DATABASE_URL")
                if not conn:
                    return None
                from executor.databases.postgres import PostgresClient

                client = PostgresClient(conn)
                await client.connect()
                if await client.health_check():
                    self.register_client("postgres", client)
                    return client
                return None

            if db_type == "mongodb":
                conn = os.getenv("MONGODB_URI")
                db_name = os.getenv("MONGODB_DATABASE", "nexagent")
                if not conn:
                    return None
                from executor.databases.mongodb import MongoDBClient

                client = MongoDBClient(conn, db_name)
                await client.connect()
                if await client.health_check():
                    self.register_client("mongodb", client)
                    return client
                return None

            if db_type == "pinecone":
                api_key = os.getenv("PINECONE_API_KEY")
                index_name = os.getenv("PINECONE_INDEX", "default")
                environment = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
                if not api_key:
                    return None
                from executor.databases.pinecone import PineconeClient

                client = PineconeClient(api_key, index_name, environment)
                await client.connect()
                if await client.health_check():
                    self.register_client("pinecone", client)
                    return client
                return None
        except Exception as exc:
            logger.debug("Lazy DB client init failed for %s: %s", db_type, exc)
            return None

        return None

    def get_tools(self) -> list[Dict[str, Any]]:
        """
        Return list of available MCP tools for database operations.

        Each tool describes:
        - name: tool identifier
        - description: what it does
        - inputSchema: JSON schema for parameters
        """
        return [
            {
                "name": "query_database",
                "description": "Execute a query on PostgreSQL, MongoDB, or Pinecone database",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "database_type": {
                            "type": "string",
                            "enum": ["postgres", "mongodb", "pinecone"],
                            "description": "Type of database to query",
                        },
                        "query": {
                            "type": "string",
                            "description": (
                                "Query string. Format depends on database type:\n"
                                "- PostgreSQL: Standard SQL (SELECT, INSERT, UPDATE, DELETE)\n"
                                "- MongoDB: DSL format (collection:users;operation:find;filter:{...})\n"
                                "- Pinecone: DSL format (operation:query;vector:[...];top_k:10)"
                            ),
                        },
                        "resource_id": {
                            "type": "string",
                            "description": "Optional resource ID to fetch the database client from context",
                        },
                    },
                    "required": ["database_type", "query"],
                },
            },
            {
                "name": "list_database_tables",
                "description": "List tables/collections in a database",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "database_type": {
                            "type": "string",
                            "enum": ["postgres", "mongodb", "pinecone"],
                        },
                        "resource_id": {
                            "type": "string",
                            "description": "Optional resource ID",
                        },
                    },
                    "required": ["database_type"],
                },
            },
            {
                "name": "get_database_schema",
                "description": "Get schema information for a table/collection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "database_type": {
                            "type": "string",
                            "enum": ["postgres", "mongodb", "pinecone"],
                        },
                        "table_name": {
                            "type": "string",
                            "description": "Table or collection name",
                        },
                        "resource_id": {
                            "type": "string",
                            "description": "Optional resource ID",
                        },
                    },
                    "required": ["database_type", "table_name"],
                },
            },
        ]

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute a database tool.

        Args:
            tool_name: Name of the tool (e.g. "query_database")
            arguments: Tool arguments

        Returns:
            Tool result as dict with "rows", "row_count", "error", etc.
        """
        raw_db_type = arguments.get("database_type", "")
        db_type = str(raw_db_type).strip().lower()
        db_type_aliases = {
            "postgresql": "postgres",
            "pg": "postgres",
            "mongo": "mongodb",
            "mongo_db": "mongodb",
            "pinecone_db": "pinecone",
        }
        db_type = db_type_aliases.get(db_type, db_type)
        client = self.get_client(db_type)
        if not client:
            client = await self._ensure_client(db_type)

        if not client:
            available = sorted(self.db_clients.keys())
            return {
                "error": (
                    f"Database client '{db_type}' not registered"
                    + (f". Available clients: {', '.join(available)}" if available else ".")
                ),
                "rows": [],
                "row_count": 0,
            }

        try:
            if tool_name == "query_database":
                query = arguments.get("query", "")
                result = await client.execute(query)
                return result

            elif tool_name == "list_database_tables":
                if db_type == "postgres":
                    query = "SELECT tablename FROM pg_tables WHERE schemaname='public'"
                    result = await client.execute(query)
                    tables = [row.get("tablename") for row in result.get("rows", [])]
                    return {"tables": tables, "count": len(tables)}

                elif db_type == "mongodb":
                    # MongoDB doesn't have a direct "list collections" in async easily
                    return {"tables": [], "count": 0, "note": "Use admin.command for MongoDB"}

                elif db_type == "pinecone":
                    index_name = getattr(client, "index_name", "default")
                    return {
                        "tables": [index_name],
                        "count": 1,
                        "note": "Pinecone uses a single index",
                    }

            elif tool_name == "get_database_schema":
                table_name = arguments.get("table_name", "")
                if db_type == "postgres":
                    query = f"""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_name = '{table_name}'
                    """
                    result = await client.execute(query)
                    return {"schema": result.get("rows", [])}

                elif db_type == "mongodb":
                    # MongoDB doesn't have strict schema; return a note
                    return {"note": f"MongoDB collection '{table_name}' has flexible schema"}

                elif db_type == "pinecone":
                    stats = await client.execute("operation:stats")
                    return stats

            else:
                return {"error": f"Unknown tool: {tool_name}"}

            return {
                "error": f"Unsupported database type '{db_type}' for tool '{tool_name}'",
                "rows": [],
                "row_count": 0,
            }

        except Exception as exc:
            logger.error("Tool execution failed: %s", exc)
            return {
                "error": str(exc),
                "rows": [],
                "row_count": 0,
            }


# Global registry instance
_tool_registry: Optional[DatabaseToolRegistry] = None


def get_tool_registry() -> DatabaseToolRegistry:
    """Get or create the global database tool registry."""
    global _tool_registry
    if _tool_registry is None:
        _tool_registry = DatabaseToolRegistry()
    return _tool_registry
