# NexAgent Class Diagram → Code Map

This document maps the classes and concepts from the **NexAgent System – Class Diagram** to their concrete implementations in the codebase.

> Legend: `TS` = TypeScript (frontend/engine), `API` = API client/service types, `UTIL` = utility/helper.

---

## 1. Core Workflow Domain

**WorkflowSettings**  
- TS: `lib/workflow/types.ts` → `export interface WorkflowSettings`  
- Engine: `lib/workflow/engine/types.ts` → `export interface WorkflowSettings`  
- Usage: Used by `Workflow` (core type) and `WorkflowConfig` (engine config) for timeout/retry/concurrency/errorHandling.

**Workflow**  
- TS: `lib/workflow/types.ts` → `export interface Workflow`  
- API Adapter: `lib/api/adapters/workflowAdapter.ts` → `backendWorkflowToFrontend()` constructs `Workflow` from backend data.  
- Manager: `lib/workflow/WorkflowManager.ts` → `createWorkflow`, `saveWorkflow`, `loadWorkflow`, etc. work with this type.

**WorkflowNode**  
- TS: `lib/workflow/types.ts` → `export interface WorkflowNode`  
- API Adapter: `frontendNodeToBackend` / `backendNodeToFrontend` map this type to/from backend nodes.  
- Engine: `lib/workflow/engine/types.ts` → `WorkflowNodeConfig` is the engine-specific representation used by `WorkflowEngine`.

**NodePort**  
- TS: `lib/workflow/types.ts` → `export interface NodePort`  
- Used in `WorkflowNode.inputs` / `WorkflowNode.outputs` and via `NodeHandler.inputs/outputs`.

**WorkflowConnection**  
- TS: `lib/workflow/types.ts` → `export interface WorkflowConnection`  
- API Adapter: `frontendConnectionToBackendEdge` / `backendEdgeToFrontendConnection` convert to/from backend edges.  
- Engine: `lib/workflow/engine/types.ts` → `WorkflowConnectionConfig` is the simplified version used by `WorkflowEngine`.

**WorkflowExecution**  
- TS: `lib/workflow/types.ts` → `export interface WorkflowExecution`  
- Engine: `lib/workflow/engine/types.ts` → `WorkflowExecutionResult` (older engine result) maps back to `WorkflowExecution` inside `WorkflowManager.executeWorkflow`.  
- Storage: `lib/workflow/storage/*.ts` providers store and load `WorkflowExecution`.

**NodeExecutionLog**  
- TS: `lib/workflow/types.ts` → `export interface NodeExecutionLog`  
- Engine: `AdvancedWorkflowEngine` (`lib/workflow/engine/AdvancedWorkflowEngine.ts`) uses this for in-memory execution logs (`executionLogs: NodeExecutionLog[]`).

**NodeExecutionResult**  
- TS: `lib/workflow/types.ts` → `export interface NodeExecutionResult` (core shape)  
- Engine: `lib/workflow/engine/types.ts` → duplicate `NodeExecutionResult` used by engine-side nodes.  
- Implemented by all engine node classes (see section 3) as the return type of `execute()`.

---

## 2. Engine & Manager

**WorkflowEngine**  
- Implementation: `lib/workflow/engine/WorkflowEngine.ts` → `export class WorkflowEngine`  
- Role: Legacy/alternate engine that executes `WorkflowConfig` using `nodeTypeMapping`, with retry and simple validation (`validateWorkflow`).

**AdvancedWorkflowEngine**  
- Implementation: `lib/workflow/engine/AdvancedWorkflowEngine.ts` → `export class AdvancedWorkflowEngine`  
- Features: topological sort (`getExecutionPlan`), DFS cycle detection (`hasCycle`), fork/parallel branches (`executeForkNode`, `executeParallelBranches`), retry with backoff (`executeWithRetry`), execution context map, and execution logging.

