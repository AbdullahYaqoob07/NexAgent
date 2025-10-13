# WhatsApp Node (Cloud API)

This folder contains everything for WhatsApp workflow nodes.

Contents:
- WhatsAppClient.ts: minimal client wrapper for Graph API messages endpoint
- types.ts: shared config types
- WhatsAppActionNode.ts: NodeClass implementation for actions (send text/template, mark read)

Notes:
- For production, resolve credentials server-side (by credentialId) and proxy API calls.
- Ensure tokens are stored encrypted and never logged.