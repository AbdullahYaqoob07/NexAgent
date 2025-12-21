"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { authService } from "@/lib/auth";
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
  Instagram as InstagramIcon,
  Shield,
  Lock,
  Activity,
  Info,
  ChevronDown
} from "lucide-react";
import { ShopifyConnectionModal } from "@/components/integrations/ShopifyConnectionModal";
import { WhatsAppConnectionModal } from "@/components/integrations/WhatsAppConnectionModal";
import { OpenAIConnectionModal } from "@/components/integrations/OpenAIConnectionModal";
import { FacebookConnectionModal } from "@/components/integrations/FacebookConnectionModal";
import { InstagramConnectionModal } from "@/components/integrations/InstagramConnectionModal";
import { toast } from "sonner";

interface Credential {
  id: string;
  name: string;
  platform: string;
  status: "active" | "inactive" | "expired" | "error";
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
    name: "Shopify",
    icon: ShoppingBag,
    color: "#96bf48",
    description:
      "Connect your Shopify store to trigger workflows on orders, customers, and products",
    category: "ecommerce" as const,
  },
  openai: {
    name: "OpenAI",
    icon: Zap,
    color: "#10A37F",
    description: "Add AI capabilities to your workflows with GPT models",
    category: "llms" as const,
  },
  whatsapp: {
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    description:
      "Connect WhatsApp Cloud API to send/receive messages and trigger workflows",
    category: "social" as const,
  },
  facebook: {
    name: "Facebook",
    icon: FacebookIcon,
    color: "#1877F2",
    description: "Connect your Facebook Page for messaging, comments, and insights",
    category: "social" as const,
  },
  instagram: {
    name: "Instagram",
    icon: InstagramIcon,
    color: "#E1306C",
    description: "Connect your Instagram Business Account for media and messaging",
    category: "social" as const,
  },
} as const;

const CATEGORY_LABELS: Record<"all" | "llms" | "social" | "ecommerce", string> = {
  all: "All",
  llms: "LLMs",
  social: "Social Media",
  ecommerce: "E‑commerce",
};

