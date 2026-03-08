"use client";

import { useState, useEffect, useMemo } from "react";
import marketplaceAdminService from "@/lib/api/marketplace-admin";
import { marketplaceService, type MarketplaceNexa } from "@/lib/api/services/marketplaceService";
import type { PendingNexa as PendingNexaType, PendingSeller as PendingSellerType, Dispute as DisputeType, MarketplaceAnalytics } from "@/lib/api/marketplace-admin";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Search,
  RefreshCw,
  Trash2,
  Star,
  DollarSign,
  Eye,
  Ban,
  Check,
  X,
  MessageSquare,
  Download,
  Loader2,
} from "lucide-react";




export default function MarketplaceAdminPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedNexaModal, setSelectedNexaModal] = useState<PendingNexaType | null>(null);
  const [selectedSellerModal, setSelectedSellerModal] = useState<PendingSellerType | null>(null);
  const [selectedDisputeModal, setSelectedDisputeModal] = useState<DisputeType | null>(null);
  const [moderationAction, setModerationAction] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

  // Backend state
  const [overview, setOverview] = useState<MarketplaceAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number; sales: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [pendingNexas, setPendingNexas] = useState<PendingNexaType[]>([]);
  const [pendingSellersState, setPendingSellersState] = useState<PendingSellerType[]>([]);
  const [activeDisputesState, setActiveDisputesState] = useState<DisputeType[]>([]);
  const [loading, setLoading] = useState({ overview: true, nexas: true, sellers: true, disputes: true });
  const [submitting, setSubmitting] = useState(false);

  // All Listings (real Firestore data)
  const [allListings, setAllListings] = useState<MarketplaceNexa[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingSearch, setListingSearch] = useState("");
  const [listingAction, setListingAction] = useState<{ id: string; action: 'suspend' | 'feature' | 'remove' } | null>(null);
  const [listingActionReason, setListingActionReason] = useState("");
  const [listingActionSubmitting, setListingActionSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading({ overview: true, nexas: true, sellers: true, disputes: true });
        const [ov, nexas, sellers, disputes] = await Promise.all([
          marketplaceAdminService.getMarketplaceAnalytics('30d'),
          marketplaceAdminService.getPendingNexas(),
          marketplaceAdminService.getPendingSellers(),
          marketplaceAdminService.getActiveDisputes()
        ]);
        if (ov) {
          setOverview(ov);
          const combined = [] as Array<{ date: string; revenue: number; sales: number }>;
          const revenueChart = ov.revenue_chart || [];
          const salesChart = ov.sales_chart || [];
          const byDate: Record<string, { revenue?: number; sales?: number }> = {};
          revenueChart.forEach(p => { byDate[p.date] = { ...(byDate[p.date]||{}), revenue: p.revenue }; });
          salesChart.forEach(p => { byDate[p.date] = { ...(byDate[p.date]||{}), sales: p.sales }; });
          Object.entries(byDate).sort(([a],[b]) => (a > b ? 1 : -1)).forEach(([date, vals]) => {
            combined.push({ date, revenue: vals.revenue || 0, sales: vals.sales || 0 });
          });
          setRevenueData(combined);
          const cats = (ov.top_categories || []).map((c, idx) => ({ name: c.name, value: c.count, color: ["#FF6900","#FF8C3B","#FFB266","#FFD699","#8B7355"][idx % 5] }));
          setCategoryData(cats);
        }
        setPendingNexas(nexas || []);
        setPendingSellersState(sellers || []);
        setActiveDisputesState(disputes || []);
      } finally {
        setLoading({ overview: false, nexas: false, sellers: false, disputes: false });
      }
    };
    fetchAll();
  }, []);

  const fetchListings = async () => {
    setListingsLoading(true);
    try {
      const data = await marketplaceService.listNexas();
      setAllListings(data);
    } catch {
      setAllListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const submitListingAction = async () => {
    if (!listingAction) return;
    setListingActionSubmitting(true);
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, updateDoc, deleteDoc } = await import('firebase/firestore');
      const ref = doc(db, 'marketplace_nexas', listingAction.id);
      if (listingAction.action === 'remove') {
        await deleteDoc(ref);
        setAllListings(prev => prev.filter(n => n.id !== listingAction.id));
      } else if (listingAction.action === 'suspend') {
        await updateDoc(ref, { status: 'suspended', suspendedAt: new Date().toISOString(), suspendReason: listingActionReason });
        setAllListings(prev => prev.map(n => n.id === listingAction.id ? { ...n, status: 'suspended' } : n));
      } else if (listingAction.action === 'feature') {
        const isNowFeatured = !allListings.find(n => n.id === listingAction.id)?.featured;
        await updateDoc(ref, { featured: isNowFeatured });
        setAllListings(prev => prev.map(n => n.id === listingAction.id ? { ...n, featured: isNowFeatured } : n));
      }
      setListingAction(null);
      setListingActionReason("");
    } catch (e) {
      console.error(e);
    } finally {
      setListingActionSubmitting(false);
    }
  };

  const refreshLists = async () => {
    const [nexas, sellers, disputes, ov] = await Promise.all([
      marketplaceAdminService.getPendingNexas(),
      marketplaceAdminService.getPendingSellers(),
      marketplaceAdminService.getActiveDisputes(),
      marketplaceAdminService.getMarketplaceAnalytics('30d')
    ]);
    setPendingNexas(nexas || []);
    setPendingSellersState(sellers || []);
    setActiveDisputesState(disputes || []);
    if (ov) setOverview(ov);
  };

  const handleSubmitNexaAction = async () => {
    if (!selectedNexaModal || !moderationAction) {
      alert('Select an action');
      return;
    }
    setSubmitting(true);
    try {
      const id = selectedNexaModal.id;
      let res;
      if (moderationAction === 'approve') {
        res = await marketplaceAdminService.approveNexa(id, moderationReason);
      } else if (moderationAction === 'reject') {
        res = await marketplaceAdminService.rejectNexa(id, moderationReason || '');
      } else if (moderationAction === 'suspend') {
        res = await marketplaceAdminService.suspendNexa(id, moderationReason || '');
      }
      if (res && res.success) {
        alert(res.message || 'Action successful');
        setSelectedNexaModal(null);
        setModerationAction('');
        setModerationReason('');
        await refreshLists();
      } else {
        alert(res?.error || 'Action failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySeller = async () => {
    if (!selectedSellerModal) return;
    setSubmitting(true);
    try {
      const res = await marketplaceAdminService.verifySeller(selectedSellerModal.id, moderationReason || undefined);
      if (res.success) {
        alert(res.message || 'Seller verified');
        setSelectedSellerModal(null);
        setModerationReason('');
        await refreshLists();
      } else {
        alert(res.error || 'Failed to verify seller');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDisputeModal || !moderationAction) {
      alert('Choose a resolution');
      return;
    }
    setSubmitting(true);
    try {
      const res = await marketplaceAdminService.resolveDispute(
        selectedDisputeModal.id,
        moderationAction as any,
        moderationReason || undefined
      );
      if (res.success) {
        alert(res.message || 'Dispute resolved');
        setSelectedDisputeModal(null);
        setModerationAction('');
        setModerationReason('');
        await refreshLists();
      } else {
        alert(res.error || 'Failed to resolve dispute');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTransactionPDF = async (transaction: Transaction) => {
    try {
      setDownloadingPDF(transaction.id);
      
      const params = new URLSearchParams({
        purchase_id: transaction.purchaseId,
        buyer: transaction.buyer,
        seller: transaction.seller,
        nexa: transaction.nexa,
        amount: String(transaction.amount),
        status: transaction.status,
        date: transaction.date,
      });

      const response = await fetch(
        `/api/v1/pdf/transactions/receipt?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NexAgent_Receipt_${transaction.purchaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_review":
      case "pending":
      case "open":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "verified":
      case "active":
      case "completed":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "rejected":
      case "suspended":
      case "failed":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "pending_resolution":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default:
        return "bg-white/5 text-white/70 border-white/10";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Marketplace Admin</h1>
        <p className="text-white/60 mt-2">Manage Nexas, sellers, and transactions</p>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Overview</TabsTrigger>
          <TabsTrigger value="listings" onClick={fetchListings} className="data-[state=active]:text-black data-[state=inactive]:text-white/60">All Listings</TabsTrigger>
          <TabsTrigger value="nexas" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Pending</TabsTrigger>
          <TabsTrigger value="sellers" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Sellers</TabsTrigger>
          <TabsTrigger value="disputes" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Disputes</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white/80 font-normal flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Total Nexas
                </CardTitle>
              </CardHeader>
              <CardContent>
<p className="text-3xl font-bold text-white">
                  {overview ? overview.total_nexas : "—"}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {overview ? `${overview.active_nexas} active` : ""}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white/80 font-normal flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Total Sellers
                </CardTitle>
              </CardHeader>
              <CardContent>
<p className="text-3xl font-bold text-white">
                  {overview ? overview.total_sellers : "—"}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {pendingSellersState.length} pending
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white/80 font-normal flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Total Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
<p className="text-3xl font-bold text-white">
                  {overview ? overview.total_purchases.toLocaleString() : "—"}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {activeDisputesState.length} disputes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white/80 font-normal flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
<p className="text-3xl font-bold text-white">
                  {overview ? `$${overview.total_revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {pendingNexas.length} pending review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Revenue & Sales Trend</CardTitle>
                <CardDescription className="text-white/60">
                  Last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FF6900"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#FF8C3B"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Nexas by Category</CardTitle>
                <CardDescription className="text-white/60">
                  Distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.95)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "8px",
                        color: "#ffffff",
                      }}
                      formatter={(value, name, props) => [
                        `${value} Nexas`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Sellers */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Top Sellers</CardTitle>
              <CardDescription className="text-white/60">
                By revenue (last 30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(overview?.top_sellers || []).length === 0 && (
                  <p className="text-white/40 text-sm text-center py-6">No seller data yet</p>
                )}
                {(overview?.top_sellers || []).map((seller: any, idx: number) => (
                  <div key={seller.seller_id || idx} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{seller.seller_name || seller.name || 'Unknown'}</p>
                      <p className="text-white/60 text-sm">
                        {seller.total_sales ?? seller.sales ?? 0} sales • {seller.nexa_count ?? seller.nexas ?? 0} Nexas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        ${(seller.total_revenue ?? seller.revenue ?? 0).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-white/60 text-sm">{seller.avg_rating ?? seller.rating ?? '—'}</span>
                        <Badge className={`ml-2 ${getStatusColor(seller.verification_status ?? seller.status ?? 'active')}`}>
                          {seller.verification_status ?? seller.status ?? 'active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Listings Tab — FR-15 */}
        <TabsContent value="listings" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#FF6900]" />
                    All Marketplace Listings
                  </CardTitle>
                  <CardDescription className="text-white/60">{allListings.length} total listings</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchListings} disabled={listingsLoading}
                  className="border-white/20 text-white/70 hover:text-white hover:bg-white/10">
                  <RefreshCw className={`w-4 h-4 mr-2 ${listingsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                  placeholder="Search by name, author or category..."
                  className="w-full pl-9 pr-4 h-9 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FF6900]"
                />
              </div>

              {listingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF6900]" />
                </div>
              ) : allListings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No listings yet. Click Refresh to load.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allListings
                    .filter(n =>
                      (n.name || '').toLowerCase().includes(listingSearch.toLowerCase()) ||
                      (n.authorName || '').toLowerCase().includes(listingSearch.toLowerCase()) ||
                      (n.category || '').toLowerCase().includes(listingSearch.toLowerCase())
                    )
                    .map(nexa => {
                      const status = (nexa as any).status || 'active';
                      const featured = (nexa as any).featured === true;
                      return (
                        <div key={nexa.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-sm truncate">{nexa.name}</span>
                              {featured && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shrink-0">Featured</span>}
                              <Badge className={`text-[10px] shrink-0 ${getStatusColor(status)}`}>{status}</Badge>
                            </div>
                            <p className="text-white/50 text-xs mt-0.5 truncate">
                              by {nexa.authorName} · {nexa.category} · {nexa.pricingModel === 'free' ? 'Free' : `$${nexa.price}`} · {nexa.downloads ?? 0} downloads
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost"
                              onClick={() => setListingAction({ id: nexa.id!, action: 'feature' })}
                              className={`h-8 px-2 text-xs ${featured ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-white/50 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                              title={featured ? 'Unfeature' : 'Feature'}>
                              <Star className={`w-3.5 h-3.5 ${featured ? 'fill-yellow-400' : ''}`} />
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => setListingAction({ id: nexa.id!, action: 'suspend' })}
                              className="h-8 px-2 text-xs text-white/50 hover:text-orange-400 hover:bg-orange-400/10"
                              title="Suspend listing"
                              disabled={status === 'suspended'}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => setListingAction({ id: nexa.id!, action: 'remove' })}
                              className="h-8 px-2 text-xs text-white/50 hover:text-red-400 hover:bg-red-400/10"
                              title="Remove listing">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action confirmation dialog */}
          <Dialog open={!!listingAction} onOpenChange={open => !open && setListingAction(null)}>
            <DialogContent className="bg-zinc-900 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {listingAction?.action === 'feature'
                    ? (allListings.find(n => n.id === listingAction.id) as any)?.featured ? 'Unfeature Listing' : 'Feature Listing'
                    : `${listingAction?.action} Listing`}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  {listingAction?.action === 'remove'
                    ? 'This will permanently delete the listing from the marketplace.'
                    : listingAction?.action === 'suspend'
                    ? 'The listing will be hidden from the marketplace.'
                    : 'Toggle featured status for this listing.'}
                </DialogDescription>
              </DialogHeader>
              {listingAction?.action !== 'feature' && (
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Reason (optional)</Label>
                  <textarea
                    value={listingActionReason}
                    onChange={e => setListingActionReason(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-[#FF6900]"
                    placeholder="Enter reason..."
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white/10" onClick={() => setListingAction(null)}>Cancel</Button>
                <Button
                  onClick={submitListingAction}
                  disabled={listingActionSubmitting}
                  className={listingAction?.action === 'remove' ? 'bg-red-600 hover:bg-red-700' : listingAction?.action === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                >
                  {listingActionSubmitting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Nexas Tab */}
        <TabsContent value="nexas" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pending Nexas Review</CardTitle>
<CardDescription className="text-white/60">
                    {pendingNexas.length} awaiting moderation
                  </CardDescription>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="api">API Integration</SelectItem>
                    <SelectItem value="data">Data Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
{pendingNexas.map((nexa) => (
                  <div
                    key={nexa.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{nexa.title}</p>
                      <p className="text-white/60 text-sm">
by {nexa.seller} • {nexa.category}
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        Submitted {nexa.created_at}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedNexaModal(nexa)}
                        className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sellers Tab */}
        <TabsContent value="sellers" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pending Seller Verification</CardTitle>
<CardDescription className="text-white/60">
                    {pendingSellersState.length} awaiting approval
                  </CardDescription>
                </div>
                <Input
                  placeholder="Search sellers..."
                  className="w-64 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
{pendingSellersState.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">
{seller.business_name}
                      </p>
                      <p className="text-white/60 text-sm">{seller.email}</p>
                      <p className="text-white/50 text-xs mt-1">
                        Applied {seller.applied_at} • {seller.country}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSellerModal(seller)}
                        className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Active Disputes</CardTitle>
<CardDescription className="text-white/60">
                    {activeDisputesState.length} disputes pending resolution
                  </CardDescription>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending Resolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
{activeDisputesState.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{dispute.nexa}</p>
                      <p className="text-white/60 text-sm">
                        {dispute.buyer} vs {dispute.seller}
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        Reason: {dispute.reason}
                      </p>
                      <p className="text-orange-400 text-sm mt-1 font-semibold">
                        ${dispute.amount}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace("_", " ")}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDisputeModal(dispute)}
                        className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                  <CardDescription className="text-white/60">
                    {(overview?.recent_activity || []).length} recent purchases
                  </CardDescription>
                </div>
                <Button className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30">
                  <Download className="w-4 h-4 mr-1" />
                  Export All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Purchase ID
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Buyer
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Nexa
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Seller
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-white/70 text-sm font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.recent_activity || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-white/40 text-sm">
                          No transactions yet.
                        </td>
                      </tr>
                    ) : (overview?.recent_activity || []).map((tx: any, i: number) => (
                      <tr
                        key={tx.id || tx.purchaseId || i}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.purchaseId || tx.id || '—'}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.buyer || tx.buyerEmail || '—'}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.nexa || tx.nexaName || tx.item || '—'}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.seller || tx.sellerName || '—'}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm font-semibold">
                          ${tx.amount ?? tx.price ?? '0'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(tx.status || 'completed')}>
                            {tx.status || 'completed'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-white/60 text-sm">
                          {tx.date || tx.createdAt || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadTransactionPDF(tx)}
                            className="bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/30 text-orange-400"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Nexa Review Modal */}
      <Dialog open={!!selectedNexaModal} onOpenChange={() => setSelectedNexaModal(null)}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-2xl text-white">
              Review Nexa
            </DialogTitle>
          </DialogHeader>
          {selectedNexaModal && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Title
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedNexaModal.title}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Category
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedNexaModal.category}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Seller
                </Label>
                <p className="text-white font-semibold mt-2">
                  {selectedNexaModal.seller}
                </p>
              </div>

              <div>
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Action
                </Label>
                <Select
                  value={moderationAction}
                  onValueChange={setModerationAction}
                >
                  <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choose action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="suspend">Suspend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Reason/Notes
                </Label>
                <Textarea
                  placeholder="Enter reason for action..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-white/10 pt-4 mt-4">
            <Button
              onClick={() => setSelectedNexaModal(null)}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              Cancel
            </Button>
<Button onClick={handleSubmitNexaAction} disabled={submitting} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {moderationAction === "approve" ? <Check className="w-4 h-4 mr-1" /> : null}
              {moderationAction === "reject" ? <X className="w-4 h-4 mr-1" /> : null}
              {moderationAction === "suspend" ? <Ban className="w-4 h-4 mr-1" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seller Verification Modal */}
      <Dialog open={!!selectedSellerModal} onOpenChange={() => setSelectedSellerModal(null)}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-2xl text-white">
              Verify Seller
            </DialogTitle>
          </DialogHeader>
          {selectedSellerModal && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Business Name
                  </Label>
                  <p className="text-white font-semibold mt-2">
{selectedSellerModal.business_name}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Country
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedSellerModal.country}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Email
                </Label>
                <p className="text-white font-semibold mt-2">
                  {selectedSellerModal.email}
                </p>
              </div>

              <div>
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Verification Note
                </Label>
                <Textarea
                  placeholder="Optional verification notes..."
                  className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-white/10 pt-4 mt-4">
            <Button
              onClick={() => setSelectedSellerModal(null)}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              Cancel
            </Button>
<Button onClick={handleVerifySeller} disabled={submitting} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Verify Seller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Resolution Modal */}
      <Dialog open={!!selectedDisputeModal} onOpenChange={() => setSelectedDisputeModal(null)}>
        <DialogContent className="bg-white/10 border border-white/20 backdrop-blur-xl max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-2xl text-white">
              Resolve Dispute
            </DialogTitle>
          </DialogHeader>
          {selectedDisputeModal && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Nexa
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedDisputeModal.nexa}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Amount
                  </Label>
                  <p className="text-white font-semibold mt-2 text-orange-400">
                    ${selectedDisputeModal.amount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Buyer
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedDisputeModal.buyer}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <Label className="text-white/60 text-xs uppercase tracking-wide">
                    Seller
                  </Label>
                  <p className="text-white font-semibold mt-2">
                    {selectedDisputeModal.seller}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Dispute Reason
                </Label>
                <p className="text-white/90 mt-2">{selectedDisputeModal.reason}</p>
              </div>

              <div>
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Resolution
                </Label>
                <Select
                  value={moderationAction}
                  onValueChange={setModerationAction}
                >
                  <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choose resolution..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve_refund">Approve Refund</SelectItem>
                    <SelectItem value="deny_refund">Deny Refund</SelectItem>
                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/60 text-xs uppercase tracking-wide">
                  Resolution Notes
                </Label>
                <Textarea
                  placeholder="Explain your resolution decision..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}
          <DialogFooter className="border-t border-white/10 pt-4 mt-4">
            <Button
              onClick={() => setSelectedDisputeModal(null)}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              Cancel
            </Button>
<Button onClick={handleResolveDispute} disabled={submitting} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Resolve Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
