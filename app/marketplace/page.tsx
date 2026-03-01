'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/AuthContext';
import { useAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MarketplaceView from '@/components/marketplace/MarketplaceView';
import { marketplaceService, MarketplaceNexa } from '@/lib/api/services/marketplaceService';
import { NexaItem } from '@/components/marketplace/MarketplaceView';
import { Store, LayoutGrid, Pencil, Trash2, Download, Star, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Curated dummy NEXAs (always shown first)
const dummyNexas: NexaItem[] = [
  {
    id: '1',
    name: 'Google Sheets Automation',
    category: 'Data Processing',
    rating: 4.8,
    installs: 12500,
    author: 'NexAgent Team',
    price: 'Free',
    updated: '2024-01-15',
    description: 'Automatically sync data between Google Sheets and your workflows. Perfect for data analysis and reporting.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
    tools: ['google', 'excel'],
  },
  {
    id: '2',
    name: 'Slack Integration Hub',
    category: 'Communication',
    rating: 4.6,
    installs: 8900,
    author: 'DevCorp',
    price: '$9.99',
    updated: '2024-01-12',
    description: 'Send notifications, create channels, and manage team communication directly from your workflows.',
    image: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=400&h=200&fit=crop',
    tools: ['slack'],
  },
  {
    id: '3',
    name: 'OpenAI Content Generator',
    category: 'AI & ML',
    rating: 4.9,
    installs: 15600,
    author: 'AI Solutions',
    price: '$19.99',
    updated: '2024-01-18',
    description: "Generate high-quality content using OpenAI's GPT models. Perfect for marketing and content creation.",
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop',
    tools: ['openai'],
  },
  {
    id: '4',
    name: 'JSON Data Processor',
    category: 'Data Processing',
    rating: 4.4,
    installs: 6700,
    author: 'DataFlow Inc',
    price: 'Free',
    updated: '2024-01-10',
    description: 'Parse, transform, and validate JSON data in your workflows with ease.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop',
    tools: ['json'],
  },
  {
    id: '5',
    name: 'Shopify Store Manager',
    category: 'E-commerce',
    rating: 4.7,
    installs: 4200,
    author: 'E-commerce Pro',
    price: '$14.99',
    updated: '2024-01-08',
    description: 'Manage inventory, process orders, and sync product data with your Shopify store.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop',
    tools: ['shopify'],
  },
  {
    id: '6',
    name: 'Google Maps Locator',
    category: 'Location Services',
    rating: 4.5,
    installs: 3800,
    author: 'GeoTech Solutions',
    price: '$7.99',
    updated: '2024-01-05',
    description: 'Integrate location services, geocoding, and map features into your workflows.',
    image: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=400&h=200&fit=crop',
    tools: ['maps', 'google'],
  },
];

function nexaToItem(n: MarketplaceNexa): NexaItem {
  return {
    id: n.id!,
    name: n.name,
    category: n.category,
    rating: n.rating || 0,
    installs: n.downloads || 0,
    author: n.authorName,
    price: n.pricingModel === 'free' ? 'Free' : `$${n.price.toFixed(2)}`,
    updated: n.publishedAt?.toDate ? n.publishedAt.toDate().toLocaleDateString() : 'Recently',
    description: n.description,
    image: '',
    tools: [],
    _raw: n,
  } as NexaItem & { _raw: MarketplaceNexa };
}

const CATEGORIES = ['Automation', 'AI & ML', 'Data Processing', 'Communication', 'E-commerce', 'Finance', 'Productivity', 'Other'];

interface EditForm {
  name: string;
  description: string;
  category: string;
  pricingModel: 'free' | 'paid';
  price: string;
}

export default function MarketplacePage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings'>('browse');

  // Browse tab state
  const [communityNexas, setCommunityNexas] = useState<NexaItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  // My Listings tab state
  const [myNexas, setMyNexas] = useState<MarketplaceNexa[]>([]);
  const [myNexasLoading, setMyNexasLoading] = useState(false);
  const [editingNexa, setEditingNexa] = useState<MarketplaceNexa | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', description: '', category: 'Automation', pricingModel: 'free', price: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load community nexas on mount
  useEffect(() => {
    marketplaceService.listNexas()
      .then((nexas) => setCommunityNexas(nexas.map(nexaToItem)))
      .catch(() => setCommunityNexas([]))
      .finally(() => setCommunityLoading(false));
  }, []);

  // Load my nexas when tab is opened
  useEffect(() => {
    if (activeTab === 'my-listings' && authUser) {
      setMyNexasLoading(true);
      marketplaceService.getMyNexas(authUser.uid)
        .then(setMyNexas)
        .catch((err) => {
          console.error('Failed to load my listings:', err);
          setMyNexas([]);
        })
        .finally(() => setMyNexasLoading(false));
    }
  }, [activeTab, authUser]);

  const handleIntegrate = async (nx: NexaItem) => {
    if (!authUser) return;
    const raw = (nx as any)._raw as MarketplaceNexa | undefined;
    if (!raw) return;
    try {
      const alreadyOwned = await marketplaceService.hasAlreadyPurchased(authUser.uid, raw.id!);
      if (alreadyOwned) { alert('You already have this workflow in your library.'); return; }
      await marketplaceService.purchaseNexa(authUser.uid, raw);
      alert(`"${raw.name}" added to your library! Find it in Workflows → Purchased.`);
    } catch (err: any) {
      alert(`Failed to add workflow: ${err.message}`);
    }
  };

  const openEdit = (nexa: MarketplaceNexa) => {
    setEditForm({
      name: nexa.name,
      description: nexa.description,
      category: nexa.category,
      pricingModel: nexa.pricingModel,
      price: nexa.price > 0 ? String(nexa.price) : '',
    });
    setEditingNexa(nexa);
  };

  const handleSaveEdit = async () => {
    if (!editingNexa?.id) return;
    if (!editForm.name.trim()) { alert('Name is required'); return; }
    if (editForm.pricingModel === 'paid' && (!editForm.price || isNaN(Number(editForm.price)) || Number(editForm.price) <= 0)) {
      alert('Enter a valid price'); return;
    }
    setIsSaving(true);
    try {
      await marketplaceService.updateNexa(editingNexa.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        pricingModel: editForm.pricingModel,
        price: editForm.pricingModel === 'paid' ? Number(editForm.price) : 0,
      });
      setMyNexas(prev => prev.map(n => n.id === editingNexa.id
        ? { ...n, name: editForm.name.trim(), description: editForm.description.trim(), category: editForm.category, pricingModel: editForm.pricingModel, price: editForm.pricingModel === 'paid' ? Number(editForm.price) : 0 }
        : n
      ));
      setEditingNexa(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (nexa: MarketplaceNexa) => {
    if (!confirm(`Delete "${nexa.name}" from the marketplace? This cannot be undone.`)) return;
    setDeletingId(nexa.id!);
    try {
      await marketplaceService.deleteNexa(nexa.id!);
      setMyNexas(prev => prev.filter(n => n.id !== nexa.id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'browse' ? 'bg-[#FF6900] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Browse
          </button>
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'my-listings' ? 'bg-[#FF6900] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            My Listings
            {myNexas.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'my-listings' ? 'bg-white/20' : 'bg-zinc-700'}`}>
                {myNexas.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Browse tab ── */}
        {activeTab === 'browse' && (
          <MarketplaceView
            nexas={dummyNexas}
            communityNexas={communityNexas}
            communityLoading={communityLoading}
            onIntegrate={handleIntegrate}
          />
        )}

        {/* ── My Listings tab ── */}
        {activeTab === 'my-listings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white">My Listings</h1>
              <p className="text-white/60 mt-1 text-sm">Workflows you've published to the marketplace</p>
            </div>

            {myNexasLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : myNexas.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-16 text-center">
                <div className="w-16 h-16 bg-[#FF6900]/10 border border-[#FF6900]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Store className="w-8 h-8 text-[#FF6900]" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No listings yet</h2>
                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                  Open a workflow in the editor, run it successfully, then click <span className="text-[#FF6900]">Publish</span> to list it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myNexas.map((nexa) => (
                  <ListingRow
                    key={nexa.id}
                    nexa={nexa}
                    onEdit={() => openEdit(nexa)}
                    onDelete={() => handleDelete(nexa)}
                    isDeleting={deletingId === nexa.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingNexa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6900]/10 border border-[#FF6900]/20 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-[#FF6900]" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Edit Listing</h2>
                <p className="text-zinc-400 text-xs">Changes go live immediately</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Name <span className="text-red-400">*</span></label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-[#FF6900]"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Pricing</label>
                <div className="flex gap-2">
                  {(['free', 'paid'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setEditForm(f => ({ ...f, pricingModel: p }))}
                      className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        editForm.pricingModel === p
                          ? 'bg-[#FF6900] border-[#FF6900] text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {editForm.pricingModel === 'paid' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Price (USD) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0.99"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="9.99"
                    className="w-full h-9 pl-7 pr-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900]"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditingNexa(null)}
                className="flex-1 h-9 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 h-9 rounded-xl bg-[#FF6900] hover:bg-[#E55D00] disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Listing row component ────────────────────────────────────────────────────

function ListingRow({
  nexa,
  onEdit,
  onDelete,
  isDeleting,
}: {
  nexa: MarketplaceNexa;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const publishedDate = nexa.publishedAt?.toDate
    ? formatDistanceToNow(nexa.publishedAt.toDate(), { addSuffix: true })
    : 'Recently';

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex items-center gap-5 hover:border-zinc-700 transition-colors">
      {/* Gradient thumbnail */}
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#FF6900]/30 to-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-2xl font-bold text-white/20 select-none">
        {nexa.name.slice(0, 1).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-white font-semibold truncate">{nexa.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${nexa.pricingModel === 'free' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {nexa.pricingModel === 'free' ? 'Free' : `$${nexa.price.toFixed(2)}`}
          </span>
        </div>
        <p className="text-zinc-400 text-xs line-clamp-1 mb-2">{nexa.description || 'No description'}</p>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />{nexa.category}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span className="text-white/70 font-medium">{nexa.downloads.toLocaleString()}</span> installs
          </span>
          {nexa.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400" />
              <span className="text-white/70 font-medium">{nexa.rating.toFixed(1)}</span>
            </span>
          )}
          <span>Published {publishedDate}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
