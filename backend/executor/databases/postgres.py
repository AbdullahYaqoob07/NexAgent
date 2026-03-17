"""PostgreSQL database client for async queries."""

from __future__ import annotations
from typing import Any, Dict, Optional
import logging

from executor.databases.base import DatabaseClient

logger = logging.getLogger(__name__)


class PostgresClient(DatabaseClient):
    """
    Async PostgreSQL client using asyncpg.

    Usage:
        client = PostgresClient("postgresql://user:pass@localhost:5432/mydb")
        await client.connect()
        result = await client.execute("SELECT * FROM users WHERE id = $1", {"id": 123})
        await client.disconnect()
    """

    def __init__(self, connection_string: str) -> None:
        """
        Initialize PostgreSQL client.

        Args:
            connection_string: PostgreSQL connection URL
                e.g. "postgresql://user:password@localhost:5432/database"
        """
        self.connection_string = connection_string
        self.pool = None

    async def connect(self) -> None:
        """Establish connection pool to PostgreSQL."""
        try:
            import asyncpg

            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=1,
                max_size=10,
            )
            logger.info("✅ Connected to PostgreSQL")
        except ImportError:
            raise RuntimeError("asyncpg is not installed. Add it to requirements.txt")
        except Exception as exc:
            logger.error("❌ Failed to connect to PostgreSQL: %s", exc)
            raise

    async def disconnect(self) -> None:
        """Close all connections in the pool."""
        if self.pool:
            await self.pool.close()
            logger.info("✅ Disconnected from PostgreSQL")

    async def health_check(self) -> bool:
        """Check if the database is reachable."""
        try:
            if not self.pool:
                return False
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as exc:
            logger.error("❌ PostgreSQL health check failed: %s", exc)
            return False

    async def execute(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a SQL query against PostgreSQL.

        Args:
            query: SQL query string (use $1, $2 etc for parameters)
            params: Dict of named parameters (will be converted to positional)

        Returns:
            Dict with rows, row_count, affected_rows
        """
        if not self.pool:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": "Database not connected",
            }

        try:
            # Convert named params dict to positional args for asyncpg
            param_values = []
            if params:
                # Parse query to extract parameter order ($1, $2, etc)
                import re

                param_positions = sorted(
                    set(int(p) for p in re.findall(r"\$(\d+)", query))
                )
                param_values = [params.get(f"${p}", None) for p in param_positions]

            async with self.pool.acquire() as conn:
                # Detect query type
                query_upper = query.strip().upper()

                if query_upper.startswith("SELECT"):
                    rows = await conn.fetch(query, *param_values)
                    return {
                        "rows": [dict(row) for row in rows],
                        "row_count": len(rows),
                        "affected_rows": 0,
                    }
                elif query_upper.startswith(("INSERT", "UPDATE", "DELETE")):
                    result = await conn.execute(query, *param_values)
                    # result is a string like "INSERT 0 1"
                    affected = int(result.split()[-1]) if result else 0
                    return {
                        "rows": [],
                        "row_count": 0,
                        "affected_rows": affected,
                    }
                else:
                    result = await conn.execute(query, *param_values)
                    return {
                        "rows": [],
                        "row_count": 0,
                        "affected_rows": 0,
                    }

        except Exception as exc:
            logger.error("❌ PostgreSQL query failed: %s", exc)
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": str(exc),
            }