**WorkflowManager**  
- Implementation: `lib/workflow/WorkflowManager.ts` → `export class WorkflowManager` & `export const workflowManager`  
- Responsibilities:
  - Creates workflows (`createWorkflow`).
  - Selects storage provider (Backend/Firestore/Local/InMemory).
  - Converts `Workflow` → `WorkflowConfig` (`convertToWorkflowConfig`).
  - Executes workflows via `AdvancedWorkflowEngine` or `WorkflowEngine` (`executeWorkflow`).
  - Exposes CRUD operations (`saveWorkflow`, `loadWorkflow`, `listWorkflows`, `deleteWorkflow`).

**NodeExecutor**  
- Diagram-level concept is encoded as a TypeScript interface inside the engine, not exported separately:
  - `lib/workflow/engine/AdvancedWorkflowEngine.ts` → `interface NodeExecutor` (lines 28–35).  
  - Fields: `node: WorkflowNode`, `inputConnections`, `outputConnections`, `dependencies`, `dependents`.  
- Used internally by `AdvancedWorkflowEngine.buildExecutionGraph`, `getExecutionPlan`, `executeNodes`, `gatherInputData`, fork logic, etc.

---

## 3. Node Abstraction & Implementations

**NodeClass (engine-level interface)**  
- Implementation: `lib/workflow/engine/types.ts` → `export interface NodeClass`  
- Used by engine node classes in `lib/workflow/engine/nodes/*.ts` and by `nodeTypeMapping`.

**NodeHandler (editor-level abstraction)**  
- Implementation: `lib/workflow/types.ts` → `export interface NodeHandler`  
- Implemented by higher-level editor nodes (e.g., `lib/workflow/nodes/logic/IfNode.ts`) and consumed by `WorkflowValidator`.

### Concrete Engine Nodes (from diagram)

All these implement `NodeClass` from `lib/workflow/engine/types.ts` and live in `lib/workflow/engine/nodes/`.

**OnClickExecuteTrigger**  
- Implementation: `lib/workflow/engine/nodes/OnClickExecuteTriggerNode.ts` → `export class OnClickExecuteTriggerNode implements NodeClass`.

**HttpRequestNode / HTTP Request**  
- Implementation (engine): `lib/workflow/engine/nodes/HttpNode.ts` → `export class HttpNode implements NodeClass` (represents the HTTP Request node).  
- Additional HTTP-related editor node: `lib/workflow/nodes/actions/HttpRequestAction.ts` implements `NodeHandler` for the canvas.

**EmailNode**  
- Implementation: `lib/workflow/engine/nodes/EmailNode.ts` → `export class EmailNode implements NodeClass`.

**IfNode**  
- Engine node: `lib/workflow/engine/nodes/IfNode.ts` → `export class IfNode implements NodeClass`.  
- Editor logic node: `lib/workflow/nodes/logic/IfNode.ts` → `export class IfNode implements NodeHandler`.

**DoubleForkNode**  
- Implementation: `lib/workflow/engine/nodes/DoubleForkNode.ts` → `export class DoubleForkNode implements NodeClass`.

**OpenaiNode**  
- Implementation (engine): `lib/workflow/engine/nodes/OpenAINode.ts` → `export class OpenAINode implements NodeClass`.  
- Additional AI editor node: `lib/workflow/nodes/ai/OpenAINode.ts` implements `NodeHandler`.

> Note: The diagram also shows additional nodes (Schedule triggers, Database, Slack, etc.). Their code lives in the same folder: `lib/workflow/engine/nodes/*.ts` and `lib/workflow/nodes/**`.

---

## 4. Storage Layer

**StorageProvider (interface)**  
- Core type: `lib/workflow/types.ts` → `export interface StorageProvider` (IStorageProvider).  
- Implementations are concrete classes that implement this interface.

**InMemoryStorageProvider**  
- Implementation: `lib/workflow/storage/StorageProvider.ts` → `export class InMemoryStorageProvider`  
- Used by: `WorkflowManager` on server-side (no browser APIs).

**LocalStorageProvider**  
- Implementation: `lib/workflow/storage/StorageProvider.ts` → `export class LocalStorageProvider`  
- Used by: `WorkflowManager` for dev/demo mode when no backend/Firestore.

**FirestoreStorageProvider**  
- Implementation: `lib/workflow/storage/FirestoreStorageProvider.ts` → `export class FirestoreStorageProvider`  
- Includes `sanitizeForFirestore()` for Map/Set/undefined cleaning.  
- Used by: `WorkflowManager` as fallback storage when user has Firebase auth but no backend token.

