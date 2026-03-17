"""
Variable resolver — substitutes {{$trigger.x}}, {{$node.id.x}}, {{$vars.x}}, {{$creds.x}}
patterns anywhere in a node's config dict/list/string before execution.

Syntax:
    {{$trigger.field}}              → context.trigger_output["field"]
    {{$node.nodeId.field}}          → context.node_outputs["nodeId"]["field"]
    {{$node.nodeId.nested.path}}    → deep dot-notation access
    {{$vars.varName}}               → context.variables["varName"]
    {{$creds.credName}}             → context.user_credentials["credName"] (decrypted)
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Common field aliases: if the requested field isn't found, try these mappings.
# Lets chatbot-generated references like {{$trigger.timestamp}} resolve even
# when the node outputs it under a different canonical name.
_FIELD_ALIASES: Dict[str, list] = {
    "timestamp":    ["triggered_at", "created_at", "time", "date"],
    "triggered_at": ["timestamp", "time"],
    "message":      ["text", "content", "body", "response"],
    "response":     ["message", "text", "content", "output", "result"],
    "text":         ["message", "content", "response", "body"],
    "content":      ["message", "text", "response", "body"],
    "body":         ["message", "text", "content", "response"],
    "status":       ["status_code", "state"],
    "status_code":  ["status"],
    "result":       ["response", "output", "data", "value"],
    "output":       ["result", "response", "data"],
    "data":         ["result", "output", "response", "rows"],
    "url":          ["file_url", "download_url", "link"],
    "email":        ["to", "recipient"],
    "duration":     ["actual_duration_ms", "delay"],
}

_PATTERN = re.compile(r"\{\{(.*?)\}\}")


def _json_safe_default(obj: Any) -> str:
    """Serialize non-JSON-native objects (e.g., datetime/date) for interpolation."""
    if hasattr(obj, "isoformat"):
        try:
            return obj.isoformat()
        except Exception:
            pass
    return str(obj)


def _deep_get(data: Any, *path: str) -> Any:
    """Navigate a nested dict/list using dot-split keys, with alias fallback."""
    current = data
    for key in path:
        if isinstance(current, dict):
            value = current.get(key)
            if value is None:
                # Try known aliases for this key
                for alias in _FIELD_ALIASES.get(key, []):
                    value = current.get(alias)
                    if value is not None:
                        logger.debug("Field alias resolved: '%s' → '%s'", key, alias)
                        break
            current = value
        elif isinstance(current, list):
            try:
                current = current[int(key)]
            except (ValueError, IndexError):
                return None
        else:
            return None
        if current is None:
            return None
    return current


def _resolve_expression(expr: str, context: "ExecutionContext") -> Any:
    """
    Resolve a single {{...}} expression to its value.

    Returns the raw Python value (not necessarily a string) so that
    numeric config values remain numeric after resolution.
    """
    expr = expr.strip()
    parts = expr.split(".")

    if not parts:
        return f"{{{{{expr}}}}}"

    prefix = parts[0]

    if prefix == "$trigger":
        return _deep_get(context.trigger_output, *parts[1:])

    if prefix == "$node":
        if len(parts) < 2:
            return None
        node_id = parts[1]
        if node_id not in context.node_outputs:
            available = list(context.node_outputs.keys())
            logger.warning(
                "⚠️  $node resolver miss — ID '%s' not found. "
                "Available node IDs: %s",
                node_id,
                available,
            )
            # Return a clear error marker so outputs show what failed
            field = ".".join(parts[2:]) if len(parts) > 2 else ""
            return f"[missing: {node_id}.{field}]" if field else f"[missing: {node_id}]"
        node_output = context.node_outputs[node_id]
        if len(parts) == 2:
            return node_output
        return _deep_get(node_output, *parts[2:])

    if prefix == "$vars":
        if len(parts) < 2:
            return None
        var_name = ".".join(parts[1:])
        return context.variables.get(var_name)

    if prefix == "$creds":
        if len(parts) < 2:
            return None
        cred_name = ".".join(parts[1:])
        value = context.user_credentials.get(cred_name)
        if value is None:
            logger.warning("$creds resolver miss — '%s' not found in user credentials", cred_name)
            return f"[missing credential: {cred_name}]"
        return value

    # Unknown prefix — return original
    logger.warning("Unknown variable prefix in expression: %s", expr)
    return f"{{{{{expr}}}}}"


def _resolve_value(value: Any, context: "ExecutionContext") -> Any:
    """
    Recursively resolve {{...}} patterns in a value.

    - String with a single {{...}} and nothing else → returns the raw value
      (preserving types like int, float, bool, dict).
    - String with text + {{...}} → string interpolation (value cast to str).
    - dict / list → recursively resolved.
    - Anything else → returned as-is.
    """
    if isinstance(value, str):
        matches = list(_PATTERN.finditer(value))
        if not matches:
            return value

        # Pure expression: the entire string is one {{...}} token
        if len(matches) == 1 and matches[0].group(0) == value.strip():
            resolved = _resolve_expression(matches[0].group(1), context)
            return resolved if resolved is not None else value

        # Mixed string: substitute each match as a string
        def _sub(m: re.Match) -> str:
            resolved = _resolve_expression(m.group(1), context)
            if resolved is None:
                return m.group(0)  # leave original if not found
            if isinstance(resolved, (dict, list)):
                return json.dumps(resolved, default=_json_safe_default)
            return str(resolved)

        return _PATTERN.sub(_sub, value)

    if isinstance(value, dict):
        return {k: _resolve_value(v, context) for k, v in value.items()}

    if isinstance(value, list):
        return [_resolve_value(item, context) for item in value]

    return value


def resolve(config: Dict[str, Any], context: "ExecutionContext") -> Dict[str, Any]:
    """
    Return a new config dict with all {{...}} patterns resolved against context.

    The original config dict is not mutated.
    """
    return {key: _resolve_value(val, context) for key, val in config.items()}
