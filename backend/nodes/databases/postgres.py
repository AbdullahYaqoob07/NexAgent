"""PostgreSQL Query node — execute SQL queries against a PostgreSQL database."""

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


class PostgresQuery(BaseNode):
    definition = NodeDefinition(
        type="PostgresQuery",
        display_name="PostgreSQL Query",
        description="Execute SQL queries (SELECT, INSERT, UPDATE, DELETE) against a PostgreSQL database.",
        category="Databases",
        icon="🐘",
        color="#336791",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="select",
                description="Type of SQL operation to perform.",
                options=[
                    SelectOption(value="select", label="SELECT — Query rows"),
                    SelectOption(value="insert", label="INSERT — Add rows"),
                    SelectOption(value="update", label="UPDATE — Modify rows"),
                    SelectOption(value="delete", label="DELETE — Remove rows"),
                    SelectOption(value="raw", label="RAW SQL — Custom query"),
                ],
            ),
            NodeParameter(
                name="connection_string",
                display_name="Connection String",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="PostgreSQL connection URL. Format: postgresql://user:password@host:5432/database",
                placeholder="postgresql://user:password@localhost:5432/mydb",
                is_private=True,
            ),
            NodeParameter(
                name="table",
                display_name="Table Name",
                type=ParameterType.STRING,
                required=False,
                description="Table to query. Used for SELECT, INSERT, UPDATE, DELETE operations.",
                placeholder="users",
            ),
            NodeParameter(
                name="columns",
                display_name="Columns",
                type=ParameterType.STRING,
                required=False,
                default="*",
                description="Comma-separated columns to select. Use * for all columns.",
                placeholder="id, name, email",
            ),
            NodeParameter(
                name="where_clause",
                display_name="WHERE Clause",
                type=ParameterType.EXPRESSION,
                required=False,
                description="SQL WHERE clause (without the WHERE keyword). Supports {{$node.x.y}} expressions.",
                placeholder="id = 1 AND active = true",
            ),
            NodeParameter(
                name="data",
                display_name="Data (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="JSON object or array of objects for INSERT/UPDATE. Keys must match column names.",
                placeholder='{"name": "Alice", "email": "alice@example.com"}',
            ),
            NodeParameter(
                name="order_by",
                display_name="ORDER BY",
                type=ParameterType.STRING,
                required=False,
                description="Column(s) to sort by, optionally with ASC/DESC.",
                placeholder="created_at DESC",
            ),
            NodeParameter(
                name="limit",
                display_name="Limit",
                type=ParameterType.NUMBER,
                required=False,
                default=100,
                description="Maximum number of rows to return for SELECT queries.",
                min_value=1,
                max_value=10000,
            ),
            NodeParameter(
                name="raw_sql",
                display_name="Raw SQL Query",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Custom SQL query for the RAW operation. Overrides all other query fields.",
                placeholder="SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'",
            ),
            NodeParameter(
                name="return_mode",
                display_name="Return Mode",
                type=ParameterType.OPTIONS,
                required=False,
                default="all",
                description="How many rows to return from SELECT queries.",
                options=[
                    SelectOption(value="all", label="All rows"),
                    SelectOption(value="first", label="First row only"),
                ],
            ),
        ],
        outputs=[
            NodeOutputField(
                name="rows",
                display_name="Rows",
                type="array",
                description="Array of result rows (each row is an object).",
            ),
            NodeOutputField(
                name="row_count",
                display_name="Row Count",
                type="number",
                description="Number of rows returned or affected.",
            ),
            NodeOutputField(
                name="affected_rows",
                display_name="Affected Rows",
                type="number",
                description="Number of rows modified by INSERT/UPDATE/DELETE.",
            ),
            NodeOutputField(
                name="first_row",
                display_name="First Row",
                type="object",
                description="The first row of the result, or empty object if no rows.",
            ),
            NodeOutputField(
                name="success",
                display_name="Success",
                type="boolean",
                description="Whether the query executed without errors.",
            ),
            NodeOutputField(
                name="sql_executed",
                display_name="SQL Executed",
                type="string",
                description="The actual SQL that was executed.",
            ),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        operation = config.get("operation", "select")
        connection_string = str(config.get("connection_string") or "").strip()

        if not connection_string:
            raise NodeExecutionError(
                "PostgreSQL connection string is required.",
                self.definition.type,
            )

        # Build the SQL query
        sql = self._build_sql(config, operation)

        logger.info("🐘 PostgreSQL: Running %s on %s", operation.upper(), config.get("table", ""))

        # Try to use a pre-registered client from ExecutionContext first
        client = None
        if hasattr(context, "get_database"):
            client = context.get_database("postgres")

        if client is None:
            # Create a fresh client from the provided connection string
            try:
                from executor.databases.postgres import PostgresClient

                client = PostgresClient(connection_string)
                await client.connect()
                owns_client = True
            except Exception as exc:
                raise NodeExecutionError(
                    f"Failed to connect to PostgreSQL: {exc}",
                    self.definition.type,
                )
        else:
            owns_client = False

        # Expose the connected client for downstream AI tool usage in the same execution.
        registered_for_reuse = False
        if hasattr(context, "register_database"):
            try:
                context.register_database("postgres", client)
                registered_for_reuse = True
            except Exception as exc:
                logger.debug("PostgreSQL: context registration skipped: %s", exc)

        try:
            from ai.mcp.database_tools import get_tool_registry

            get_tool_registry().register_client("postgres", client)
        except Exception as exc:
            logger.debug("PostgreSQL: MCP registry registration skipped: %s", exc)

        try:
            result = await client.execute(sql)

            if "error" in result and result["error"]:
                raise NodeExecutionError(
                    f"Query failed: {result['error']}",
                    self.definition.type,
                )

            rows = result.get("rows", [])
            row_count = result.get("row_count", len(rows))
            affected = result.get("affected_rows", 0)

            return_mode = config.get("return_mode", "all")
            first_row = rows[0] if rows else {}

            return {
                "rows": rows if return_mode == "all" else ([first_row] if first_row else []),
                "row_count": row_count,
                "affected_rows": affected,
                "first_row": first_row,
                "success": True,
                "sql_executed": sql,
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error("PostgreSQL node error: %s", exc)
            raise NodeExecutionError(str(exc), self.definition.type)
        finally:
            if owns_client and not registered_for_reuse:
                await client.disconnect()

    # ------------------------------------------------------------------
    # SQL builder helpers
    # ------------------------------------------------------------------

    def _build_sql(self, config: Dict[str, Any], operation: str) -> str:
        """Construct a SQL query from the node config fields."""
        raw_sql = str(config.get("raw_sql") or "").strip()
        if operation == "raw" or (not config.get("table") and raw_sql):
            if not raw_sql:
                raise NodeExecutionError(
                    "A raw SQL query is required when using the RAW operation.",
                    self.definition.type,
                )
            return raw_sql

        table = str(config.get("table") or "").strip()
        if not table:
            raise NodeExecutionError(
                "Table name is required.",
                self.definition.type,
            )

        where = str(config.get("where_clause") or "").strip()
        limit = config.get("limit", 100)
        order_by = str(config.get("order_by") or "").strip()

        if operation == "select":
            columns = str(config.get("columns") or "*").strip()
            sql = f"SELECT {columns} FROM {table}"
            if where:
                sql += f" WHERE {where}"
            if order_by:
                sql += f" ORDER BY {order_by}"
            if limit:
                sql += f" LIMIT {int(limit)}"
            return sql

        if operation in ("insert", "update", "delete"):
            raw_data = config.get("data") or {}
            if isinstance(raw_data, str):
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError:
                    raise NodeExecutionError(
                        f"Data field must be valid JSON. Got: {raw_data[:100]}",
                        self.definition.type,
                    )
            else:
                data = raw_data

        if operation == "insert":
            if not data:
                raise NodeExecutionError("Data is required for INSERT.", self.definition.type)
            if isinstance(data, list):
                # Bulk insert — build VALUES for first row structure
                if not data:
                    raise NodeExecutionError("Data array cannot be empty.", self.definition.type)
                cols = list(data[0].keys())
                col_str = ", ".join(cols)
                rows_values = []
                for row in data:
                    vals = ", ".join(
                        ("NULL" if v is None else f"'{v}'" if isinstance(v, str) else str(v))
                        for v in (row.get(c) for c in cols)
                    )
                    rows_values.append(f"({vals})")
                return f"INSERT INTO {table} ({col_str}) VALUES {', '.join(rows_values)}"
            else:
                cols = list(data.keys())
                col_str = ", ".join(cols)
                vals = ", ".join(
                    ("NULL" if v is None else f"'{v}'" if isinstance(v, str) else str(v))
                    for v in data.values()
                )
                return f"INSERT INTO {table} ({col_str}) VALUES ({vals})"

        if operation == "update":
            if not data:
                raise NodeExecutionError("Data is required for UPDATE.", self.definition.type)
            set_parts = []
            for k, v in data.items():
                if v is None:
                    set_parts.append(f"{k} = NULL")
                elif isinstance(v, str):
                    set_parts.append(f"{k} = '{v}'")
                else:
                    set_parts.append(f"{k} = {v}")
            set_str = ", ".join(set_parts)
            sql = f"UPDATE {table} SET {set_str}"
            if where:
                sql += f" WHERE {where}"
            return sql

        if operation == "delete":
            sql = f"DELETE FROM {table}"
            if where:
                sql += f" WHERE {where}"
            return sql

        raise NodeExecutionError(f"Unknown operation: {operation}", self.definition.type)
