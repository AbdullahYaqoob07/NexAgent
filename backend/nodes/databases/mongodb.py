"""MongoDB Query node — execute operations against a MongoDB collection."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict

from nodes.base import (
    BaseNode,
    NodeDefinition,
    NodeExecutionError,
    NodeOutputField,
    NodeParameter,
    ParameterType,
    SelectOption,
)

logger = logging.getLogger(__name__)


class MongoDBQuery(BaseNode):
    definition = NodeDefinition(
        type="MongoDBQuery",
        display_name="MongoDB Query",
        description="Run find, insert, update, delete, or aggregate operations on a MongoDB collection.",
        category="Databases",
        icon="🍃",
        color="#47A248",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="find",
                description="MongoDB operation to execute.",
                options=[
                    SelectOption(value="find", label="Find — Query documents"),
                    SelectOption(value="find_one", label="Find One — Single document"),
                    SelectOption(value="insert_one", label="Insert One — Add a document"),
                    SelectOption(value="insert_many", label="Insert Many — Add multiple documents"),
                    SelectOption(value="update_one", label="Update One — Modify first match"),
                    SelectOption(value="update_many", label="Update Many — Modify all matches"),
                    SelectOption(value="delete_one", label="Delete One — Remove first match"),
                    SelectOption(value="delete_many", label="Delete Many — Remove all matches"),
                    SelectOption(value="aggregate", label="Aggregate — Aggregation pipeline"),
                    SelectOption(value="count", label="Count — Count matching documents"),
                ],
            ),
            NodeParameter(
                name="connection_string",
                display_name="Connection String",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="MongoDB connection URL. Format: mongodb://user:password@host:27017",
                placeholder="mongodb://localhost:27017",
                is_private=True,
            ),
            NodeParameter(
                name="database_name",
                display_name="Database Name",
                type=ParameterType.STRING,
                required=True,
                description="Name of the MongoDB database to use.",
                placeholder="mydb",
            ),
            NodeParameter(
                name="collection",
                display_name="Collection",
                type=ParameterType.STRING,
                required=True,
                description="Name of the MongoDB collection to operate on.",
                placeholder="users",
            ),
            NodeParameter(
                name="filter",
                display_name="Filter (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="MongoDB query filter as a JSON object. Supports dot-notation and operators like $eq, $gt, $in.",
                placeholder='{"status": "active", "age": {"$gte": 18}}',
            ),
            NodeParameter(
                name="document",
                display_name="Document (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Document or array of documents for insert operations.",
                placeholder='{"name": "Alice", "email": "alice@example.com"}',
            ),
            NodeParameter(
                name="update",
                display_name="Update (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Update operators object for update operations. Use $set, $unset, $inc, etc.",
                placeholder='{"$set": {"status": "inactive"}}',
            ),
            NodeParameter(
                name="pipeline",
                display_name="Pipeline (JSON Array)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Aggregation pipeline stages as a JSON array.",
                placeholder='[{"$match": {"active": true}}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]',
            ),
            NodeParameter(
                name="projection",
                display_name="Projection (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Fields to include (1) or exclude (0) in find results.",
                placeholder='{"_id": 0, "name": 1, "email": 1}',
            ),
            NodeParameter(
                name="sort",
                display_name="Sort (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Sort order as a JSON object. 1 for ascending, -1 for descending.",
                placeholder='{"created_at": -1}',
            ),
            NodeParameter(
                name="limit",
                display_name="Limit",
                type=ParameterType.NUMBER,
                required=False,
                default=100,
                description="Maximum number of documents to return for find queries.",
                min_value=1,
                max_value=10000,
            ),
            NodeParameter(
                name="skip",
                display_name="Skip",
                type=ParameterType.NUMBER,
                required=False,
                default=0,
                description="Number of documents to skip (for pagination).",
                min_value=0,
            ),
            NodeParameter(
                name="upsert",
                display_name="Upsert",
                type=ParameterType.BOOLEAN,
                required=False,
                default=False,
                description="If true, insert the document if no match found during update.",
            ),
        ],
        outputs=[
            NodeOutputField(
                name="documents",
                display_name="Documents",
                type="array",
                description="Array of returned documents.",
            ),
            NodeOutputField(
                name="document_count",
                display_name="Document Count",
                type="number",
                description="Number of documents returned.",
            ),
            NodeOutputField(
                name="affected_count",
                display_name="Affected Count",
                type="number",
                description="Number of documents added, modified, or deleted.",
            ),
            NodeOutputField(
                name="first_document",
                display_name="First Document",
                type="object",
                description="The first document in the result, or empty object.",
            ),
            NodeOutputField(
                name="inserted_id",
                display_name="Inserted ID",
                type="string",
                description="The _id of the newly inserted document (for insert_one).",
            ),
            NodeOutputField(
                name="success",
                display_name="Success",
                type="boolean",
                description="Whether the operation completed without errors.",
            ),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        operation = config.get("operation", "find")
        connection_string = str(config.get("connection_string") or "").strip()
        database_name = str(config.get("database_name") or "").strip()
        collection = str(config.get("collection") or "").strip()

        if not connection_string:
            raise NodeExecutionError(
                "MongoDB connection string is required.",
                self.definition.type,
            )
        if not database_name:
            raise NodeExecutionError(
                "Database name is required.",
                self.definition.type,
            )
        if not collection:
            raise NodeExecutionError(
                "Collection name is required.",
                self.definition.type,
            )

        logger.info("🍃 MongoDB: Running %s on %s.%s", operation, database_name, collection)

        # Parse JSON fields
        filter_doc = self._parse_json(config.get("filter"), "Filter", {})
        document = self._parse_json(config.get("document"), "Document", None)
        update_doc = self._parse_json(config.get("update"), "Update", None)
        pipeline = self._parse_json(config.get("pipeline"), "Pipeline", [])
        projection = self._parse_json(config.get("projection"), "Projection", None)
        sort_doc = self._parse_json(config.get("sort"), "Sort", None)
        limit = int(config.get("limit") or 100)
        skip = int(config.get("skip") or 0)
        upsert = bool(config.get("upsert", False))

        # Try pre-registered client first
        client = None
        if hasattr(context, "get_database"):
            client = context.get_database("mongodb")

        owns_client = False
        if client is None:
            try:
                from executor.databases.mongodb import MongoDBClient

                client = MongoDBClient(connection_string, database_name)
                await client.connect()
                owns_client = True
            except Exception as exc:
                raise NodeExecutionError(
                    f"Failed to connect to MongoDB: {exc}",
                    self.definition.type,
                )

        # Expose the connected client for downstream AI tool usage in the same execution.
        registered_for_reuse = False
        if hasattr(context, "register_database"):
            try:
                context.register_database("mongodb", client)
                registered_for_reuse = True
            except Exception as exc:
                logger.debug("MongoDB: context registration skipped: %s", exc)

        try:
            from ai.mcp.database_tools import get_tool_registry

            get_tool_registry().register_client("mongodb", client)
        except Exception as exc:
            logger.debug("MongoDB: MCP registry registration skipped: %s", exc)

        try:
            # Build the DSL query string used by MongoDBClient
            result = await self._run_operation(
                client, operation, collection,
                filter_doc, document, update_doc,
                pipeline, projection, sort_doc,
                limit, skip, upsert,
            )

            if "error" in result and result["error"]:
                raise NodeExecutionError(
                    f"MongoDB operation failed: {result['error']}",
                    self.definition.type,
                )

            docs = result.get("rows", result.get("documents", []))
            count = result.get("row_count", result.get("document_count", len(docs)))
            affected = result.get("affected_rows", result.get("affected_count", 0))
            first = docs[0] if docs else {}
            inserted_id = str(result.get("inserted_id", "")) if result.get("inserted_id") else ""

            return {
                "documents": docs,
                "document_count": count,
                "affected_count": affected,
                "first_document": first,
                "inserted_id": inserted_id,
                "success": True,
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error("MongoDB node error: %s", exc)
            raise NodeExecutionError(str(exc), self.definition.type)
        finally:
            if owns_client and not registered_for_reuse:
                await client.disconnect()

    # ------------------------------------------------------------------
    # Operation dispatcher (direct motor calls)
    # ------------------------------------------------------------------

    async def _run_operation(
        self, client, operation, collection,
        filter_doc, document, update_doc,
        pipeline, projection, sort_doc,
        limit, skip, upsert,
    ) -> Dict[str, Any]:
        """
        Use the motor client directly for fine-grained control.
        Falls back to MongoDBClient.execute() DSL if db attribute unavailable.
        """
        db = getattr(client, "db", None)

        if db is None:
            # Fall back to DSL-based execution
            dsl = self._build_dsl(
                operation, collection, filter_doc, document,
                update_doc, pipeline, sort_doc, limit, skip, upsert,
            )
            return await client.execute(dsl)

        coll = db[collection]

        try:
            if operation in ("find", "find_one"):
                kwargs: Dict[str, Any] = {}
                if projection:
                    kwargs["projection"] = projection
                if sort_doc:
                    kwargs["sort"] = list(sort_doc.items())
                if operation == "find_one":
                    doc = await coll.find_one(filter_doc or {}, **kwargs)
                    docs = [doc] if doc else []
                    return {"rows": docs, "row_count": len(docs), "affected_rows": 0}
                else:
                    cursor = coll.find(filter_doc or {}, **kwargs).skip(skip).limit(limit)
                    docs = await cursor.to_list(length=limit)
                    # Convert ObjectId to string
                    docs = self._serialize_docs(docs)
                    return {"rows": docs, "row_count": len(docs), "affected_rows": 0}

            elif operation == "insert_one":
                if document is None:
                    raise NodeExecutionError("Document is required for insert_one.", self.definition.type)
                result = await coll.insert_one(document)
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": 1,
                    "inserted_id": str(result.inserted_id),
                }

            elif operation == "insert_many":
                if not document:
                    raise NodeExecutionError("Document array is required for insert_many.", self.definition.type)
                docs_list = document if isinstance(document, list) else [document]
                result = await coll.insert_many(docs_list)
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": len(result.inserted_ids),
                    "inserted_id": str(result.inserted_ids[0]) if result.inserted_ids else "",
                }

            elif operation in ("update_one", "update_many"):
                if update_doc is None:
                    raise NodeExecutionError(f"Update operators required for {operation}.", self.definition.type)
                kwargs = {"upsert": upsert}
                if operation == "update_one":
                    result = await coll.update_one(filter_doc or {}, update_doc, **kwargs)
                else:
                    result = await coll.update_many(filter_doc or {}, update_doc, **kwargs)
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": result.modified_count,
                }

            elif operation in ("delete_one", "delete_many"):
                if operation == "delete_one":
                    result = await coll.delete_one(filter_doc or {})
                else:
                    result = await coll.delete_many(filter_doc or {})
                return {
                    "rows": [],
                    "row_count": 0,
                    "affected_rows": result.deleted_count,
                }

            elif operation == "aggregate":
                if not pipeline:
                    raise NodeExecutionError("Pipeline is required for aggregate.", self.definition.type)
                cursor = coll.aggregate(pipeline)
                docs = await cursor.to_list(length=limit)
                docs = self._serialize_docs(docs)
                return {"rows": docs, "row_count": len(docs), "affected_rows": 0}

            elif operation == "count":
                count = await coll.count_documents(filter_doc or {})
                return {"rows": [], "row_count": count, "affected_rows": 0}

            else:
                raise NodeExecutionError(f"Unknown operation: {operation}", self.definition.type)

        except NodeExecutionError:
            raise
        except Exception as exc:
            return {"error": str(exc), "rows": [], "row_count": 0, "affected_rows": 0}

    def _build_dsl(
        self, operation, collection, filter_doc, document,
        update_doc, pipeline, sort_doc, limit, skip, upsert,
    ) -> str:
        """Build DSL string for MongoDBClient.execute() fallback."""
        parts = [f"collection:{collection}"]
        # Map operation names to DSL format
        op_map = {
            "find": "find", "find_one": "find",
            "insert_one": "insert", "insert_many": "insert",
            "update_one": "update", "update_many": "update",
            "delete_one": "delete", "delete_many": "delete",
            "aggregate": "aggregate", "count": "count",
        }
        parts.append(f"operation:{op_map.get(operation, operation)}")
        if filter_doc:
            parts.append(f"filter:{json.dumps(filter_doc)}")
        if document is not None:
            parts.append(f"document:{json.dumps(document)}")
        if update_doc is not None:
            parts.append(f"update:{json.dumps(update_doc)}")
        if pipeline:
            parts.append(f"pipeline:{json.dumps(pipeline)}")
        parts.append(f"limit:{limit}")
        parts.append(f"skip:{skip}")
        return ";".join(parts)

    def _serialize_docs(self, docs: list) -> list:
        """Convert ObjectId and other non-serializable types to strings."""
        result = []
        for doc in docs:
            serialized = {}
            for k, v in doc.items():
                try:
                    json.dumps(v)
                    serialized[k] = v
                except (TypeError, ValueError):
                    serialized[k] = str(v)
            result.append(serialized)
        return result

    def _parse_json(self, value: Any, field_name: str, default: Any) -> Any:
        """Parse a potentially string-encoded JSON value."""
        if value is None or value == "":
            return default
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                raise NodeExecutionError(
                    f"{field_name} must be valid JSON. Got: {value[:100]}",
                    self.definition.type,
                )
        return default
