"""Google Drive — upload, download, or list files in Google Drive."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class GoogleDrive(BaseNode):
    definition = NodeDefinition(
        type="GoogleDrive",
        display_name="Google Drive",
        description="Upload files to, download files from, or list files in Google Drive.",
        category="Integrations",
        icon="📁",
        color="#4285F4",
        is_trigger=False,
        required_credentials=["google_drive_credentials"],
        parameters=[
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="list",
                options=[
                    SelectOption(value="list", label="List Files"),
                    SelectOption(value="download", label="Download File"),
                    SelectOption(value="upload", label="Upload File"),
                    SelectOption(value="delete", label="Delete File"),
                ],
            ),
            NodeParameter(
                name="file_id",
                display_name="File ID",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Google Drive file ID (required for download, delete, update)",
                placeholder="1ABC123def...",
            ),
            NodeParameter(
                name="folder_id",
                display_name="Folder ID",
                type=ParameterType.STRING,
                required=False,
                description="ID of the folder to list or upload to. Leave blank for root.",
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
            NodeOutputField(name="file_id", display_name="File ID", type="string"),
            NodeOutputField(name="name", display_name="File Name", type="string"),
            NodeOutputField(name="url", display_name="Web View URL", type="string"),
            NodeOutputField(name="files", display_name="Files List", type="array"),
            NodeOutputField(name="operation", display_name="Operation", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        raise NodeExecutionError(
            "Google Drive integration requires Google Service Account credentials. "
            "Please configure the 'google_drive_credentials' credential in your account settings.",
            self.definition.type,
        )