**BackendStorageProvider**  
- Implementation: `lib/workflow/storage/BackendStorageProvider.ts` → `export class BackendStorageProvider`  
- Delegates to `workflowApi` (`saveWorkflow`, `getWorkflow`, `listWorkflows`) and currently logs execution-related calls.  
- Used by: `WorkflowManager` as the primary storage when the user is authenticated with backend (has backend auth token).

---

## 5. API & Adapter Layer

**apiClient**  
- Implementation: `lib/api/client.ts` → `const apiClient: AxiosInstance` + `export default apiClient`  
- Handles base URL, auth token/session headers, and error handling.

**workflowApi**  
- Implementation: `lib/api/services/workflowApi.ts` → exported functions:  
  - `createWorkflow`, `listWorkflows`, `getWorkflow`, `updateWorkflow`, `deleteWorkflow`, `listPublicWorkflows`, `saveWorkflow`.  
- Used by: `BackendStorageProvider`, UI components, and other services for workflow CRUD.

**workflowAdapter**  
- Implementation: `lib/api/adapters/workflowAdapter.ts`  
- Functions mapping between diagram-level `Workflow` / `WorkflowNode` / `WorkflowConnection` and backend DTOs:  
  - `frontendNodeToBackend`, `frontendConnectionToBackendEdge`,  
  - `backendNodeToFrontend`, `backendEdgeToFrontendConnection`,  
  - `workflowToCreateRequest`, `workflowToUpdateRequest`,  
  - `backendWorkflowToFrontend`, `prepareWorkflowForBackend`.

**Backend Workflow DTOs**  
- Implementation: `lib/api/types/workflow.ts` → `BackendWorkflow`, `BackendWorkflowNode`, `BackendWorkflowEdge`, plus the create/update/list responses & params.

---

## 6. Validation & Utilities

**WorkflowValidator**  
- Implementation: `lib/workflow/utils/WorkflowValidator.ts` → `export class WorkflowValidator`  
- Methods: `validate`, `validateWorkflowStructure`, `validateNodes`, `validateConnections`, `validateNoCircularDependencies`.  
- Works with `Workflow`, `NodeHandler`, and connection graph to enforce structural and business rules.

**Execution Tracker / Logger (supporting diagram concepts)**  
- Logger: `lib/workflow/engine/logger.ts` → `WorkflowLogger` used by `WorkflowEngine` for `ExecutionLog` and summaries (not explicitly shown in the class diagram but part of execution logging).

---

## 7. Summary

For evaluation purposes, every major element in the **NexAgent System Class Diagram** has a corresponding implementation in the repository:

- **Core workflow types** (Workflow, Node, Connection, Settings, Execution, Logs, NodeExecutionResult) → `lib/workflow/types.ts` and `lib/workflow/engine/types.ts`.
- **Engines & manager** (WorkflowEngine, AdvancedWorkflowEngine, WorkflowManager, NodeExecutor) → `lib/workflow/engine/*.ts`, `lib/workflow/WorkflowManager.ts`.
- **Node abstraction & concrete nodes** (NodeClass, specific nodes like If/HTTP/Email/Fork/OpenAI/OnClickTrigger) → `lib/workflow/engine/types.ts`, `lib/workflow/engine/nodes/*.ts`, and editor-level nodes in `lib/workflow/nodes/**`.
- **Storage providers** (InMemory, LocalStorage, Firestore, Backend) → `lib/workflow/storage/*.ts`, wired via `WorkflowManager`.
- **API & adapters** (apiClient, workflowApi, workflowAdapter, backend DTOs) → `lib/api/client.ts`, `lib/api/services/workflowApi.ts`, `lib/api/adapters/workflowAdapter.ts`, `lib/api/types/workflow.ts`.
- **Validation & helpers** (WorkflowValidator and related utilities) → `lib/workflow/utils/WorkflowValidator.ts` and supporting modules.

This file can be extended with additional rows if you add new classes to the class diagram (e.g., analytics, marketplace, billing models).