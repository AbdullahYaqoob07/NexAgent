"""
Workflow execution initialization with database and MCP setup.

This module handles:
1. Creating database clients from environment and secrets
2. Registering databases in ExecutionContext
3. Initializing MCP client and tool registry
4. Passing all resources to the workflow engine
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from executor.context import ExecutionContext
from executor.databases import (
    PostgresClient,
    MongoDBClient,
    PineconeClient,
)
from ai.mcp.mcp_client import MCPClient, get_mcp_client
from ai.mcp.database_tools import get_tool_registry

logger = logging.getLogger(__name__)


class ExecutionEnvironment:
    """
    Sets up the complete execution environment for a workflow run.

    Responsibilities:
    - Initialize database clients from config
    - Register them in ExecutionContext
    - Set up MCP client
    - Return a ready-to-use ExecutionContext
    """

    @staticmethod
    async def create_context(
        execution_id: str,
        workflow_id: str,
        user_id: str,
        variables: Optional[Dict[str, Any]] = None,
        user_credentials: Optional[Dict[str, str]] = None,
        databases_config: Optional[Dict[str, Any]] = None,
        enable_mcp: bool = True,
    ) -> ExecutionContext:
        """
        Create an ExecutionContext with all resources configured.

        Args:
            execution_id: Unique execution ID
            workflow_id: ID of the workflow being executed
            user_id: ID of the user running the workflow
            variables: Workflow-level variables to seed into execution context
            user_credentials: Decrypted user credentials map for {{$creds.*}} resolution
            databases_config: Optional database configuration
                Example:
                {
                    "postgres": {
                        "connection_string": "postgresql://user:pass@localhost:5432/db"
                    },
                    "mongodb": {
                        "connection_string": "mongodb://localhost:27017",
                        "database_name": "mydb"
                    },
                    "pinecone": {
                        "api_key": "pk-...",
                        "index_name": "my-index",
                        "environment": "us-west1-gcp"
                    }
                }
            enable_mcp: Whether to initialize MCP infrastructure

        Returns:
            Fully initialized ExecutionContext
        """
        context = ExecutionContext(
            execution_id=execution_id,
            workflow_id=workflow_id,
            user_id=user_id,
            variables=variables or {},
            user_credentials=user_credentials or {},
        )

        databases_config = databases_config or ExecutionEnvironment.get_default_config()

        # Initialize and register database clients
        await ExecutionEnvironment._setup_databases(context, databases_config)

        # Initialize and register MCP client
        if enable_mcp:
            await ExecutionEnvironment._setup_mcp(context)

        logger.info(
            "✅ ExecutionContext initialized for workflow %s (execution %s)",
            workflow_id,
            execution_id,
        )

        return context

    @staticmethod
    async def _setup_databases(
        context: ExecutionContext,
        databases_config: Dict[str, Any],
    ) -> None:
        """Initialize and register database clients."""
        logger.info("🗄️  Setting up database clients...")

        # PostgreSQL
        if "postgres" in databases_config:
            try:
                pg_config = databases_config["postgres"]
                conn_string = pg_config.get("connection_string") or os.getenv(
                    "DATABASE_URL",
                    "postgresql://localhost:5432/nexagent"
                )
                client = PostgresClient(conn_string)
                await client.connect()

                health = await client.health_check()
                if health:
                    context.register_database("postgres", client)
                    logger.info("✅ PostgreSQL client registered")
                    # Register it with MCP tool registry too
                    get_tool_registry().register_client("postgres", client)
                else:
                    logger.warning("⚠️  PostgreSQL health check failed, skipping")
            except Exception as exc:
                logger.warning("⚠️  PostgreSQL initialization failed: %s", exc)

        # MongoDB
        if "mongodb" in databases_config:
            try:
                mongo_config = databases_config["mongodb"]
                conn_string = mongo_config.get("connection_string") or os.getenv(
                    "MONGODB_URI",
                    "mongodb://localhost:27017"
                )
                db_name = mongo_config.get("database_name", "nexagent")

                client = MongoDBClient(conn_string, db_name)
                await client.connect()

                health = await client.health_check()
                if health:
                    context.register_database("mongodb", client)
                    logger.info("✅ MongoDB client registered")
                    get_tool_registry().register_client("mongodb", client)
                else:
                    logger.warning("⚠️  MongoDB health check failed, skipping")
            except Exception as exc:
                logger.warning("⚠️  MongoDB initialization failed: %s", exc)

        # Pinecone
        if "pinecone" in databases_config:
            try:
                pinecone_config = databases_config["pinecone"]
                api_key = pinecone_config.get("api_key") or os.getenv("PINECONE_API_KEY")
                index_name = pinecone_config.get("index_name", "default")
                environment = pinecone_config.get("environment", "us-west1-gcp")

                if not api_key:
                    logger.warning("⚠️  Pinecone API key not found, skipping")
                else:
                    client = PineconeClient(api_key, index_name, environment)
                    await client.connect()

                    health = await client.health_check()
                    if health:
                        context.register_database("pinecone", client)
                        logger.info("✅ Pinecone client registered")
                        get_tool_registry().register_client("pinecone", client)
                    else:
                        logger.warning("⚠️  Pinecone health check failed, skipping")
            except Exception as exc:
                logger.warning("⚠️  Pinecone initialization failed: %s", exc)

    @staticmethod
    async def _setup_mcp(context: ExecutionContext) -> None:
        """Initialize and register MCP client."""
        logger.info("🤖 Setting up MCP client...")

        try:
            mcp = get_mcp_client()
            context.set_mcp_client(mcp)

            # Log available tools
            tools = mcp.get_available_tools()
            logger.info("✅ MCP client initialized with %d tool groups", len(tools))
            for tool in tools:
                logger.debug("   - %s: %s", tool.get("name"), tool.get("description"))

        except Exception as exc:
            logger.warning("⚠️  MCP initialization failed: %s", exc)

    @staticmethod
    def get_default_config() -> Dict[str, Any]:
        """
        Load database config from environment variables.

        Expected env vars:
        - DATABASE_URL: PostgreSQL connection string
        - MONGODB_URI: MongoDB connection string
        - MONGODB_DATABASE: Database name (default: nexagent)
        - PINECONE_API_KEY: Pinecone API key
        - PINECONE_INDEX: Pinecone index name
        """
        config = {}

        # PostgreSQL
        if os.getenv("DATABASE_URL"):
            config["postgres"] = {
                "connection_string": os.getenv("DATABASE_URL"),
            }

        # MongoDB
        if os.getenv("MONGODB_URI"):
            config["mongodb"] = {
                "connection_string": os.getenv("MONGODB_URI"),
                "database_name": os.getenv("MONGODB_DATABASE", "nexagent"),
            }

        # Pinecone
        if os.getenv("PINECONE_API_KEY"):
            config["pinecone"] = {
                "api_key": os.getenv("PINECONE_API_KEY"),
                "index_name": os.getenv("PINECONE_INDEX", "default"),
                "environment": os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp"),
            }

        return config

    @staticmethod
    async def cleanup_context(context: ExecutionContext) -> None:
        """
        Clean up database connections when execution completes.

        Args:
            context: ExecutionContext with active database connections
        """
        logger.info("🧹 Cleaning up execution context...")

        for db_type in ["postgres", "mongodb", "pinecone"]:
            db_client = context.get_database(db_type)
            if db_client:
                try:
                    await db_client.disconnect()
                    logger.info("✅ Disconnected from %s", db_type)
                except Exception as exc:
                    logger.warning("⚠️  Failed to disconnect from %s: %s", db_type, exc)
