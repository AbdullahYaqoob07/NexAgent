"""
Base database client interface.

All database clients implement this ABC to provide a consistent
query execution interface for both deterministic nodes and MCP tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)


class DatabaseClient(ABC):
    """Abstract base class for all database clients."""

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the database."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the database."""
        pass

    @abstractmethod
    async def execute(self, query: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a query and return results.

        Args:
            query: Query string (SQL for relational DBs, filter for MongoDB, etc.)
            params: Optional parameters for the query

        Returns:
            Dict with keys:
                - rows: List of result rows
                - row_count: Number of rows returned
                - affected_rows: Rows affected by INSERT/UPDATE/DELETE
                - error: Error message if query failed
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the database connection is healthy."""
        pass
