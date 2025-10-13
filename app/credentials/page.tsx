"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Key,
  Zap,
  MessageCircle,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon
} from "lucide-react";
import { ShopifyConnectionModal } from "@/components/integrations/ShopifyConnectionModal";
import { WhatsAppConnectionModal } from "@/components/integrations/WhatsAppConnectionModal";
import { FacebookConnectionModal } from "@/components/integrations/FacebookConnectionModal";
import { InstagramConnectionModal } from "@/components/integrations/InstagramConnectionModal";
import { toast } from "sonner";

interface Credential {
  id: string;
  name: string;
  platform: string;
  status: 'active' | 'inactive' | 'expired' | 'error';
  createdAt: string;
  lastUsed?: string;
  metadata?: {
    shopName?: string;
    shopOwner?: string;
    shopEmail?: string;
    planName?: string;
  };
}

const PLATFORM_CONFIG = {
  shopify: {
    name: 'Shopify',
    icon: ShoppingBag,
    color: '#96bf48',
    description: 'Connect your Shopify store to trigger workflows on orders, customers, and products',
    category: 'ecommerce' as const,
  },
  openai: {
    name: 'OpenAI',
    icon: Zap,
    color: '#10A37F',
    description: 'Add AI capabilities to your workflows with GPT models',
    category: 'llms' as const,
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    description: 'Connect WhatsApp Cloud API to send/receive messages and trigger workflows',
    category: 'social' as const,
  },
  facebook: {
    name: 'Facebook',
    icon: FacebookIcon,
    color: '#1877F2',
    description: 'Connect your Facebook Page for messaging, comments, and insights',
    category: 'social' as const,
  },
  instagram: {
    name: 'Instagram',
    icon: InstagramIcon,
    color: '#E1306C',
    description: 'Connect your Instagram Business Account for media and messaging',
    category: 'social' as const,
  },
} as const;

const CATEGORY_LABELS: Record<'all' | 'llms' | 'social' | 'ecommerce', string> = {
  all: 'All',
  llms: 'LLMs',
  social: 'Social Media',
  ecommerce: 'E‑commerce',
};

