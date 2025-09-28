'use client';

import { WorkflowEditor } from '@/components/workflows/WorkflowEditor';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function WorkflowEditorPage() {
  return (
    <ErrorBoundary>
      <WorkflowEditor />
    </ErrorBoundary>
  );
}
