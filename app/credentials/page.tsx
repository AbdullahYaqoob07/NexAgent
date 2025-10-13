"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  Zap
} from "lucide-react";
import { ShopifyConnectionModal } from "@/components/integrations/ShopifyConnectionModal";
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
    description: 'Connect your Shopify store to trigger workflows on orders, customers, and products'
  },
  openai: {
    name: 'OpenAI',
    icon: Zap,
    color: '#10A37F',
    description: 'Add AI capabilities to your workflows with GPT models'
  },
  // Add more platforms as needed
};

export default function CredentialsPage() {
  const { user, loading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShopifyModal, setShowShopifyModal] = useState(false);

  // Surface redirects (success/error) from OAuth callback
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  useEffect(() => {
    if (searchParams) {
      const connected = searchParams.get('connected');
      const errorParam = searchParams.get('error');
      const shopName = searchParams.get('shopName');

      if (connected === 'shopify') {
        toast.success(`Shopify ${shopName ? `(${shopName}) ` : ''}connected successfully!`);
        // Clean the URL params after showing the toast
        const url = new URL(window.location.href);
        url.searchParams.delete('connected');
        url.searchParams.delete('credentialId');
        url.searchParams.delete('shopName');
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

      {/* Available Platforms */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Integrations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
            const Icon = config.icon;
            const existingCredential = credentials.find(c => c.platform === platform);

            return (
              <Card key={platform} className="relative bg-white/5 border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {config.name}
                        {existingCredential && getStatusBadge(existingCredential.status)}
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {existingCredential ? (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        <div><strong>Connected as:</strong> {existingCredential.name}</div>
                        {existingCredential.metadata?.shopName && (
                          <div><strong>Store:</strong> {existingCredential.metadata.shopName}</div>
                        )}
                        <div><strong>Added:</strong> {new Date(existingCredential.createdAt).toLocaleDateString()}</div>
                        {existingCredential.lastUsed && (
                          <div><strong>Last used:</strong> {new Date(existingCredential.lastUsed).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Settings
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteCredential(existingCredential.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (platform === 'shopify') {
                          setShowShopifyModal(true);
                        }
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Connect {config.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Connected Credentials List */}
      {credentials.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Connected Credentials</h2>
          <div className="space-y-3">
            {credentials.map((credential) => {
              const platformConfig = PLATFORM_CONFIG[credential.platform as keyof typeof PLATFORM_CONFIG];
              const Icon = platformConfig?.icon || Key;

              return (
                <Card key={credential.id} className="bg-white/5 border border-white/10 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: platformConfig?.color || '#666' }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{credential.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {platformConfig?.name || credential.platform}
                            </span>
                            {getStatusBadge(credential.status)}
                          </div>
                          {credential.metadata?.shopName && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {credential.metadata.shopName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteCredential(credential.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {credentials.length === 0 && !loading && (
        <Card className="text-center py-12 bg-white/5 border border-white/10 text-white">
          <CardContent>
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No credentials connected</h3>
            <p className="text-muted-foreground mb-6">
              Connect your first platform integration to start building powerful workflows.
            </p>
            <Button onClick={() => setShowShopifyModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Shopify Store
            </Button>
          </CardContent>
        </Card>
      )}

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
    </div>
    </DashboardLayout>
  );
}