export default function CredentialsPage() {
  const { user, loading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);

  // Filters & search
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
  const [browseCategory, setBrowseCategory] = useState<'all' | 'llms' | 'social' | 'ecommerce'>('all');

  // Surface redirects (success/error) from OAuth callback
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  useEffect(() => {
    if (searchParams) {
      const connected = searchParams.get('connected');
      const errorParam = searchParams.get('error');
      const shopName = searchParams.get('shopName');

      if (connected === 'shopify') {
        toast.success(`Shopify ${shopName ? `(${shopName}) ` : ''}connected successfully!`);
        const url = new URL(window.location.href);
        url.searchParams.delete('connected');
        url.searchParams.delete('credentialId');
        url.searchParams.delete('shopName');
        window.history.replaceState({}, '', url.toString());
      }

      if (connected === 'facebook') {
        toast.success('Facebook connected successfully!');
        const url = new URL(window.location.href);
        url.searchParams.delete('connected');
        url.searchParams.delete('credentialId');
        window.history.replaceState({}, '', url.toString());
      }

      if (connected === 'instagram') {
        toast.success('Instagram connected successfully!');
        const url = new URL(window.location.href);
        url.searchParams.delete('connected');
        url.searchParams.delete('credentialId');
        window.history.replaceState({}, '', url.toString());
      }

      if (errorParam) {
        toast.error(errorParam);
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  // Fetch user credentials
  useEffect(() => {
    if (user) {
      fetchCredentials();
    }
  }, [user]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const token = await authService.getUserToken();
      const response = await fetch('/api/credentials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setCredentials(result.data || []);
      } else {
        toast.error('Failed to load credentials');
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const deleteCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this credential? This will affect any workflows using it.')) {
      return;
    }

    try {
      const token = await authService.getUserToken();
      const response = await fetch(`/api/credentials/${credentialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Credential deleted successfully');
        await fetchCredentials(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to delete credential');
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete credential');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', variant: 'default' as const, icon: CheckCircle },
      inactive: { label: 'Inactive', variant: 'secondary' as const, icon: AlertCircle },
      expired: { label: 'Expired', variant: 'destructive' as const, icon: AlertCircle },
      error: { label: 'Error', variant: 'destructive' as const, icon: AlertCircle }
    };

    const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.inactive;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 text-center max-w-4xl mx-auto">
          <p className="text-white/80">Please sign in to manage your credentials.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Credentials</h1>
        <p className="text-muted-foreground mt-2">
          Manage your platform integrations and API connections. These credentials are used by your workflows to connect to external services.
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-md">
          <TabsTrigger value="browse" className="text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white">Browse Integrations</TabsTrigger>
          <TabsTrigger value="connected" className="text-white/60 data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white">My Credentials</TabsTrigger>
        </TabsList>

        {/* Connected Tab */}
        <TabsContent value="connected" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search credentials by name or platform..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Object.keys(PLATFORM_CONFIG).map((p) => (
                  <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p as keyof typeof PLATFORM_CONFIG].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-white/5 border border-white/10 text-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials
                    .filter(c => (platformFilter === 'all' || c.platform === platformFilter))
                    .filter(c => (statusFilter === 'all' || c.status === statusFilter))
                    .filter(c => {
                      const term = search.toLowerCase();
                      if (!term) return true;
                      return (
                        c.name.toLowerCase().includes(term) ||
                        c.platform.toLowerCase().includes(term)
                      );
                    })
                    .map((c) => {
                      const pf = PLATFORM_CONFIG[c.platform as keyof typeof PLATFORM_CONFIG];
                      const Icon = pf?.icon || Key;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded" style={{ backgroundColor: pf?.color || '#666' }} />
                            {pf?.name || c.platform}
                          </TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{c.lastUsed ? new Date(c.lastUsed).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => deleteCredential(c.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {credentials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-white/70 py-10">No credentials yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Category filter */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/70">Category</div>
            <div className="flex gap-2">
              {(['all','llms','social','ecommerce'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setBrowseCategory(c)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${browseCategory===c ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/60 hover:text-white border-white/10'}`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <Command className="rounded-lg border border-white/10 bg-neutral-900 text-white">
            <CommandInput placeholder="Search integrations..." className="bg-transparent text-white placeholder:text-white/50" />
            <CommandEmpty className="text-white/60">No integrations found.</CommandEmpty>
            <CommandGroup heading="Integrations" className="text-white/60">
              {Object.entries(PLATFORM_CONFIG)
                .filter(([_, cfg]) => browseCategory === 'all' || cfg.category === browseCategory)
                .map(([platform, cfg]) => (
                <CommandItem key={platform} value={`${cfg.name} ${platform}`} className="group flex items-center justify-between hover:bg-white/10 data-[selected=true]:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: cfg.color }} />
                    <div>
                      <div className="font-medium text-white/80 group-hover:text-white">{cfg.name}</div>
                      <div className="text-xs text-white/60">{cfg.description}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                    onClick={() => {
                      if (platform === 'shopify') setShowShopifyModal(true);
                      else if (platform === 'whatsapp') setShowWhatsAppModal(true);
                      else if (platform === 'facebook') setShowFacebookModal(true);
                      else if (platform === 'instagram') setShowInstagramModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1 text-white" /> Connect
                  </Button>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </TabsContent>
      </Tabs>

      {/* Shopify Connection Modal */}
      <ShopifyConnectionModal
        open={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onConnectionSuccess={() => {
          setShowShopifyModal(false);
          fetchCredentials();
          toast.success('Shopify store connected successfully!');
        }}
      />

      {/* WhatsApp Connection Modal */}
      <WhatsAppConnectionModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConnectionSuccess={() => {
          setShowWhatsAppModal(false);
          fetchCredentials();
          toast.success('WhatsApp connected successfully!');
        }}
      />

      {/* Facebook Connection Modal */}
      <FacebookConnectionModal
        open={showFacebookModal}
        onClose={() => setShowFacebookModal(false)}
        onConnectionSuccess={() => {
          setShowFacebookModal(false);
          fetchCredentials();
          toast.success('Facebook connected successfully!');
        }}
      />

      {/* Instagram Connection Modal */}
      <InstagramConnectionModal
        open={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
        onConnectionSuccess={() => {
          setShowInstagramModal(false);
          fetchCredentials();
          toast.success('Instagram connected successfully!');
        }}
      />
    </div>
    </DashboardLayout>
  );
}
