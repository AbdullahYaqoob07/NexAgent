import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Credential, 
  CreateCredential, 
  CredentialSchema,
  ShopifyCredential,
  ApiKeyCredential 
} from '@/lib/schemas/credential';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import auditAdminService from '@/lib/api/audit-admin';

const COLLECTION_NAME = 'credentials';

// Service response type
interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Fields that need encryption
const ENCRYPTED_FIELDS = {
  shopify: ['data.accessToken'],
  openai: ['data.apiKey'],
  anthropic: ['data.apiKey'],
  stripe: ['data.apiKey'],
  gmail: ['data.accessToken', 'data.refreshToken'],
  facebook: ['data.accessToken', 'data.refreshToken'],
  instagram: ['data.accessToken', 'data.refreshToken'],
  slack: ['data.accessToken', 'data.refreshToken'],
  webhook: ['data.secret'],
  whatsapp: ['data.token', 'data.webhookVerifyToken'],
};

// Encrypt sensitive fields in credential data
const encryptCredentialData = (credential: any): any => {
  const encrypted = { ...credential };
  const platform = credential.platform as keyof typeof ENCRYPTED_FIELDS;
  const fieldsToEncrypt = ENCRYPTED_FIELDS[platform] || [];
  
  fieldsToEncrypt.forEach(fieldPath => {
    const keys = fieldPath.split('.');
    let current = encrypted;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]]) {
        current = current[keys[i]];
      }
    }
    
    // Encrypt the final field
    const finalKey = keys[keys.length - 1];
    if (current[finalKey]) {
      current[finalKey] = encrypt(current[finalKey]);
    }
  });
  
  return encrypted;
};

