import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

export interface MarketplaceNexa {
  id?: string;
  authorId: string;
  authorName: string;
  name: string;
  description: string;
  category: string;
  pricingModel: 'free' | 'paid';
  price: number;
  workflowData: Record<string, any>;
  publishedAt: any;
  downloads: number;
  rating: number;
}

export interface MarketplacePurchase {
  id?: string;
  userId: string;
  nexaId: string;
  nexaName: string;
  authorName: string;
  description: string;
  workflowData: Record<string, any>;
  price: number;
  purchasedAt: any;
}

export const marketplaceService = {
  async publishNexa(
    data: Omit<MarketplaceNexa, 'id' | 'publishedAt' | 'downloads' | 'rating'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, 'marketplace_nexas'), {
      ...data,
      publishedAt: serverTimestamp(),
      downloads: 0,
      rating: 0,
    });
    return docRef.id;
  },

  async listNexas(): Promise<MarketplaceNexa[]> {
    const q = query(
      collection(db, 'marketplace_nexas'),
      orderBy('publishedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MarketplaceNexa));
  },

  async purchaseNexa(userId: string, nexa: MarketplaceNexa): Promise<void> {
    const purchase: Omit<MarketplacePurchase, 'id'> = {
      userId,
      nexaId: nexa.id!,
      nexaName: nexa.name,
      authorName: nexa.authorName,
      description: nexa.description,
      workflowData: nexa.workflowData,
      price: nexa.price,
      purchasedAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'marketplace_purchases'), purchase);
  },

  async getPurchasedNexas(userId: string): Promise<MarketplacePurchase[]> {
    // Only filter by userId — no orderBy on a different field (avoids composite index requirement)
    const q = query(
      collection(db, 'marketplace_purchases'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MarketplacePurchase));
    // Sort client-side: newest first
    return results.sort((a, b) => {
      const ta = (a.purchasedAt as Timestamp)?.toMillis?.() ?? 0;
      const tb = (b.purchasedAt as Timestamp)?.toMillis?.() ?? 0;
      return tb - ta;
    });
  },

  async hasAlreadyPurchased(userId: string, nexaId: string): Promise<boolean> {
    const q = query(
      collection(db, 'marketplace_purchases'),
      where('userId', '==', userId),
      where('nexaId', '==', nexaId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  async getMyNexas(authorId: string): Promise<MarketplaceNexa[]> {
    // Only filter by authorId — no orderBy on a different field (avoids composite index requirement)
    const q = query(
      collection(db, 'marketplace_nexas'),
      where('authorId', '==', authorId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MarketplaceNexa));
    // Sort client-side: newest first
    return results.sort((a, b) => {
      const ta = (a.publishedAt as Timestamp)?.toMillis?.() ?? 0;
      const tb = (b.publishedAt as Timestamp)?.toMillis?.() ?? 0;
      return tb - ta;
    });
  },

  async updateNexa(
    nexaId: string,
    data: Partial<Pick<MarketplaceNexa, 'name' | 'description' | 'category' | 'pricingModel' | 'price'>>
  ): Promise<void> {
    await updateDoc(doc(db, 'marketplace_nexas', nexaId), data);
  },

  async deleteNexa(nexaId: string): Promise<void> {
    await deleteDoc(doc(db, 'marketplace_nexas', nexaId));
  },
};
