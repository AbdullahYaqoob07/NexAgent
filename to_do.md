# TODO

- [ ] Implement real API metrics backend and wire it into `get_api_metrics` in `backend/app/services/analytics_service.py` so the System tab can display real per-endpoint metrics instead of an empty state.
- [ ] For the admin Notifications Channels tab, expose a system-level channels configuration endpoint (e.g. `GET /api/v1/notifications/admin/channels-config`) that reports which channels are supported/configured and their usage/error metrics, and update the UI to use this instead of per-user `/notifications/preferences`, removing "Enabled/Disabled for this user" copy.
