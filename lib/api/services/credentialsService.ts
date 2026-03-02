import apiClient from '@/lib/api/client';

export interface CredentialItem {
  name: string;   // normalised key used in {{$creds.name}}
  label: string;  // human-readable label
  hint: string;   // e.g. "••••X1AB"
  createdAt?: string;
}

export const credentialsService = {
  async list(): Promise<CredentialItem[]> {
    const res = await apiClient.get('/api/v1/credentials');
    return res.data as CredentialItem[];
  },

  async save(label: string, value: string): Promise<CredentialItem> {
    const res = await apiClient.post('/api/v1/credentials', { name: label, value });
    return res.data as CredentialItem;
  },

  async delete(name: string): Promise<void> {
    await apiClient.delete(`/api/v1/credentials/${name}`);
  },
};
