"""Pinecone Query node — semantic search and vector operations on Pinecone indexes."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

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


class PineconeQuery(BaseNode):
    definition = NodeDefinition(
        type="PineconeQuery",
        display_name="Pinecone Query",
        description=(
            "Query, upsert, fetch, or delete vectors in a Pinecone index. "
            "Perfect for semantic search, RAG pipelines, and similarity matching."
        ),
        category="Databases",
        icon="🌲",
        color="#1B1F23",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="query",
                description="Pinecone operation to perform.",
                options=[
                    SelectOption(value="query", label="Query — Semantic similarity search"),
                    SelectOption(value="upsert", label="Upsert — Insert or update vectors"),
                    SelectOption(value="fetch", label="Fetch — Get vectors by ID"),
                    SelectOption(value="delete", label="Delete — Remove vectors by ID"),
                    SelectOption(value="stats", label="Stats — Index statistics"),
                    SelectOption(value="list", label="List — List vector IDs"),
                ],
            ),
            NodeParameter(
                name="api_key",
                display_name="API Key",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Pinecone API key from your Pinecone console.",
                placeholder="pcsk_...",
                is_private=True,
            ),
            NodeParameter(
                name="index_name",
                display_name="Index Name",
                type=ParameterType.STRING,
                required=True,
                description="Name of the Pinecone index to operate on.",
                placeholder="my-embeddings",
            ),
            NodeParameter(
                name="environment",
                display_name="Environment",
                type=ParameterType.STRING,
                required=False,
                default="us-east-1",
                description="Pinecone environment or region (e.g. us-east-1, eu-west1-gcp). Required for older Pinecone plans.",
                placeholder="us-east-1",
            ),
            NodeParameter(
                name="namespace",
                display_name="Namespace",
                type=ParameterType.STRING,
                required=False,
                default="",
                description="Pinecone namespace for multi-tenant isolation. Leave empty for default.",
                placeholder="my-namespace",
            ),
            # ── Query fields ──────────────────────────────────────────
            NodeParameter(
                name="vector",
                display_name="Query Vector (JSON Array)",
                type=ParameterType.EXPRESSION,
                required=False,
                description=(
                    "Dense embedding vector to search with (for Query operation). "
                    "JSON array of floats, e.g. [0.1, 0.2, -0.5, ...]"
                ),
                placeholder="[0.1, 0.2, 0.3]",
            ),
            NodeParameter(
                name="top_k",
                display_name="Top K Results",
                type=ParameterType.NUMBER,
                required=False,
                default=10,
                description="Number of most similar vectors to return.",
                min_value=1,
                max_value=10000,
            ),
            NodeParameter(
                name="include_metadata",
                display_name="Include Metadata",
                type=ParameterType.BOOLEAN,
                required=False,
                default=True,
                description="Whether to include vector metadata in query results.",
            ),
            NodeParameter(
                name="include_values",
                display_name="Include Vectors",
                type=ParameterType.BOOLEAN,
                required=False,
                default=False,
                description="Whether to include vector values in query results.",
            ),
            NodeParameter(
                name="metadata_filter",
                display_name="Metadata Filter (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Filter query results by metadata fields. Supports $eq, $ne, $in, $nin, $lt, $lte, $gt, $gte.",
                placeholder='{"category": {"$eq": "science"}}',
            ),
            # ── Upsert fields ─────────────────────────────────────────
            NodeParameter(
                name="vectors",
                display_name="Vectors (JSON Array)",
                type=ParameterType.EXPRESSION,
                required=False,
                description=(
                    "Array of vector objects for upsert. Each object must have 'id', 'values', and optionally 'metadata'.\n"
                    'Example: [{"id": "v1", "values": [0.1, 0.2], "metadata": {"text": "Hello"}}]'
                ),
                placeholder='[{"id": "v1", "values": [0.1, 0.2], "metadata": {"text": "sample"}}]',
            ),
            # ── Fetch / Delete fields ─────────────────────────────────
            NodeParameter(
                name="ids",
                display_name="Vector IDs (JSON Array)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Array of vector IDs for fetch or delete operations.",
                placeholder='["id1", "id2", "id3"]',
            ),
        ],
        outputs=[
            NodeOutputField(
                name="matches",
                display_name="Matches",
                type="array",
                description="Array of similar vectors (for query). Each has id, score, metadata.",
            ),
            NodeOutputField(
                name="match_count",
                display_name="Match Count",
                type="number",
                description="Number of matches returned.",
            ),
            NodeOutputField(
                name="top_match",
                display_name="Top Match",
                type="object",
                description="The highest-scoring match (most similar vector).",
            ),
            NodeOutputField(
                name="upserted_count",
                display_name="Upserted Count",
                type="number",
                description="Number of vectors upserted.",
            ),
            NodeOutputField(
                name="fetched_vectors",
                display_name="Fetched Vectors",
                type="object",
                description="Map of vector ID → vector data (for fetch).",
            ),
            NodeOutputField(
                name="stats",
                display_name="Index Stats",
                type="object",
                description="Index statistics (for stats operation).",
            ),
            NodeOutputField(
                name="vector_ids",
                display_name="Vector IDs",
                type="array",
                description="List of vector IDs (for list operation).",
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
        operation = config.get("operation", "query")
        api_key = str(config.get("api_key") or "").strip()
        index_name = str(config.get("index_name") or "").strip()

        if not api_key:
            raise NodeExecutionError("Pinecone API key is required.", self.definition.type)
        if not index_name:
            raise NodeExecutionError("Pinecone index name is required.", self.definition.type)

        environment = str(config.get("environment") or "us-east-1").strip()
        namespace = str(config.get("namespace") or "").strip()
        top_k = int(config.get("top_k") or 10)
        include_metadata = bool(config.get("include_metadata", True))
        include_values = bool(config.get("include_values", False))

        logger.info("🌲 Pinecone: Running %s on index '%s'", operation, index_name)

        # Parse complex fields
        vector = self._parse_json(config.get("vector"), "Vector", None)
        vectors = self._parse_json(config.get("vectors"), "Vectors", None)
        ids = self._parse_json(config.get("ids"), "IDs", None)
        metadata_filter = self._parse_json(config.get("metadata_filter"), "Metadata Filter", None)

        # Try pre-registered client first
        client = None
        if hasattr(context, "get_database"):
            client = context.get_database("pinecone")

        owns_client = False
        if client is None:
            try:
                from executor.databases.pinecone import PineconeClient

                client = PineconeClient(api_key, index_name, environment)
                await client.connect()
                owns_client = True
            except Exception as exc:
                raise NodeExecutionError(
                    f"Failed to connect to Pinecone: {exc}",
                    self.definition.type,
                )

        # Expose the connected client for downstream AI tool usage in the same execution.
        registered_for_reuse = False
        if hasattr(context, "register_database"):
            try:
                context.register_database("pinecone", client)
                registered_for_reuse = True
            except Exception as exc:
                logger.debug("Pinecone: context registration skipped: %s", exc)

        try:
            from ai.mcp.database_tools import get_tool_registry

            get_tool_registry().register_client("pinecone", client)
        except Exception as exc:
            logger.debug("Pinecone: MCP registry registration skipped: %s", exc)

        try:
            result = await self._run_operation(
                client, operation,
                vector=vector,
                vectors=vectors,
                ids=ids,
                top_k=top_k,
                namespace=namespace,
                include_metadata=include_metadata,
                include_values=include_values,
                metadata_filter=metadata_filter,
            )

            if "error" in result and result["error"]:
                raise NodeExecutionError(
                    f"Pinecone operation failed: {result['error']}",
                    self.definition.type,
                )

            return result

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error("Pinecone node error: %s", exc)
            raise NodeExecutionError(str(exc), self.definition.type)
        finally:
            if owns_client and not registered_for_reuse:
                await client.disconnect()

    # ------------------------------------------------------------------
    # Operation dispatcher
    # ------------------------------------------------------------------

    async def _run_operation(
        self,
        client,
        operation: str,
        *,
        vector: Optional[List[float]],
        vectors: Optional[list],
        ids: Optional[list],
        top_k: int,
        namespace: str,
        include_metadata: bool,
        include_values: bool,
        metadata_filter: Optional[dict],
    ) -> Dict[str, Any]:
        """
        Run the Pinecone operation. Tries direct SDK calls via client.index,
        falls back to client.execute() DSL if index attribute unavailable.
        """
        index = getattr(client, "index", None)

        if index is None:
            # Fallback: DSL execution
            dsl = self._build_dsl(
                operation, vector, vectors, ids,
                top_k, namespace, metadata_filter,
            )
            raw = await client.execute(dsl)
            return self._normalize_result(operation, raw)

        try:
            ns_kwargs = {"namespace": namespace} if namespace else {}

            if operation == "query":
                if vector is None:
                    raise NodeExecutionError(
                        "Query Vector is required for query operation.",
                        self.definition.type,
                    )
                query_kwargs: Dict[str, Any] = {
                    "vector": vector,
                    "top_k": top_k,
                    "include_metadata": include_metadata,
                    "include_values": include_values,
                    **ns_kwargs,
                }
                if metadata_filter:
                    query_kwargs["filter"] = metadata_filter

                response = index.query(**query_kwargs)
                matches = [
                    {
                        "id": m["id"],
                        "score": m.get("score", 0.0),
                        "metadata": m.get("metadata", {}),
                        "values": m.get("values", []) if include_values else [],
                    }
                    for m in (response.get("matches") or [])
                ]
                return {
                    "matches": matches,
                    "match_count": len(matches),
                    "top_match": matches[0] if matches else {},
                    "upserted_count": 0,
                    "fetched_vectors": {},
                    "stats": {},
                    "vector_ids": [],
                    "success": True,
                }

            elif operation == "upsert":
                if not vectors:
                    raise NodeExecutionError(
                        "Vectors array is required for upsert operation.",
                        self.definition.type,
                    )
                response = index.upsert(vectors=vectors, **ns_kwargs)
                return {
                    "matches": [],
                    "match_count": 0,
                    "top_match": {},
                    "upserted_count": response.get("upserted_count", len(vectors)),
                    "fetched_vectors": {},
                    "stats": {},
                    "vector_ids": [],
                    "success": True,
                }

            elif operation == "fetch":
                if not ids:
                    raise NodeExecutionError(
                        "IDs array is required for fetch operation.",
                        self.definition.type,
                    )
                response = index.fetch(ids=ids, **ns_kwargs)
                fetched = {}
                vectors_map = response.get("vectors") or {}
                for vid, vdata in vectors_map.items():
                    fetched[vid] = {
                        "id": vid,
                        "values": vdata.get("values", []),
                        "metadata": vdata.get("metadata", {}),
                    }
                return {
                    "matches": [],
                    "match_count": 0,
                    "top_match": {},
                    "upserted_count": 0,
                    "fetched_vectors": fetched,
                    "stats": {},
                    "vector_ids": list(fetched.keys()),
                    "success": True,
                }

            elif operation == "delete":
                if not ids:
                    raise NodeExecutionError(
                        "IDs array is required for delete operation.",
                        self.definition.type,
                    )
                index.delete(ids=ids, **ns_kwargs)
                return {
                    "matches": [],
                    "match_count": 0,
                    "top_match": {},
                    "upserted_count": 0,
                    "fetched_vectors": {},
                    "stats": {},
                    "vector_ids": ids,
                    "success": True,
                }

            elif operation == "stats":
                response = index.describe_index_stats()
                stats = {
                    "total_vector_count": response.get("total_vector_count", 0),
                    "dimension": response.get("dimension", 0),
                    "index_fullness": response.get("index_fullness", 0.0),
                    "namespaces": response.get("namespaces", {}),
                }
                return {
                    "matches": [],
                    "match_count": 0,
                    "top_match": {},
                    "upserted_count": 0,
                    "fetched_vectors": {},
                    "stats": stats,
                    "vector_ids": [],
                    "success": True,
                }

            elif operation == "list":
                response = index.list(**ns_kwargs)
                vector_ids = [v["id"] for v in (response.get("vectors") or [])]
                return {
                    "matches": [],
                    "match_count": len(vector_ids),
                    "top_match": {},
                    "upserted_count": 0,
                    "fetched_vectors": {},
                    "stats": {},
                    "vector_ids": vector_ids,
                    "success": True,
                }

            else:
                raise NodeExecutionError(f"Unknown operation: {operation}", self.definition.type)

        except NodeExecutionError:
            raise
        except Exception as exc:
            return {
                "error": str(exc),
                "matches": [],
                "match_count": 0,
                "top_match": {},
                "upserted_count": 0,
                "fetched_vectors": {},
                "stats": {},
                "vector_ids": [],
                "success": False,
            }

    def _build_dsl(
        self, operation, vector, vectors, ids,
        top_k, namespace, metadata_filter,
    ) -> str:
        """Build DSL for PineconeClient.execute() fallback."""
        if operation == "query" and vector:
            parts = [f"operation:query", f"vector:{json.dumps(vector)}", f"top_k:{top_k}"]
            if namespace:
                parts.append(f"namespace:{namespace}")
            if metadata_filter:
                parts.append(f"filter:{json.dumps(metadata_filter)}")
            return ";".join(parts)
        elif operation == "stats":
            return "operation:stats"
        elif operation == "upsert" and vectors:
            return f"operation:upsert;vectors:{json.dumps(vectors)}"
        return f"operation:{operation}"

    def _normalize_result(self, operation: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a DSL-based result into the standard output format."""
        base = {
            "matches": raw.get("matches", []),
            "match_count": raw.get("match_count", 0),
            "top_match": raw.get("top_match", {}),
            "upserted_count": raw.get("upserted_count", 0),
            "fetched_vectors": raw.get("fetched_vectors", {}),
            "stats": raw.get("stats", {}),
            "vector_ids": raw.get("vector_ids", []),
            "success": not bool(raw.get("error")),
        }
        if raw.get("error"):
            base["error"] = raw["error"]
        return base

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
