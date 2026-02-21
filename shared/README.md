# Shared Resources

This folder contains shared resources used by both frontend and backend.

## nodes-metadata.json

Auto-generated during build by `scripts/generate-nodes-metadata.js`. Contains all node definitions for the workflow system.

**Generated from:** `src/workflows/*/.metadata.ts` files  
**Used by:**
- Frontend: Type-safe imports from `src/workflows/*/`
- Backend: REST call to `/shared/nodes-metadata.json`

Never hand-edit this file. Update the `.metadata.ts` files instead and rebuild.
