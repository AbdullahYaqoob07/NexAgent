"""Schedule — triggers a workflow on a cron schedule."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class Schedule(BaseNode):
    definition = NodeDefinition(
        type="Schedule",
        display_name="Schedule",
        description="Trigger a workflow automatically on a cron schedule.",
        category="Triggers",
        icon="🕐",
        color="#3B82F6",
        is_trigger=True,
        parameters=[
            NodeParameter(
                name="cron",
                display_name="Cron Expression",
                type=ParameterType.STRING,
                required=True,
                default="0 9 * * *",
                description="Cron expression (e.g. '0 9 * * *' = daily at 9am)",
                placeholder="0 9 * * *",
            ),
            NodeParameter(
                name="timezone",
                display_name="Timezone",
                type=ParameterType.STRING,
                required=False,
                default="UTC",
                description="IANA timezone name (e.g. 'America/New_York')",
                placeholder="UTC",
            ),
        ],
        outputs=[
            NodeOutputField(name="triggered_at", display_name="Triggered At", type="string"),
            NodeOutputField(name="cron", display_name="Cron Expression", type="string"),
            NodeOutputField(name="timezone", display_name="Timezone", type="string"),
            NodeOutputField(name="next_run", display_name="Next Run", type="string",
                            description="ISO timestamp of the next scheduled run"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        # Accept "cron" (new field name) or "frequency" (old field name from NodeDefinitions)
        cron = config.get("cron") or config.get("frequency", "0 9 * * *")
        timezone = config.get("timezone", "UTC")

        next_run = self._calculate_next_run(cron, timezone)

        return {
            "triggered_at": self._now_iso(),
            "cron": cron,
            "timezone": timezone,
            "next_run": next_run,
        }

    def _calculate_next_run(self, cron: str, timezone: str) -> str:
        try:
            from croniter import croniter
            from datetime import datetime
            import pytz

            tz = pytz.timezone(timezone)
            now = datetime.now(tz)
            it = croniter(cron, now)
            next_dt = it.get_next(datetime)
            return next_dt.isoformat()
        except Exception:
            return ""