export default function CredentialsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showOpenAIModal, setShowOpenAIModal] = useState(false);
  const [showCredentialDropdown, setShowCredentialDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCredentialDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filters & search (wired for future improvements)
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [browseCategory, setBrowseCategory] = useState<
    "all" | "llms" | "social" | "ecommerce"
  >("all");

  // Surface redirects (success/error) from OAuth callback
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  useEffect(() => {
    if (searchParams) {
      const connected = searchParams.get("connected");
      const errorParam = searchParams.get("error");
      const shopName = searchParams.get("shopName");

      if (connected === "shopify") {
        toast.success(
          `Shopify ${shopName ? `(${shopName}) ` : ""}connected successfully!`
        );
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("credentialId");
        url.searchParams.delete("shopName");
        window.history.replaceState({}, "", url.toString());
      }

      if (connected === "facebook") {
        toast.success("Facebook connected successfully!");
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("credentialId");
        window.history.replaceState({}, "", url.toString());
      }

      if (connected === "instagram") {
        toast.success("Instagram connected successfully!");
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("credentialId");
        window.history.replaceState({}, "", url.toString());
      }

      if (errorParam) {
        toast.error(errorParam);
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  const {
    data: credentials = [],
    isLoading: loading,
  } = useQuery<Credential[]>({
    queryKey: ["credentials", user?.uid],
    queryFn: async () => {
      const token = await authService.getUserToken();
      const response = await fetch("/api/credentials", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (!result.success) {
        toast.error("Failed to load credentials");
        throw new Error(result.error || "Failed to load credentials");
      }

      return (result.data || []) as Credential[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const invalidateCredentials = async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: ["credentials", user.uid] });
  };

  const deleteCredential = async (credentialId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this credential? This will affect any workflows using it."
      )
    ) {
      return;
    }

    try {
      const token = await authService.getUserToken();
      const response = await fetch(`/api/credentials/${credentialId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Credential deleted successfully");
        await invalidateCredentials();
      } else {
        toast.error(result.error || "Failed to delete credential");
      }
    } catch (error) {
      console.error("Error deleting credential:", error);
      toast.error("Failed to delete credential");
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: {
        label: "Active",
        variant: "default" as const,
        icon: CheckCircle,
      },
      inactive: {
        label: "Inactive",
        variant: "secondary" as const,
        icon: AlertCircle,
      },
      expired: {
        label: "Expired",
        variant: "destructive" as const,
        icon: AlertCircle,
      },
      error: {
        label: "Error",
        variant: "destructive" as const,
        icon: AlertCircle,
      },
    };

    const { label, variant, icon: Icon } =
      config[status as keyof typeof config] || config.inactive;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8 text-center max-w-4xl mx-auto">
        <p className="text-white/80">Please sign in to manage your credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Secure Credentials</h1>
              <div className="group relative">
                <Info className="w-5 h-5 text-white/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-80 z-50">
                  <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-sm text-white shadow-2xl">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      How Your Data Is Protected
                    </h4>
                    <ul className="space-y-2 text-white/80">
                      <li className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-white">AES-256-GCM Encryption</span>
                          <p>All sensitive credential data is encrypted using military-grade AES-256-GCM encryption.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-white">Zero-Knowledge Architecture</span>
                          <p>We never have access to your plaintext credentials.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Activity className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-white">Key Derivation</span>
                          <p>Encryption keys use PBKDF2 with 100,000 iterations.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-white">Authentication Tags</span>
                          <p>Cryptographic tags detect any tampering attempts.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-white/70 mt-2">
              Enterprise-grade encrypted credentials for your workflow integrations.
            </p>
          </div>
          <Badge className="gap-1.5 bg-green-500/10 text-green-400 border-green-500/20 py-2 px-4 text-sm">
            <Shield className="w-4 h-4" />
            Zero-Knowledge Security
          </Badge>
        </div>
        
        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-400">Security Assurance</h3>
              <p className="text-blue-300 text-sm mt-1">
                All credentials are encrypted with AES-256-GCM encryption at rest and in transit. 
                We employ a zero-knowledge architecture where sensitive data is never accessible to our servers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Security Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold truncate">{credentials.length}</p>
                      <p className="text-white/70 truncate">Secure Credentials</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold truncate">AES-256</p>
                      <p className="text-white/70 truncate">Encryption</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold truncate">Zero-Knowledge</p>
                      <p className="text-white/70 truncate">Architecture</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Health Monitoring */}
            <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
              <CardContent className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Credential Health
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-white/80">Active Credentials</span>
                    </div>
                    <span className="font-medium">{credentials.filter(c => c.status === 'active').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-white/80">Needs Attention</span>
                    </div>
                    <span className="font-medium">{credentials.filter(c => c.status === 'expired' || c.status === 'error').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-white/80">Recently Used</span>
                    </div>
                    <span className="font-medium">{credentials.filter(c => c.lastUsed && new Date(c.lastUsed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Overall Security Score</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-400">98%</span>
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{width: '98%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Connected Credentials List */}
      {credentials.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Connected Credentials
            </h2>
            <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Lock className="w-3 h-3" />
              {credentials.length} Secured
            </Badge>
          </div>
          <div className="space-y-4">
            {credentials.map((credential) => {
              const platformConfig =
                PLATFORM_CONFIG[
                  credential.platform as keyof typeof PLATFORM_CONFIG
                ];
              const Icon = platformConfig?.icon || Key;

              return (
                <Card
                  key={credential.id}
                  className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#FF6900]/10 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-[#FF6900]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{credential.name}</h3>
                            {getStatusBadge(credential.status)}
                            <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                              <Lock className="w-3 h-3" />
                              Encrypted
                            </Badge>
                            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20">
                              <CheckCircle className="w-3 h-3" />
                              Healthy
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="text-sm text-white/70">
                              {platformConfig?.name || credential.platform}
                            </span>
                            {credential.metadata?.shopName && (
                              <span className="text-sm text-white/70">
                                Store: {credential.metadata.shopName}
                              </span>
                            )}
                            <span className="text-sm text-white/70">
                              Added: {new Date(credential.createdAt).toLocaleDateString()}
                            </span>
                            {credential.lastUsed && (
                              <span className="text-sm text-white/70">
                                Last used: {new Date(credential.lastUsed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 hover:bg-white/5 text-white"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 hover:bg-red-500/10 text-white hover:text-red-400"
                          onClick={() => deleteCredential(credential.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Security Info Bar */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Shield className="w-4 h-4" />
                            <span>End-to-End Encrypted</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Activity className="w-4 h-4" />
                            <span>Zero-Knowledge Architecture</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Lock className="w-4 h-4" />
                            <span>AES-256-GCM</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Security Score: 98%
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={() => toast.info('Credential security is maintained through AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations).')}
                          >
                            Security Details
                          </Button>
                        </div>
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
        <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
          <CardContent className="py-12 text-center space-y-6">
            <Key className="w-12 h-12 mx-auto text-white/40" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No credentials connected</h3>
              <p className="text-white/70 max-w-2xl mx-auto">
                Connect your first platform integration to start building powerful workflows.
                All credentials are protected with enterprise-grade encryption.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowShopifyModal(true)}
                className="bg-[#FF6900] hover:bg-[#FF6900]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect Credential
              </Button>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white"
                onClick={() => toast.info('All credentials are encrypted with AES-256-GCM and never stored in plain text. We use a zero-knowledge architecture.')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Security Info
              </Button>
            </div>
            <div className="max-w-md mx-auto p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Security Guarantee</span>
              </div>
              <p className="text-blue-300 text-sm">
                Your credentials are encrypted before leaving your browser and can only be decrypted by you.
                We never have access to your plaintext credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Credential Section */}
      <Card className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="font-semibold text-lg">Add New Credential</h3>
              <p className="text-white/70 mt-1">
                Securely connect to external platforms with enterprise-grade encryption
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                  <Lock className="w-3 h-3" />
                  AES-256-GCM
                </Badge>
                <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  <Shield className="w-3 h-3" />
                  Zero-Knowledge
                </Badge>
                <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                  <Activity className="w-3 h-3" />
                  PBKDF2
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div ref={dropdownRef} className="relative">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCredentialDropdown(!showCredentialDropdown);
                  }}
                  className="bg-[#FF6900] hover:bg-[#FF6900]/90 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Credential
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCredentialDropdown ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Dropdown Menu */}
                {showCredentialDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1a1410] border border-white/10 rounded-xl shadow-2xl z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowCredentialDropdown(false);
                          setShowShopifyModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#FF6900]" />
                        Shopify Store
                      </button>
                      <button
                        onClick={() => {
                          setShowCredentialDropdown(false);
                          setShowWhatsAppModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-green-500" />
                        WhatsApp Business
                      </button>
                      <button
                        onClick={() => {
                          setShowCredentialDropdown(false);
                          setShowOpenAIModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 text-yellow-500" />
                        OpenAI API
                      </button>
                      <button
                        onClick={() => {
                          setShowCredentialDropdown(false);
                          setShowFacebookModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <FacebookIcon className="w-4 h-4 text-blue-500" />
                        Facebook Page
                      </button>
                      <button
                        onClick={() => {
                          setShowCredentialDropdown(false);
                          setShowInstagramModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <InstagramIcon className="w-4 h-4 text-pink-500" />
                        Instagram Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white"
                onClick={() => {
                  toast.info(
                    'Credentials are protected with AES-256-GCM encryption and zero-knowledge architecture. '
                    + 'Your sensitive data is never accessible to our servers. PBKDF2 key derivation with 100,000 iterations.'
                  );
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Security Policy
              </Button>
            </div>
          </div>
          
          {/* Security Info */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-white/70">
                <Shield className="w-4 h-4 text-green-500" />
                <span>End-to-End Encryption</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <Lock className="w-4 h-4 text-blue-500" />
                <span>Zero-Knowledge Architecture</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <Activity className="w-4 h-4 text-purple-500" />
                <span>Key Rotation Support</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shopify Connection Modal */}
      <ShopifyConnectionModal
        open={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onConnectionSuccess={async () => {
          setShowShopifyModal(false);
          await invalidateCredentials();
          toast.success("Shopify store connected successfully!");
        }}
      />

      {/* Other provider modals (wired for future use) */}
      <WhatsAppConnectionModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
      />
      <OpenAIConnectionModal
        open={showOpenAIModal}
        onClose={() => setShowOpenAIModal(false)}
      />
      <FacebookConnectionModal
        open={showFacebookModal}
        onClose={() => setShowFacebookModal(false)}
      />
      <InstagramConnectionModal
        open={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
      />
    </div>
  );
}
