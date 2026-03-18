"""Pinecone vector database client for semantic search."""

from __future__ import annotations
from typing import Any, Dict, Optional, List
import logging
import json

from executor.databases.base import DatabaseClient

logger = logging.getLogger(__name__)


class PineconeClient(DatabaseClient):
    """
    Async Pinecone client for vector similarity search.

    Usage:
        client = PineconeClient("api_key", "index_name", "environment")
        await client.connect()
        result = await client.execute("operation:query;vector:[...];top_k:10")
        await client.disconnect()
    """

    def __init__(
        self,
        api_key: str,
        index_name: str,
        environment: str = "us-west1-gcp",
    ) -> None:
        """
        Initialize Pinecone client.

        Args:
            api_key: Pinecone API key
            index_name: Name of the Pinecone index
            environment: Pinecone environment (default: us-west1-gcp)
        """
        self.api_key = api_key
        self.index_name = index_name
        self.environment = environment
        self.index = None
        self.pc = None

    async def connect(self) -> None:
        """Establish connection to Pinecone."""
        try:
            from pinecone import Pinecone

            self.pc = Pinecone(api_key=self.api_key)
            self.index = self.pc.Index(self.index_name)
            logger.info("✅ Connected to Pinecone index '%s'", self.index_name)
        except ImportError:
            raise RuntimeError(
                "Pinecone SDK not installed. Install `pinecone` and remove legacy `pinecone-client`."
            )
        except Exception as exc:
            msg = str(exc)
            if "renamed from `pinecone-client` to `pinecone`" in msg:
                raise RuntimeError(
                    "Legacy `pinecone-client` detected. Uninstall `pinecone-client` and install `pinecone`."
                )
            logger.error("❌ Failed to connect to Pinecone: %s", exc)
            raise

    async def disconnect(self) -> None:
        """Close connection to Pinecone."""
        if self.pc:
            logger.info("✅ Disconnected from Pinecone")

    async def health_check(self) -> bool:
        """Check if Pinecone is reachable."""
        try:
            if not self.index:
                return False
            # Pinecone describe_index_stats is synchronous
            self.index.describe_index_stats()
            return True
        except Exception as exc:
            logger.error("❌ Pinecone health check failed: %s", exc)
            return False

    async def execute(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a Pinecone operation.

        Query format (simple DSL):
            operation:OPERATION;[operation-specific params]

        Operations:
            - query: similarity search
            - upsert: insert/update vectors
            - delete: delete vectors
            - fetch: fetch vectors by ID
            - stats: get index statistics

        Examples:
            "operation:query;vector:[0.1, 0.2, 0.3];top_k:10;filter:{category: tech}"
            "operation:upsert;vectors:[[0.1, 0.2], [0.3, 0.4]];ids:[id1, id2];metadata:{category: tech}"
            "operation:delete;filter:{category: tech}"

        Args:
            query: Pinecone operation string in DSL format
            params: Additional parameters (used for vector embeddings)

        Returns:
            Dict with rows, row_count
        """
        if not self.index:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": "Pinecone not connected",
            }

        try:
            # Parse query string
            parts = {}
            for part in query.split(";"):
                if ":" in part:
                    key, value = part.split(":", 1)
                    parts[key.strip()] = value.strip()

            operation = parts.get("operation", "query").lower()

            if operation == "query":
                return await self._query_operation(parts)
            elif operation == "upsert":
                return await self._upsert_operation(parts)
            elif operation == "delete":
                return await self._delete_operation(parts)
            elif operation == "fetch":
                return await self._fetch_operation(parts)
            elif operation == "stats":
                return await self._stats_operation()
            else:
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": 0,
                    "error": f"Unknown operation: {operation}",
                }

        except Exception as exc:
            logger.error("❌ Pinecone operation failed: %s", exc)
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": str(exc),
            }

    async def _query_operation(self, parts: Dict[str, str]) -> Dict[str, Any]:
        """Execute a similarity search query."""
        vector_str = parts.get("vector", "[]")
        top_k = int(parts.get("top_k", "10"))
        filter_str = parts.get("filter", "{}")

        try:
            vector = json.loads(vector_str)
            filter_dict = json.loads(filter_str) if filter_str != "{}" else None

            # Pinecone query is synchronous
            results = self.index.query(
                vector=vector,
                top_k=top_k,
                filter=filter_dict,
                include_values=True,
                include_metadata=True,
            )

            rows = [
                {
                    "id": match.id,
                    "score": match.score,
                    "values": match.values,
                    "metadata": match.metadata,
                }
                for match in results.matches
            ]

            return {
                "rows": rows,
                "row_count": len(rows),
                "affected_rows": 0,
            }
        except Exception as exc:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": f"Query failed: {exc}",
            }

    async def _upsert_operation(self, parts: Dict[str, str]) -> Dict[str, Any]:
        """Upsert vectors into Pinecone."""
        vectors_str = parts.get("vectors", "[]")
        ids_str = parts.get("ids", "[]")
        metadata_str = parts.get("metadata", "{}")

        try:
            vectors = json.loads(vectors_str)
            ids = json.loads(ids_str)
            metadata = json.loads(metadata_str)

            # Pair vectors with IDs and metadata
            to_upsert = [
                (ids[i], vectors[i], metadata if metadata else None)
                for i in range(min(len(vectors), len(ids)))
            ]

            self.index.upsert(vectors=to_upsert)

            return {
                "rows": [{"upserted": len(to_upsert)}],
                "row_count": 1,
                "affected_rows": len(to_upsert),
            }
        except Exception as exc:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": f"Upsert failed: {exc}",
            }

    async def _delete_operation(self, parts: Dict[str, str]) -> Dict[str, Any]:
        """Delete vectors by filter."""
        filter_str = parts.get("filter", "{}")

        try:
            filter_dict = json.loads(filter_str) if filter_str != "{}" else None
            self.index.delete(filter=filter_dict)

            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 1,
            }
        except Exception as exc:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": f"Delete failed: {exc}",
            }

    async def _fetch_operation(self, parts: Dict[str, str]) -> Dict[str, Any]:
        """Fetch vectors by IDs."""
        ids_str = parts.get("ids", "[]")

        try:
            ids = json.loads(ids_str)
            vectors = self.index.fetch(ids=ids)

            rows = [
                {
                    "id": vid,
                    "values": v.get("values"),
                    "metadata": v.get("metadata"),
                }
                for vid, v in vectors.vectors.items()
            ]

            return {
                "rows": rows,
                "row_count": len(rows),
                "affected_rows": 0,
            }
        except Exception as exc:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": f"Fetch failed: {exc}",
            }

    async def _stats_operation(self) -> Dict[str, Any]:
        """Get index statistics."""
        try:
            stats = self.index.describe_index_stats()
            return {
                "rows": [{
                    "dimension": stats.dimension,
                    "index_fullness": stats.index_fullness,
                    "total_vector_count": stats.total_vector_count,
                }],
                "row_count": 1,
                "affected_rows": 0,
            }
        except Exception as exc:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": f"Stats failed: {exc}",
            }