// Decrypt sensitive fields in credential data
const decryptCredentialData = (credential: any): any => {
  const decrypted = { ...credential };
  const platform = credential.platform as keyof typeof ENCRYPTED_FIELDS;
  const fieldsToDecrypt = ENCRYPTED_FIELDS[platform] || [];
  
  fieldsToDecrypt.forEach(fieldPath => {
    const keys = fieldPath.split('.');
    let current = decrypted;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]]) {
        current = current[keys[i]];
      }
    }
    
    // Decrypt the final field
    const finalKey = keys[keys.length - 1];
    if (current[finalKey]) {
      try {
        current[finalKey] = decrypt(current[finalKey]);
      } catch (error) {
        console.error(`Failed to decrypt field ${fieldPath}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  });
  
  return decrypted;
};

// Convert Firestore timestamp to Date
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  
  ['createdAt', 'updatedAt', 'lastUsed', 'expiresAt'].forEach(field => {
    if (converted[field] instanceof Timestamp) {
      converted[field] = converted[field].toDate();
    }
  });
  
  // Handle nested timestamps in data field
  if (converted.data?.installedAt instanceof Timestamp) {
    converted.data.installedAt = converted.data.installedAt.toDate();
  }
  
  return converted;
};

// Log audit event for credential operations
const logCredentialAudit = async (
  userId: string,
  action: string,
  credentialId: string,
  credentialName: string,
  platform: string,
  ipAddress?: string,
  userAgent?: string,
  additionalData?: any
) => {
  try {
    const auditData = {
      action: `credential_${action.toLowerCase()}`,
      userId,
      resourceType: 'credential',
      resourceId: credentialId,
      details: {
        credentialName,
        platform,
        ...additionalData
      },
      ipAddress,
      userAgent,
      severity: 'info',
      success: true
    };
    
    await auditAdminService.createAuditLog(auditData);
  } catch (error) {
    console.error('Failed to log credential audit event:', error);
  }
};

export const credentialService = {
  // Create a new credential
  async create(userId: string, credentialData: CreateCredential): Promise<ServiceResponse<Credential>> {
    try {
      // Encrypt sensitive data
      const encryptedData = encryptCredentialData(credentialData);
      
      // Add timestamps and user ID
      const credentialWithMetadata = {
        ...encryptedData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Validate the data
      const validatedCredential = CredentialSchema.parse(credentialWithMetadata);
      
      // Convert dates to Firestore timestamps for storage
      const firestoreData = {
        ...validatedCredential,
        createdAt: Timestamp.fromDate(validatedCredential.createdAt),
        updatedAt: Timestamp.fromDate(validatedCredential.updatedAt),
        lastUsed: validatedCredential.lastUsed ? Timestamp.fromDate(validatedCredential.lastUsed) : null,
        expiresAt: validatedCredential.expiresAt ? Timestamp.fromDate(validatedCredential.expiresAt) : null,
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, COLLECTION_NAME), firestoreData);
      
      // Return the created credential with decrypted data for immediate use
      const decryptedCredential = decryptCredentialData(validatedCredential);
      const result = { ...decryptedCredential, id: docRef.id };
      
      // Log audit event
      await logCredentialAudit(
        userId,
        'created',
        docRef.id,
        credentialWithMetadata.name,
        credentialWithMetadata.platform
      );
      
      return {
        success: true,
        data: result as Credential,
      };
    } catch (error) {
      console.error('Error creating credential:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create credential',
      };
    }
  },

  // Get credential by ID
  async getById(userId: string, credentialId: string): Promise<ServiceResponse<Credential>> {
    try {
      const docRef = doc(db, COLLECTION_NAME, credentialId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Credential not found',
        };
      }
      
      const data = docSnap.data();
      
      // Check if user owns this credential
      if (data.userId !== userId) {
        return {
          success: false,
          error: 'Credential not found',
        };
      }
      
      // Convert timestamps and decrypt sensitive data
      const convertedData = convertTimestamps(data);
      const decryptedCredential = decryptCredentialData(convertedData);
      
      const result = { ...decryptedCredential, id: docSnap.id };
      
      return {
        success: true,
        data: result as Credential,
      };
    } catch (error) {
      console.error('Error fetching credential:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch credential',
      };
    }
  },

  // Get all credentials for a user
  async getByUserId(userId: string, platform?: string): Promise<ServiceResponse<Credential[]>> {
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );
      
      // Filter by platform if specified
      if (platform) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('userId', '==', userId),
          where('platform', '==', platform),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const credentials: Credential[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const convertedData = convertTimestamps(data);
        const decryptedCredential = decryptCredentialData(convertedData);
        credentials.push({ ...decryptedCredential, id: doc.id } as Credential);
      });
      
      return {
        success: true,
        data: credentials,
      };
    } catch (error) {
      console.error('Error fetching credentials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch credentials',
      };
    }
  },

  // Update credential
  async update(userId: string, credentialId: string, updates: Partial<CreateCredential>): Promise<ServiceResponse<Credential>> {
    try {
      // First verify the credential exists and user owns it
      const existing = await this.getById(userId, credentialId);
      if (!existing.success) {
        return existing;
      }
      
      // Encrypt sensitive data in updates
      const encryptedUpdates = encryptCredentialData(updates);
      
      const updateData = {
        ...encryptedUpdates,
        updatedAt: Timestamp.fromDate(new Date()),
      };
      
      const docRef = doc(db, COLLECTION_NAME, credentialId);
      await updateDoc(docRef, updateData);
      
      // Log audit event
      if (existing.success && existing.data) {
        await logCredentialAudit(
          userId,
          'updated',
          credentialId,
          existing.data.name,
          existing.data.platform
        );
      }
      
      // Return updated credential
      return await this.getById(userId, credentialId);
    } catch (error) {
      console.error('Error updating credential:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update credential',
      };
    }
  },

  // Delete credential (soft delete)
  async delete(userId: string, credentialId: string): Promise<ServiceResponse<boolean>> {
    try {
      // First verify the credential exists and user owns it
      const existing = await this.getById(userId, credentialId);
      if (!existing.success) {
        return {
          success: false,
          error: existing.error ?? 'Credential not found',
        };
      }
      
      const docRef = doc(db, COLLECTION_NAME, credentialId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      // Log audit event
      if (existing.success && existing.data) {
        await logCredentialAudit(
          userId,
          'deleted',
          credentialId,
          existing.data.name,
          existing.data.platform
        );
      }
      
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error('Error deleting credential:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete credential',
      };
    }
  },

  // Update last used timestamp
  async updateLastUsed(userId: string, credentialId: string): Promise<ServiceResponse<boolean>> {
    try {
      // First verify the credential exists and user owns it
      const existing = await this.getById(userId, credentialId);
      if (!existing.success) {
        return {
          success: false,
          error: existing.error ?? 'Credential not found',
        };
      }
      
      const docRef = doc(db, COLLECTION_NAME, credentialId);
      await updateDoc(docRef, {
        lastUsed: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });
      
      // Log audit event for credential usage
      if (existing.success && existing.data) {
        await logCredentialAudit(
          userId,
          'used',
          credentialId,
          existing.data.name,
          existing.data.platform,
          undefined,
          undefined,
          { usageType: 'workflow_execution' }
        );
      }
      
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error('Error updating last used:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update last used',
      };
    }
  },

  // Test credential connection
  async testConnection(userId: string, credentialId: string): Promise<ServiceResponse<boolean>> {
    try {
      const credential = await this.getById(userId, credentialId);
      if (!credential.success || !credential.data) {
        return {
          success: false,
          error: credential.error ?? 'Credential not found',
        };
      }
      
      // Test connection based on platform
      switch (credential.data.platform) {
        case 'shopify':
          return await this.testShopifyConnection(credential.data as ShopifyCredential);
        case 'openai':
          return await this.testOpenAIConnection(credential.data as ApiKeyCredential);
        default:
          return {
            success: false,
            error: `Connection testing not implemented for ${credential.data.platform}`,
          };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection',
      };
    }
  },

  // Test Shopify connection
  async testShopifyConnection(credential: ShopifyCredential): Promise<ServiceResponse<boolean>> {
    try {
      const response = await fetch(`https://${credential.data.shopDomain}.myshopify.com/admin/api/${credential.data.apiVersion}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': credential.data.accessToken,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true, data: true };
      } else {
        return {
          success: false,
          error: `Shopify API error: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test Shopify connection',
      };
    }
  },

  // Test OpenAI connection
  async testOpenAIConnection(credential: ApiKeyCredential): Promise<ServiceResponse<boolean>> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${credential.data.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true, data: true };
      } else {
        return {
          success: false,
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test OpenAI connection',
      };
    }
  },
};