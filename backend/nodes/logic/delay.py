"""Delay — pauses workflow execution for a specified duration."""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


_UNIT_TO_MS = {
    "milliseconds": 1,
    "seconds": 1000,
    "minutes": 60_000,
}

# Short aliases sent by the frontend (ms/s/m) mapped to canonical names
_UNIT_ALIASES: dict[str, str] = {
    "ms": "milliseconds",
    "s": "seconds",
    "m": "minutes",
    "millisecond": "milliseconds",
    "second": "seconds",
    "minute": "minutes",
}

_MAX_SLEEP_SECONDS = 3_600  # 1 hour hard cap


class Delay(BaseNode):
    definition = NodeDefinition(
        type="Delay",
        display_name="Delay",
        description="Pause workflow execution for a specified duration before continuing.",
        category="Logic",
        icon="⏱️",
        color="#8B5CF6",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="duration",
                display_name="Duration",
                type=ParameterType.NUMBER,
                required=True,
                default=1,
                description="How long to wait.",
                min_value=0,
            ),
            NodeParameter(
                name="unit",
                display_name="Unit",
                type=ParameterType.OPTIONS,
                required=False,
                default="seconds",
                options=[
                    SelectOption(value="milliseconds", label="Milliseconds"),
                    SelectOption(value="seconds", label="Seconds"),
                    SelectOption(value="minutes", label="Minutes"),
                ],
            ),
        ],
        outputs=[
            NodeOutputField(name="duration", display_name="Duration", type="number",
                            description="Configured delay duration value"),
            NodeOutputField(name="unit", display_name="Unit", type="string",
                            description="Configured delay unit (seconds, minutes, milliseconds)"),
            NodeOutputField(name="actual_duration_ms", display_name="Actual Duration (ms)", type="number"),
            NodeOutputField(name="delayed_until", display_name="Delayed Until", type="string",
                            description="ISO timestamp when the delay ended"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        duration = float(config.get("duration", 1))
        raw_unit = str(config.get("unit", "seconds")).strip().lower()
        # Normalise short aliases (s → seconds, ms → milliseconds, m → minutes)
        unit = _UNIT_ALIASES.get(raw_unit, raw_unit)

        if duration < 0:
            raise NodeExecutionError("Duration must be >= 0", self.definition.type)

        ms_per_unit = _UNIT_TO_MS.get(unit)
        if ms_per_unit is None:
            # Unknown unit — log a warning and default to seconds
            import logging
            logging.getLogger(__name__).warning(
                "Delay node: unknown unit %r, defaulting to seconds", raw_unit
            )
            ms_per_unit = 1000

        sleep_seconds = min((duration * ms_per_unit) / 1000, _MAX_SLEEP_SECONDS)

        import time
        t0 = time.monotonic()
        await asyncio.sleep(sleep_seconds)
        actual_ms = (time.monotonic() - t0) * 1000

        delayed_until = datetime.now(timezone.utc).isoformat()

        return {
            "duration": duration,
            "unit": unit,
            "actual_duration_ms": round(actual_ms, 2),
            "delayed_until": delayed_until,
        }
