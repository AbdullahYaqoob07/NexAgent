"""MongoDB database client for async queries."""

from __future__ import annotations
from typing import Any, Dict, Optional
import logging
import json

from executor.databases.base import DatabaseClient

logger = logging.getLogger(__name__)


class MongoDBClient(DatabaseClient):
    """
    Async MongoDB client using motor (async wrapper for pymongo).

    Usage:
        client = MongoDBClient("mongodb://localhost:27017", "mydb")
        await client.connect()
        result = await client.execute("collection:users;filter:{name:John};limit:10")
        await client.disconnect()
    """

    def __init__(self, connection_string: str, database_name: str) -> None:
        """
        Initialize MongoDB client.

        Args:
            connection_string: MongoDB connection URL
            database_name: Name of the database to use
        """
        self.connection_string = connection_string
        self.database_name = database_name
        self.client = None
        self.db = None

    async def connect(self) -> None:
        """Establish connection to MongoDB."""
        try:
            from motor.motor_asyncio import AsyncClient

            self.client = AsyncClient(self.connection_string)
            self.db = self.client[self.database_name]
            # Test connection
            await self.db.command("ping")
            logger.info("✅ Connected to MongoDB database '%s'", self.database_name)
        except ImportError:
            raise RuntimeError("motor is not installed. Add it to requirements.txt")
        except Exception as exc:
            logger.error("❌ Failed to connect to MongoDB: %s", exc)
            raise

    async def disconnect(self) -> None:
        """Close connection to MongoDB."""
        if self.client:
            self.client.close()
            logger.info("✅ Disconnected from MongoDB")

    async def health_check(self) -> bool:
        """Check if the database is reachable."""
        try:
            if not self.db:
                return False
            await self.db.command("ping")
            return True
        except Exception as exc:
            logger.error("❌ MongoDB health check failed: %s", exc)
            return False

    async def execute(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a MongoDB query.

        Query format (simple DSL):
            collection:COLLECTION_NAME;operation:OPERATION;filter:FILTER;limit:LIMIT

        Operations:
            - find: query documents
            - insert: insert a document
            - update: update documents
            - delete: delete documents
            - aggregate: run aggregation pipeline

        Examples:
            "collection:users;operation:find;filter:{name: John};limit:10"
            "collection:users;operation:insert;document:{name: Jane, age: 30}"
            "collection:users;operation:update;filter:{_id: 123};update:{age: 31}"

        Args:
            query: MongoDB query string in DSL format
            params: Additional parameters

        Returns:
            Dict with rows, row_count, affected_rows
        """
        if not self.db:
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": "Database not connected",
            }

        try:
            # Parse query string
            parts = {}
            for part in query.split(";"):
                if ":" in part:
                    key, value = part.split(":", 1)
                    parts[key.strip()] = value.strip()

            collection_name = parts.get("collection", "")
            operation = parts.get("operation", "find").lower()

            if not collection_name:
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": 0,
                    "error": "collection name is required",
                }

            collection = self.db[collection_name]

            if operation == "find":
                filter_str = parts.get("filter", "{}")
                limit = int(parts.get("limit", 100))

                filter_dict = json.loads(filter_str) if filter_str != "{}" else {}
                cursor = collection.find(filter_dict).limit(limit)
                rows = await cursor.to_list(length=limit)

                return {
                    "rows": [self._serialize_doc(doc) for doc in rows],
                    "row_count": len(rows),
                    "affected_rows": 0,
                }

            elif operation == "insert":
                doc_str = parts.get("document", "{}")
                doc = json.loads(doc_str)
                result = await collection.insert_one(doc)
                return {
                    "rows": [{"inserted_id": str(result.inserted_id)}],
                    "row_count": 1,
                    "affected_rows": 1,
                }

            elif operation == "update":
                filter_str = parts.get("filter", "{}")
                update_str = parts.get("update", "{}")
                filter_dict = json.loads(filter_str)
                update_dict = json.loads(update_str)

                result = await collection.update_many(
                    filter_dict, {"$set": update_dict}
                )
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": result.modified_count,
                }

            elif operation == "delete":
                filter_str = parts.get("filter", "{}")
                filter_dict = json.loads(filter_str)
                result = await collection.delete_many(filter_dict)
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": result.deleted_count,
                }

            elif operation == "aggregate":
                pipeline_str = parts.get("pipeline", "[]")
                pipeline = json.loads(pipeline_str)
                cursor = collection.aggregate(pipeline)
                rows = await cursor.to_list(length=None)
                return {
                    "rows": [self._serialize_doc(doc) for doc in rows],
                    "row_count": len(rows),
                    "affected_rows": 0,
                }

            else:
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": 0,
                    "error": f"Unknown operation: {operation}",
                }

        except Exception as exc:
            logger.error("❌ MongoDB query failed: %s", exc)
            return {
                "rows": [],
                "row_count": 0,
                "affected_rows": 0,
                "error": str(exc),
            }

    @staticmethod
    def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to JSON-serializable format."""
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc
