/**
 * Firestore Storage Provider for Workflows and Executions
 */

import { db } from '@/lib/firebase';
import { authService } from '@/lib/auth';
import { 
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
  arrayUnion
} from 'firebase/firestore';
import { Workflow, WorkflowExecution, StorageProvider as IStorageProvider } from '../types';

export class FirestoreStorageProvider implements IStorageProvider {
  private WORKFLOWS_COLLECTION = 'workflows';
  private EXECUTIONS_COLLECTION = 'workflowExecutions';
  private USERS_COLLECTION = 'users';

  private getUserIdOrThrow(): string {
    const uid = authService.getUserId();
    if (!uid) throw new Error('User not authenticated');
    return uid;
  }

  async saveWorkflow(workflow: Workflow): Promise<void> {
    const uid = this.getUserIdOrThrow();

    const workflowRef = doc(db, this.WORKFLOWS_COLLECTION, workflow.id);

    // Persist workflow with ownerId for querying
    await setDoc(workflowRef, {
      ...workflow,
      ownerId: uid,
      updatedAt: new Date().toISOString(),
      // Optionally record server timestamp for backend-side auditing
      _updatedAtTs: serverTimestamp(),
    }, { merge: true });

    // Add workflow reference to user document (array of workflow IDs)
    const userRef = doc(db, this.USERS_COLLECTION, uid);
    try {
      await updateDoc(userRef, {
        workflows: arrayUnion(workflow.id),
        updatedAt: serverTimestamp(),
      } as any);
    } catch (e) {
      // In case user doc doesn't exist via updateDoc, we can set it minimally
      await setDoc(userRef, {
        workflows: [workflow.id],
        updatedAt: serverTimestamp(),
      } as any, { merge: true });
    }
  }

  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflowRef = doc(db, this.WORKFLOWS_COLLECTION, workflowId);
    const snap = await getDoc(workflowRef);
    if (!snap.exists()) return null;
    return snap.data() as Workflow;
  }

  async listWorkflows(): Promise<Workflow[]> {
    const uid = this.getUserIdOrThrow();
    const workflowsRef = collection(db, this.WORKFLOWS_COLLECTION);
    const q = query(workflowsRef, where('ownerId', '==', uid));
    const qs = await getDocs(q);
    return qs.docs.map(d => d.data() as Workflow);
  }

  async saveExecution(execution: WorkflowExecution): Promise<void> {
    const uid = this.getUserIdOrThrow();

    const execRef = doc(db, this.EXECUTIONS_COLLECTION, execution.id);
    await setDoc(execRef, {
      ...execution,
      ownerId: uid,
      _createdAtTs: serverTimestamp(),
    }, { merge: true });
  }

  async loadExecution(executionId: string): Promise<WorkflowExecution | null> {
    const execRef = doc(db, this.EXECUTIONS_COLLECTION, executionId);
    const snap = await getDoc(execRef);
    if (!snap.exists()) return null;
    return snap.data() as WorkflowExecution;
  }

  async listExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const uid = this.getUserIdOrThrow();
    const execsRef = collection(db, this.EXECUTIONS_COLLECTION);

    let q;
    if (workflowId) {
      q = query(execsRef, where('ownerId', '==', uid), where('workflowId', '==', workflowId));
    } else {
      q = query(execsRef, where('ownerId', '==', uid));
    }

    const qs = await getDocs(q);
    return qs.docs.map(d => d.data() as WorkflowExecution);
  }
}
