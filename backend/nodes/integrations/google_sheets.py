"""Google Sheets — read from or write to a Google Sheets spreadsheet."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class GoogleSheets(BaseNode):
    definition = NodeDefinition(
        type="GoogleSheets",
        display_name="Google Sheets",
        description="Read rows from or append/update rows in a Google Sheets spreadsheet.",
        category="Integrations",
        icon="📊",
        color="#0F9D58",
        is_trigger=False,
        required_credentials=["google_sheets_credentials"],
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
                name="spreadsheet_id",
                display_name="Spreadsheet ID",
                type=ParameterType.STRING,
                required=True,
                description="The ID from the Google Sheets URL (between /d/ and /edit)",
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
            ),
            NodeParameter(
                name="range",
                display_name="Range",
                type=ParameterType.STRING,
                required=True,
                default="Sheet1!A1:Z1000",
                description="Cell range in A1 notation",
                placeholder="Sheet1!A1:Z1000",
            ),
            NodeParameter(
                name="values",
                display_name="Values (for append/update)",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Array of values to write, e.g. [['col1', 'col2']]",
            ),
            NodeParameter(
                name="credentials",
                display_name="Google Credentials",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Google Service Account JSON. Store in Credentials.",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="data", display_name="Data", type="array",
                            description="Array of rows returned (for read operation)"),
            NodeOutputField(name="rows_affected", display_name="Rows Affected", type="number"),
            NodeOutputField(name="range", display_name="Range", type="string"),
            NodeOutputField(name="operation", display_name="Operation", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "spreadsheet_id", "range")

        raise NodeExecutionError(
            "Google Sheets integration requires Google Service Account credentials. "
            "Please configure the 'google_sheets_credentials' credential in your account settings, "
            "then this node will use the Google Sheets API to read/write data.",
            self.definition.type,
        )
