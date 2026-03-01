"""Google Drive — list, download, upload, or delete files in Google Drive."""

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
            "Make sure your Service Account JSON is valid and the Drive API is enabled.",
            "GoogleDrive",
        )


class GoogleDrive(BaseNode):
    definition = NodeDefinition(
        type="GoogleDrive",
        display_name="Google Drive",
        description="Upload files to, download files from, or list files in Google Drive.",
        category="Integrations",
        icon="📁",
        color="#4285F4",
        is_trigger=False,
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
                    SelectOption(value="upload", label="Upload Text File"),
                    SelectOption(value="delete", label="Delete File"),
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
                name="file_id",
                display_name="File ID",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Google Drive file ID. Required for Download and Delete.",
                placeholder="1ABC123def...",
            ),
            NodeParameter(
                name="folder_id",
                display_name="Folder ID",
                type=ParameterType.STRING,
                required=False,
                description="Folder to list or upload into. Leave blank for root (shared drives use folder ID).",
                placeholder="1ABC123def...",
            ),
            NodeParameter(
                name="file_name",
                display_name="File Name",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Name for the uploaded file. Required for Upload.",
                placeholder="my-file.txt",
            ),
            NodeParameter(
                name="file_content",
                display_name="File Content",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Text content to upload. Required for Upload.",
                placeholder="Hello from NexAgent!",
            ),
            NodeParameter(
                name="query",
                display_name="Search Query",
                type=ParameterType.STRING,
                required=False,
                description="Drive query filter for List, e.g. name contains 'report'. Leave blank to list all.",
                placeholder="name contains 'report'",
            ),
            NodeParameter(
                name="limit",
                display_name="Limit",
                type=ParameterType.NUMBER,
                required=False,
                default=20,
                description="Max number of files to return for List (max 100).",
            ),
        ],
        outputs=[
            NodeOutputField(name="file_id", display_name="File ID", type="string"),
            NodeOutputField(name="name", display_name="File Name", type="string"),
            NodeOutputField(name="url", display_name="Web View URL", type="string"),
            NodeOutputField(name="content", display_name="File Content", type="string"),
            NodeOutputField(name="files", display_name="Files List", type="array"),
            NodeOutputField(name="operation", display_name="Operation", type="string"),
        ],
    )

    SCOPES = ["https://www.googleapis.com/auth/drive"]
    BASE = "https://www.googleapis.com/drive/v3"

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        operation = config.get("operation", "list")
        credentials_json = str(config.get("credentials_json") or "").strip()

        if not credentials_json:
            raise NodeExecutionError(
                "Service Account JSON is required. Paste the contents of your Google credential JSON file.",
                self.definition.type,
            )

        token = _get_token(credentials_json, self.SCOPES)
        auth_headers = {"Authorization": f"Bearer {token}"}

        try:
            import httpx

            async with httpx.AsyncClient(timeout=30) as client:

                if operation == "list":
                    limit = min(int(config.get("limit") or 20), 100)
                    folder_id = str(config.get("folder_id") or "").strip()
                    query = str(config.get("query") or "").strip()

                    q_parts = ["trashed = false"]
                    if folder_id:
                        q_parts.append(f"'{folder_id}' in parents")
                    if query:
                        q_parts.append(query)

                    params = {
                        "pageSize": limit,
                        "fields": "files(id,name,mimeType,webViewLink,size,createdTime)",
                        "q": " and ".join(q_parts),
                    }
                    r = await client.get(f"{self.BASE}/files", headers=auth_headers, params=params)
                    result = r.json()
                    if "error" in result:
                        raise NodeExecutionError(
                            f"Drive API error: {result['error']['message']}", self.definition.type
                        )

                    files = result.get("files", [])
                    return {
                        "files": files,
                        "file_id": files[0]["id"] if files else "",
                        "name": files[0]["name"] if files else "",
                        "url": files[0].get("webViewLink", "") if files else "",
                        "content": "",
                        "operation": "list",
                    }

                elif operation == "download":
                    file_id = str(config.get("file_id") or "").strip()
                    if not file_id:
                        raise NodeExecutionError(
                            "File ID is required for Download.", self.definition.type
                        )

                    # Get file metadata first
                    meta_r = await client.get(
                        f"{self.BASE}/files/{file_id}",
                        headers=auth_headers,
                        params={"fields": "id,name,mimeType,webViewLink"},
                    )
                    meta = meta_r.json()
                    if "error" in meta:
                        raise NodeExecutionError(
                            f"Drive API error: {meta['error']['message']}", self.definition.type
                        )

                    # Download content
                    content_r = await client.get(
                        f"{self.BASE}/files/{file_id}",
                        headers=auth_headers,
                        params={"alt": "media"},
                    )

                    return {
                        "file_id": file_id,
                        "name": meta.get("name", ""),
                        "url": meta.get("webViewLink", ""),
                        "content": content_r.text,
                        "files": [],
                        "operation": "download",
                    }

                elif operation == "upload":
                    file_name = str(config.get("file_name") or "").strip()
                    file_content = str(config.get("file_content") or "")
                    folder_id = str(config.get("folder_id") or "").strip()

                    if not file_name:
                        raise NodeExecutionError(
                            "File Name is required for Upload.", self.definition.type
                        )

                    metadata: Dict[str, Any] = {"name": file_name}
                    if folder_id:
                        metadata["parents"] = [folder_id]

                    # Multipart upload
                    import httpx
                    boundary = "nexagent_boundary_12345"
                    meta_bytes = json.dumps(metadata).encode()
                    content_bytes = file_content.encode()

                    body = (
                        f"--{boundary}\r\n"
                        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
                    ).encode() + meta_bytes + (
                        f"\r\n--{boundary}\r\n"
                        "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
                    ).encode() + content_bytes + f"\r\n--{boundary}--".encode()

                    r = await client.post(
                        "https://www.googleapis.com/upload/drive/v3/files",
                        headers={
                            **auth_headers,
                            "Content-Type": f"multipart/related; boundary={boundary}",
                        },
                        params={"uploadType": "multipart", "fields": "id,name,webViewLink"},
                        content=body,
                    )
                    result = r.json()
                    if "error" in result:
                        raise NodeExecutionError(
                            f"Drive API error: {result['error']['message']}", self.definition.type
                        )

                    return {
                        "file_id": result.get("id", ""),
                        "name": result.get("name", file_name),
                        "url": result.get("webViewLink", ""),
                        "content": "",
                        "files": [],
                        "operation": "upload",
                    }

                elif operation == "delete":
                    file_id = str(config.get("file_id") or "").strip()
                    if not file_id:
                        raise NodeExecutionError(
                            "File ID is required for Delete.", self.definition.type
                        )

                    r = await client.delete(
                        f"{self.BASE}/files/{file_id}", headers=auth_headers
                    )
                    if r.status_code not in (200, 204):
                        try:
                            err = r.json()
                            raise NodeExecutionError(
                                f"Drive API error: {err['error']['message']}", self.definition.type
                            )
                        except NodeExecutionError:
                            raise
                        except Exception:
                            raise NodeExecutionError(
                                f"Delete failed with status {r.status_code}", self.definition.type
                            )

                    return {
                        "file_id": file_id,
                        "name": "",
                        "url": "",
                        "content": "",
                        "files": [],
                        "operation": "delete",
                    }

                else:
                    raise NodeExecutionError(
                        f"Unknown operation: '{operation}'", self.definition.type
                    )

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(
                f"Google Drive request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
