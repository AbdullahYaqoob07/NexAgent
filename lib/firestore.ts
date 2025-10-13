import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { NodeDefinition } from '@/lib/schemas/node';

// Collection names
export const COLLECTIONS = {
  nodeDefinitions: 'nodeDefinitions',
  workflows: 'workflows',
  nodeInstances: 'nodeInstances',
  workflowExecutions: 'workflowExecutions',
  users: 'users'
} as const;

// Node Definitions Service
export class NodeDefinitionsService {
  private collection = COLLECTIONS.nodeDefinitions;

  async getAll(options?: {
    category?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
  }) {
    try {
      console.log('🔍 Fetching nodes from Firestore with options:', options);
      
      const constraints: QueryConstraint[] = [];
      
      if (options?.category) {
        constraints.push(where('category', '==', options.category));
      }
      
      if (options?.isActive !== undefined) {
        constraints.push(where('isActive', '==', options.isActive));
      }
      
      // Simple single-field ordering to avoid composite index requirement
      // We'll sort by category and name in JavaScript instead
      constraints.push(orderBy('name', 'asc'));
      
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collection(db, this.collection), ...constraints);
      console.log('🔍 Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      
      console.log(`🔍 Found ${querySnapshot.docs.length} documents`);
      
      let results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Sort by category first, then by name (client-side to avoid composite index)
      results.sort((a, b) => {
        const categoryCompare = (a.category || '').localeCompare(b.category || '');
        if (categoryCompare !== 0) return categoryCompare;
        return (a.name || '').localeCompare(b.name || '');
      });

      // Client-side search filtering (Firestore doesn't support text search)
      if (options?.search) {
        const searchTerm = options.search.toLowerCase();
        results = results.filter((node: any) => 
          node.name?.toLowerCase().includes(searchTerm) ||
          node.description?.toLowerCase().includes(searchTerm) ||
          node.type?.toLowerCase().includes(searchTerm)
        );
      }

      console.log(`🚀 Returning ${results.length} filtered results`);
      
      return {
        success: true,
        data: results,
        total: results.length
      };
    } catch (error) {
      console.error('❌ Error in NodeDefinitionsService.getAll:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: [],
        total: 0
      };
    }
  }

  async getById(id: string) {
    const docRef = doc(db, this.collection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, error: 'Node not found' };
    }

    return {
      success: true,
      data: {
        id: docSnap.id,
        ...docSnap.data()
      }
    };
  }

  async getByType(type: string) {
    const q = query(
      collection(db, this.collection), 
      where('type', '==', type),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Node not found' };
    }

    const doc = querySnapshot.docs[0];
    return {
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    };
  }

  async create(nodeData: Omit<NodeDefinition, 'id'>) {
    // Check if type already exists
    const existingQuery = query(
      collection(db, this.collection),
      where('type', '==', nodeData.type)
    );
    const existing = await getDocs(existingQuery);
    
    if (!existing.empty) {
      return { success: false, error: 'Node type already exists' };
    }

    const docData = {
      ...nodeData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, this.collection), docData);
    
    return {
      success: true,
      data: {
        id: docRef.id,
        ...docData
      }
    };
  }

  async update(id: string, updates: Partial<NodeDefinition>) {
    const docRef = doc(db, this.collection, id);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, error: 'Node not found' };
    }

    // If updating type, check for conflicts
    if (updates.type && updates.type !== docSnap.data().type) {
      const conflictQuery = query(
        collection(db, this.collection),
        where('type', '==', updates.type)
      );
      const conflictSnap = await getDocs(conflictQuery);
      
      if (!conflictSnap.empty) {
        return { success: false, error: 'Node type already exists' };
      }
    }

    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    await updateDoc(docRef, updateData);
    
    return {
      success: true,
      data: {
        id,
        ...docSnap.data(),
        ...updateData
      }
    };
  }

  async delete(id: string) {
    const docRef = doc(db, this.collection, id);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, error: 'Node not found' };
    }

    // TODO: Check if node is being used in workflows
    // For now, just delete
    await deleteDoc(docRef);
    
    return { success: true, message: 'Node deleted successfully' };
  }

  async updateStatus(id: string, isActive: boolean) {
    const docRef = doc(db, this.collection, id);
    
    await updateDoc(docRef, {
      isActive,
      updatedAt: Timestamp.now()
    });
    
    return { success: true };
  }

  async getCategories() {
    const querySnapshot = await getDocs(collection(db, this.collection));
    const categories = new Set<string>();
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as any;
      if (data.category) {
        categories.add(data.category);
      }
    });

    return Array.from(categories).sort();
  }
}

// Export singleton instance
export const nodeDefinitionsService = new NodeDefinitionsService();