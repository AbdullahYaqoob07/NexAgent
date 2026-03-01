import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
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
    const q = query(
      collection(db, 'marketplace_purchases'),
      where('userId', '==', userId),
      orderBy('purchasedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MarketplacePurchase));
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
};
