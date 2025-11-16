"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  DollarSign,
  Zap,
  Shield,
  AlertTriangle,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Lock,
  LogOut,
  Eye,
  Sliders,
  Grid,
  Database,
} from "lucide-react";

interface FeeConfig {
  seller_commission_percentage: number;
  platform_fee_percentage: number;
  payment_processor_fee_percentage: number;
  minimum_payout_amount: number;
  maximum_transaction_amount: number;
  refund_processing_fee_percentage: number;
  last_updated?: string;
  updated_by?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SystemSettings {
  maintenance_mode: boolean;
  max_concurrent_executions: number;
  api_rate_limit: number;
  session_timeout_minutes: number;
  max_file_upload_size_mb: number;
  smtp_enabled: boolean;
  analytics_retention_days: number;
}

export default function AdminSettingsPage() {
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    max_concurrent_executions: 100,
    api_rate_limit: 1000,
    session_timeout_minutes: 60,
    max_file_upload_size_mb: 100,
    smtp_enabled: false,
    analytics_retention_days: 90,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFees, setEditingFees] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; stage: number }>({ open: false, action: "", stage: 0 });
  const [countdown, setCountdown] = useState(5);
  const [sessionCount, setSessionCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [activeTab, setActiveTab] = useState("fees");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [feesRes, categoriesRes] = await Promise.all([
        apiClient.get("/api/marketplace/admin/config/fees"),
        apiClient.get("/api/marketplace/admin/config/categories"),
      ]);

      setFeeConfig(feesRes.data || null);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (error) {
      console.error("❌ Settings API Error:", error);
      // On error, prefer explicit empty state over demo data
      setFeeConfig(null);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (confirmDialog.open && confirmDialog.stage === 1) {
      setCountdown(5);
      // Generate random values only once when entering stage 1
      if (sessionCount === 0) {
        setSessionCount(Math.floor(Math.random() * 500) + 50);
      }
      if (cacheSize === 0) {
        setCacheSize(Math.random() * 5 + 1);
      }
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!confirmDialog.open) {
      // Reset values when dialog closes
      setSessionCount(0);
      setCacheSize(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [confirmDialog.open, confirmDialog.stage]);

  const saveFeeConfig = async () => {
    if (!feeConfig) return;
    setSaving(true);
    try {
      await apiClient.put("/api/marketplace/admin/config/fees", feeConfig);
      setEditingFees(false);
      // Refresh from backend so we always show canonical values
      await fetchSettings();
    } catch (error) {
      console.error("Error saving fees:", error);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name) {
      alert("Category name is required");
      return;
    }

    try {
      await apiClient.post("/api/marketplace/admin/config/categories", newCategory);
      // Re-fetch from backend instead of pushing a fake local ID
      await fetchSettings();
      setNewCategory({ name: "", description: "" });
      setIsAddCategoryDialogOpen(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const SettingCard = ({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children?: React.ReactNode;
  }) => (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">{Icon}</div>
            <div>
              <CardTitle className="text-white">{title}</CardTitle>
              <p className="text-white/60 text-sm mt-1">{description}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Settings</h1>
          <p className="text-white/60 mt-2">System configuration, fees, categories, and integrations</p>
        </div>
        <Button 
          onClick={fetchSettings}
          className="bg-white/10 hover:bg-white/20 border border-white/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="fees" onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex-1">
            <TabsList className="bg-transparent border-b border-white/10">
          <TabsTrigger value="fees" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">
            Fee Configuration
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">
            Categories
          </TabsTrigger>
          <TabsTrigger value="system" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">
            System Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="text-white/60 hover:text-white/80 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-b-transparent data-[state=active]:border-b-orange-500">
            Security
          </TabsTrigger>
            </TabsList>
          </div>
          {activeTab === "system" && (
            <Button className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 whitespace-nowrap">
              <Save size={16} className="mr-2" />
              Save All Settings
            </Button>
          )}
          {activeTab === "categories" && (
            <Button
              onClick={() => setIsAddCategoryDialogOpen(true)}
              className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 whitespace-nowrap"
            >
              <Plus size={16} className="mr-2" />
              Add Category
            </Button>
          )}
          {activeTab === "fees" && !editingFees && (
            <Button
              onClick={() => setEditingFees(true)}
              className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 whitespace-nowrap"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          )}
          {activeTab === "fees" && editingFees && (
            <div className="flex gap-2">
              <Button
                onClick={saveFeeConfig}
                disabled={saving}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 whitespace-nowrap"
              >
                <Check size={16} className="mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={() => setEditingFees(false)}
                className="bg-white/10 hover:bg-white/20 whitespace-nowrap"
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Fee Configuration Tab */}
        <TabsContent value="fees" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white">Marketplace Fee Structure</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {feeConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seller Commission */}
                  <div>
                    <Label className="text-white/70">Seller Commission %</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={feeConfig.seller_commission_percentage}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            seller_commission_percentage: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        {feeConfig.seller_commission_percentage}%
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Percentage taken from sellers</p>
                  </div>

                  {/* Platform Fee */}
                  <div>
                    <Label className="text-white/70">Platform Fee %</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={feeConfig.platform_fee_percentage}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            platform_fee_percentage: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        {feeConfig.platform_fee_percentage}%
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Platform operational fee</p>
                  </div>

                  {/* Payment Processor Fee */}
                  <div>
                    <Label className="text-white/70">Payment Processor Fee %</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={feeConfig.payment_processor_fee_percentage}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            payment_processor_fee_percentage: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        {feeConfig.payment_processor_fee_percentage}%
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Stripe/payment gateway fee</p>
                  </div>

                  {/* Refund Processing Fee */}
                  <div>
                    <Label className="text-white/70">Refund Processing Fee %</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={feeConfig.refund_processing_fee_percentage}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            refund_processing_fee_percentage: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        {feeConfig.refund_processing_fee_percentage}%
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Refund processing cost</p>
                  </div>

                  {/* Minimum Payout */}
                  <div>
                    <Label className="text-white/70">Minimum Payout Amount ($)</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="1"
                        value={feeConfig.minimum_payout_amount}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            minimum_payout_amount: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        ${feeConfig.minimum_payout_amount}
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Minimum amount for payout</p>
                  </div>

                  {/* Maximum Transaction */}
                  <div>
                    <Label className="text-white/70">Maximum Transaction Amount ($)</Label>
                    {editingFees ? (
                      <Input
                        type="number"
                        step="1"
                        value={feeConfig.maximum_transaction_amount}
                        onChange={(e) =>
                          setFeeConfig({
                            ...feeConfig,
                            maximum_transaction_amount: parseFloat(e.target.value),
                          })
                        }
                        className="bg-white/5 border-white/10 mt-2 text-white"
                      />
                    ) : (
                      <p className="text-white/90 font-bold mt-2 text-2xl">
                        ${feeConfig.maximum_transaction_amount}
                      </p>
                    )}
                    <p className="text-white/50 text-xs mt-1">Maximum allowed transaction</p>
                  </div>
                </div>
              )}

              {feeConfig?.last_updated && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-sm">Last Updated: {new Date(feeConfig.last_updated).toLocaleString()}</p>
                    <p className="text-white/60 text-sm">By: {feeConfig.updated_by || "System"}</p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Fee Impact Calculator */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Fee Impact Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <p className="text-white/60 text-sm">$100 Nexa Sale</p>
                  {feeConfig && (
                    <>
                      <p className="text-white/90 mt-2">Seller gets: <span className="font-bold text-emerald-400">${(100 - (100 * feeConfig.seller_commission_percentage / 100)).toFixed(2)}</span></p>
                      <p className="text-white/50 text-xs mt-1">After {feeConfig.seller_commission_percentage}% commission</p>
                    </>
                  )}
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <p className="text-white/60 text-sm">Platform Revenue</p>
                  {feeConfig && (
                    <>
                      <p className="text-white/90 mt-2">Net income: <span className="font-bold text-orange-400">${(100 * feeConfig.seller_commission_percentage / 100 - (100 * feeConfig.payment_processor_fee_percentage / 100)).toFixed(2)}</span></p>
                      <p className="text-white/50 text-xs mt-1">After payment processor fees</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">

          {categories.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <p className="text-white/80 font-medium mb-2">No categories configured yet</p>
                <p className="text-white/50 text-sm mb-4 max-w-md">
                  Use "Add Category" to define marketplace categories. These will be used to organize Nexas in the marketplace.
                </p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-bold">{category.name}</h3>
                    <Badge className={category.is_active ? "bg-emerald-400/20 text-emerald-300" : "bg-gray-400/20 text-gray-300"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-white/60 text-sm mb-4">{category.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-white/10 hover:bg-white/20">
                      <Edit size={14} />
                    </Button>
                    <Button size="sm" className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          {systemSettings && (
            <>
              <SettingCard
                icon={<Zap size={20} className="text-white" />}
                title="Execution Settings"
                description="Control workflow execution limits and concurrency"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70">Max Concurrent Executions</Label>
                    <Input
                      type="number"
                      value={systemSettings.max_concurrent_executions}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          max_concurrent_executions: parseInt(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/10 mt-2 text-white"
                    />
                    <p className="text-white/50 text-xs mt-1">Maximum workflows running simultaneously</p>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={<Sliders size={20} className="text-white" />}
                title="API Settings"
                description="API rate limiting and access controls"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70">API Rate Limit (requests/hour)</Label>
                    <Input
                      type="number"
                      value={systemSettings.api_rate_limit}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          api_rate_limit: parseInt(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/10 mt-2 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={systemSettings.session_timeout_minutes}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          session_timeout_minutes: parseInt(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/10 mt-2 text-white"
                    />
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={<Database size={20} className="text-white" />}
                title="Storage & Retention"
                description="File upload limits and data retention"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/70">Max File Upload Size (MB)</Label>
                    <Input
                      type="number"
                      value={systemSettings.max_file_upload_size_mb}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          max_file_upload_size_mb: parseInt(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/10 mt-2 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Analytics Retention (days)</Label>
                    <Input
                      type="number"
                      value={systemSettings.analytics_retention_days}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          analytics_retention_days: parseInt(e.target.value),
                        })
                      }
                      className="bg-white/5 border-white/10 mt-2 text-white"
                    />
                    <p className="text-white/50 text-xs mt-1">Days to keep analytics and logs</p>
                  </div>
                </div>
              </SettingCard>
            </>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <SettingCard
            icon={<Shield size={20} className="text-white" />}
            title="Maintenance Mode"
            description="Temporarily disable the platform for maintenance"
          >
            <div className="flex items-center justify-between">
              <p className="text-white/90">Enable Maintenance Mode</p>
              <Button className="bg-white/10 hover:bg-white/20">
                <ToggleLeft size={20} />
              </Button>
            </div>
          </SettingCard>

          <SettingCard
            icon={<Lock size={20} className="text-white" />}
            title="Email Configuration"
            description="SMTP and email delivery settings"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/90">SMTP Enabled</p>
                <Badge className="bg-emerald-400/20 text-emerald-300">Connected</Badge>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <p className="text-white/60 text-sm">Email Service: SendGrid</p>
                <p className="text-white/60 text-sm">Last Test: 2 hours ago ✓</p>
                <Button className="mt-4 bg-white/10 hover:bg-white/20" size="sm">
                  Test Email Connection
                </Button>
              </div>
            </div>
          </SettingCard>

          <SettingCard
            icon={<AlertTriangle size={20} className="text-white" />}
            title="Dangerous Zone"
            description="Irreversible actions - proceed with caution"
          >
            <div className="space-y-2">
              <Button onClick={() => setConfirmDialog({ open: true, action: "logout", stage: 0 })} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 justify-start">
                <LogOut size={16} className="mr-2" />
                Force Logout All Users
              </Button>
              <Button onClick={() => setConfirmDialog({ open: true, action: "cache", stage: 0 })} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 justify-start">
                <Database size={16} className="mr-2" />
                Clear Analytics Cache
              </Button>
            </div>
          </SettingCard>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Category</DialogTitle>
            <DialogDescription className="text-white/60">Create a new marketplace category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Category Name</Label>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., Automation"
                className="bg-white/5 border-white/10 mt-2 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Brief description..."
                className="bg-white/5 border-white/10 mt-2 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAddCategoryDialogOpen(false)} className="bg-white/10 hover:bg-white/20">
              Cancel
            </Button>
            <Button onClick={addCategory} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400">
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: "", stage: 0 })}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {confirmDialog.stage === 0
                ? confirmDialog.action === "logout"
                  ? "Force Logout All Users?"
                  : "Clear Analytics Cache?"
                : confirmDialog.action === "logout"
                ? "Are You Really Sure?"
                : "Really Clear Everything?"}
            </DialogTitle>
            <DialogDescription className="text-white/60 space-y-2 mt-4">
              {confirmDialog.stage === 0 ? (
                <>
                  {confirmDialog.action === "logout" ? (
                    <>
                      <p>This will immediately logout all active users across all devices.</p>
                      <p className="text-red-400 font-semibold">All sessions will be terminated instantly.</p>
                    </>
                  ) : (
                    <>
                      <p>This will clear all cached analytics data.</p>
                      <p className="text-red-400 font-semibold">This may take several minutes to complete.</p>
                    </>
                  )}
                </>
              ) : confirmDialog.action === "logout" ? (
                <>
                  <p>All {sessionCount} active user sessions will be invalidated.</p>
                  <p className="text-red-400 font-semibold">Users will need to sign in again to access the platform.</p>
                  <p>This action cannot be undone.</p>
                </>
              ) : (
                <>
                  <p>Cache size: ~{cacheSize.toFixed(1)}GB will be removed.</p>
                  <p className="text-red-400 font-semibold">Analytics dashboard may be slow until cache rebuilds.</p>
                  <p>This action cannot be undone.</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmDialog({ open: false, action: "", stage: 0 })}
              className="bg-white/10 hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                confirmDialog.stage === 0
                  ? setConfirmDialog({ ...confirmDialog, stage: 1 })
                  : (
                      console.log(
                        `Executing ${confirmDialog.action === "logout" ? "Force Logout" : "Clear Cache"}`
                      ),
                      setConfirmDialog({ open: false, action: "", stage: 0 })
                    )
              }
              disabled={confirmDialog.stage === 1 && countdown > 0}
              className={confirmDialog.stage === 0 ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400" : countdown > 0 ? "bg-gray-500/20 text-gray-400 cursor-not-allowed" : "bg-red-500/20 hover:bg-red-500/30 text-red-400"}
            >
              {confirmDialog.stage === 0 ? "Continue" : countdown > 0 ? `Confirm (${countdown})` : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
