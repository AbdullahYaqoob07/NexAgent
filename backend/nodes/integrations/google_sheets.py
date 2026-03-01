"""Google Sheets — read from or write to a Google Sheets spreadsheet."""

from __future__ import annotations
import json
from typing import Any, Dict, List
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


def _get_token(credentials_json: str, scopes: List[str]) -> str:
    """Exchange a service account JSON for a short-lived Bearer token."""
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests

        info = json.loads(credentials_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token
    except Exception as exc:
        raise NodeExecutionError(
            f"Failed to authenticate with Google: {exc}. "
            "Make sure your Service Account JSON is valid and the Sheets API is enabled.",
            "GoogleSheets",
        )


class GoogleSheets(BaseNode):
    definition = NodeDefinition(
        type="GoogleSheets",
        display_name="Google Sheets",
        description="Read rows from or append/update rows in a Google Sheets spreadsheet.",
        category="Integrations",
        icon="📊",
        color="#0F9D58",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="read",
                options=[
                    SelectOption(value="read", label="Read Rows"),
                    SelectOption(value="append", label="Append Row"),
                    SelectOption(value="update", label="Update Row"),
                ],
            ),
            NodeParameter(
                name="credentials_json",
                display_name="Service Account JSON",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Paste the full contents of your Google Service Account JSON key file.",
                is_private=True,
            ),
            NodeParameter(
                name="spreadsheet_id",
                display_name="Spreadsheet ID",
                type=ParameterType.STRING,
                required=True,
                description="The ID from the Google Sheets URL — the part between /d/ and /edit.",
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
            ),
            NodeParameter(
                name="range",
                display_name="Range",
                type=ParameterType.STRING,
                required=True,
                default="Sheet1!A1:Z1000",
                description="Cell range in A1 notation, e.g. Sheet1!A1:D100",
                placeholder="Sheet1!A1:Z1000",
            ),
            NodeParameter(
                name="values",
                display_name="Values (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                description='Array of row arrays for append/update, e.g. [["Alice", "30"], ["Bob", "25"]]',
                placeholder='[["Name", "Age"]]',
            ),
        ],
        outputs=[
            NodeOutputField(name="data", display_name="Rows (array)", type="array",
                            description="Array of row objects (first row used as headers for read)"),
            NodeOutputField(name="rows_affected", display_name="Rows Affected", type="number"),
            NodeOutputField(name="range", display_name="Range", type="string"),
            NodeOutputField(name="operation", display_name="Operation", type="string"),
        ],
    )

    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
    BASE = "https://sheets.googleapis.com/v4/spreadsheets"

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "spreadsheet_id", "range")

        operation = config.get("operation", "read")
        credentials_json = str(config.get("credentials_json") or "").strip()
        spreadsheet_id = str(config.get("spreadsheet_id") or "").strip()
        range_ = str(config.get("range") or "Sheet1!A1:Z1000").strip()

        if not credentials_json:
            raise NodeExecutionError(
                "Service Account JSON is required. Paste the contents of your Google credential JSON file.",
                self.definition.type,
            )

        token = _get_token(credentials_json, self.SCOPES)
        headers = {"Authorization": f"Bearer {token}"}

        try:
            import httpx

            async with httpx.AsyncClient(timeout=30) as client:

                if operation == "read":
                    r = await client.get(
                        f"{self.BASE}/{spreadsheet_id}/values/{range_}",
                        headers=headers,
                    )
                    result = r.json()
                    if "error" in result:
                        raise NodeExecutionError(
                            f"Sheets API error: {result['error']['message']}", self.definition.type
                        )

                    rows_raw: List[List] = result.get("values", [])
                    # Convert to list-of-dicts using first row as header
                    if len(rows_raw) > 1:
                        headers_row = rows_raw[0]
                        data = [
                            {headers_row[i] if i < len(headers_row) else f"col{i}": cell
                             for i, cell in enumerate(row)}
                            for row in rows_raw[1:]
                        ]
                    else:
                        data = rows_raw

                    return {
                        "data": data,
                        "rows_affected": len(data),
                        "range": result.get("range", range_),
                        "operation": "read",
                    }

                elif operation == "append":
                    raw_values = config.get("values")
                    if isinstance(raw_values, str):
                        try:
                            values = json.loads(raw_values)
                        except Exception:
                            raise NodeExecutionError(
                                "Values must be a valid JSON array, e.g. [[\"col1\", \"col2\"]]",
                                self.definition.type,
                            )
                    elif isinstance(raw_values, list):
                        values = raw_values
                    else:
                        raise NodeExecutionError(
                            "Values are required for append operation.", self.definition.type
                        )

                    r = await client.post(
                        f"{self.BASE}/{spreadsheet_id}/values/{range_}:append",
                        headers={**headers, "Content-Type": "application/json"},
                        params={"valueInputOption": "USER_ENTERED"},
                        content=json.dumps({"values": values}),
                    )
                    result = r.json()
                    if "error" in result:
                        raise NodeExecutionError(
                            f"Sheets API error: {result['error']['message']}", self.definition.type
                        )

                    updates = result.get("updates", {})
                    return {
                        "data": values,
                        "rows_affected": updates.get("updatedRows", len(values)),
                        "range": updates.get("updatedRange", range_),
                        "operation": "append",
                    }

                elif operation == "update":
                    raw_values = config.get("values")
                    if isinstance(raw_values, str):
                        try:
                            values = json.loads(raw_values)
                        except Exception:
                            raise NodeExecutionError(
                                "Values must be a valid JSON array.", self.definition.type
                            )
                    elif isinstance(raw_values, list):
                        values = raw_values
                    else:
                        raise NodeExecutionError(
                            "Values are required for update operation.", self.definition.type
                        )

                    r = await client.put(
                        f"{self.BASE}/{spreadsheet_id}/values/{range_}",
                        headers={**headers, "Content-Type": "application/json"},
                        params={"valueInputOption": "USER_ENTERED"},
                        content=json.dumps({"range": range_, "values": values}),
                    )
                    result = r.json()
                    if "error" in result:
                        raise NodeExecutionError(
                            f"Sheets API error: {result['error']['message']}", self.definition.type
                        )

                    return {
                        "data": values,
                        "rows_affected": result.get("updatedRows", len(values)),
                        "range": result.get("updatedRange", range_),
                        "operation": "update",
                    }

                else:
                    raise NodeExecutionError(
                        f"Unknown operation: '{operation}'", self.definition.type
                    )

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(
                f"Google Sheets request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
