"use client";

import { useState } from "react";
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
  DollarSign,
  Eye,
  Ban,
  Check,
  X,
  MessageSquare,
  Download,
} from "lucide-react";

// Dummy data
const overviewData = {
  totalNexas: 1243,
  totalSellers: 247,
  totalPurchases: 5821,
  totalRevenue: 125430.50,
  pendingNexas: 34,
  pendingSellers: 12,
  pendingDisputes: 8,
  activeNexas: 987,
};

const revenueData = [
  { date: "Jan 1", revenue: 4000, sales: 240 },
  { date: "Jan 8", revenue: 3000, sales: 221 },
  { date: "Jan 15", revenue: 2000, sales: 229 },
  { date: "Jan 22", revenue: 2780, sales: 200 },
  { date: "Jan 29", revenue: 1890, sales: 229 },
  { date: "Feb 5", revenue: 2390, sales: 200 },
  { date: "Feb 12", revenue: 3490, sales: 210 },
];

const categoryData = [
  { name: "Automation", value: 320, color: "#FF6900" },
  { name: "API Integration", value: 280, color: "#FF8C3B" },
  { name: "Data Processing", value: 240, color: "#FFB266" },
  { name: "Analytics", value: 180, color: "#FFD699" },
  { name: "Others", value: 223, color: "#8B7355" },
];

const topSellers = [
  {
    id: 1,
    name: "Automation Labs Inc",
    nexas: 45,
    sales: 1230,
    revenue: 18500,
    status: "verified",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Data Integration Pro",
    nexas: 32,
    sales: 980,
    revenue: 14200,
    status: "verified",
    rating: 4.6,
  },
  {
    id: 3,
    name: "API Solutions Co",
    nexas: 28,
    sales: 756,
    revenue: 11340,
    status: "verified",
    rating: 4.7,
  },
  {
    id: 4,
    name: "Tech Workflows LLC",
    nexas: 24,
    sales: 623,
    revenue: 9345,
    status: "active",
    rating: 4.5,
  },
];

const pendingNexasData = [
  {
    id: "nexa-1",
    title: "Email Campaign Automator",
    seller: "Marketing Automation Co",
    category: "Marketing",
    created: "2024-10-30",
    status: "pending_review",
  },
  {
    id: "nexa-2",
    title: "Database Sync Tool",
    seller: "Data Integration Pro",
    category: "Data Processing",
    created: "2024-10-29",
    status: "pending_review",
  },
  {
    id: "nexa-3",
    title: "Social Media Scheduler",
    seller: "Social Media Tools Inc",
    category: "Social Media",
    created: "2024-10-28",
    status: "pending_review",
  },
  {
    id: "nexa-4",
    title: "Invoice Generator",
    seller: "Finance Systems LLC",
    category: "Finance",
    created: "2024-10-27",
    status: "pending_review",
  },
];

const pendingSellers = [
  {
    id: "seller-1",
    businessName: "CloudSync Solutions",
    email: "contact@cloudsync.com",
    country: "US",
    applied: "2024-10-29",
    status: "pending",
  },
  {
    id: "seller-2",
    businessName: "Data Flow Systems",
    email: "info@dataflow.com",
    country: "UK",
    applied: "2024-10-28",
    status: "pending",
  },
  {
    id: "seller-3",
    businessName: "Workflow Innovations",
    email: "hello@workflowinn.com",
    country: "Canada",
    applied: "2024-10-27",
    status: "pending",
  },
];

const activeDisputes = [
  {
    id: "dispute-1",
    purchaseId: "purchase-101",
    buyer: "John Doe",
    seller: "Automation Labs Inc",
    nexa: "Email Automation Pro",
    amount: 29.99,
    reason: "Not working as described",
    status: "open",
    created: "2024-10-28",
  },
  {
    id: "dispute-2",
    purchaseId: "purchase-102",
    buyer: "Jane Smith",
    seller: "Data Integration Pro",
    nexa: "Database Sync",
    amount: 49.99,
    reason: "Quality issues",
    status: "open",
    created: "2024-10-27",
  },
  {
    id: "dispute-3",
    purchaseId: "purchase-103",
    buyer: "Mike Johnson",
    seller: "API Solutions Co",
    nexa: "API Gateway",
    amount: 79.99,
    reason: "Refund requested",
    status: "pending_resolution",
    created: "2024-10-26",
  },
];

const recentTransactions = [
  {
    id: "tx-1",
    purchaseId: "purchase-201",
    buyer: "Alice Brown",
    seller: "Automation Labs Inc",
    nexa: "Email Campaign Automator",
    amount: 29.99,
    status: "completed",
    date: "2024-10-30",
  },
  {
    id: "tx-2",
    purchaseId: "purchase-202",
    buyer: "Bob Wilson",
    seller: "Data Integration Pro",
    nexa: "Database Sync Tool",
    amount: 49.99,
    status: "completed",
    date: "2024-10-30",
  },
  {
    id: "tx-3",
    purchaseId: "purchase-203",
    buyer: "Carol Davis",
    seller: "API Solutions Co",
    nexa: "REST API Builder",
    amount: 59.99,
    status: "completed",
    date: "2024-10-29",
  },
  {
    id: "tx-4",
    purchaseId: "purchase-204",
    buyer: "David Lee",
    seller: "Tech Workflows LLC",
    nexa: "Workflow Designer",
    amount: 39.99,
    status: "failed",
    date: "2024-10-29",
  },
];

export default function MarketplaceAdminPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedNexaModal, setSelectedNexaModal] = useState(null);
  const [selectedSellerModal, setSelectedSellerModal] = useState(null);
  const [selectedDisputeModal, setSelectedDisputeModal] = useState(null);
  const [moderationAction, setModerationAction] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(null);

  const downloadTransactionPDF = async (transaction) => {
    try {
      setDownloadingPDF(transaction.id);
      
      const params = new URLSearchParams({
        purchase_id: transaction.purchaseId,
        buyer: transaction.buyer,
        seller: transaction.seller,
        nexa: transaction.nexa,
        amount: transaction.amount,
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

  const getStatusColor = (status) => {
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
        <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Overview</TabsTrigger>
          <TabsTrigger value="nexas" className="data-[state=active]:text-black data-[state=inactive]:text-white/60">Nexas</TabsTrigger>
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
                  {overviewData.totalNexas}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {overviewData.activeNexas} active
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
                  {overviewData.totalSellers}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {overviewData.pendingSellers} pending
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
                  {overviewData.totalPurchases.toLocaleString()}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {overviewData.pendingDisputes} disputes
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
                  ${overviewData.totalRevenue.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {overviewData.pendingNexas} pending review
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
                {topSellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{seller.name}</p>
                      <p className="text-white/60 text-sm">
                        {seller.sales} sales • {seller.nexas} Nexas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        ${seller.revenue.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-white/60 text-sm">{seller.rating}</span>
                        <Badge className={`ml-2 ${getStatusColor(seller.status)}`}>
                          {seller.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nexas Tab */}
        <TabsContent value="nexas" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pending Nexas Review</CardTitle>
                  <CardDescription className="text-white/60">
                    {pendingNexasData.length} awaiting moderation
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
                {pendingNexasData.map((nexa) => (
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
                        Submitted {nexa.created}
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
                    {pendingSellers.length} awaiting approval
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
                {pendingSellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        {seller.businessName}
                      </p>
                      <p className="text-white/60 text-sm">{seller.email}</p>
                      <p className="text-white/50 text-xs mt-1">
                        Applied {seller.applied} • {seller.country}
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
                    {activeDisputes.length} disputes pending resolution
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
                {activeDisputes.map((dispute) => (
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
                    {recentTransactions.length} recent purchases
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
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.purchaseId}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.buyer}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.nexa}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {tx.seller}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm font-semibold">
                          ${tx.amount}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-white/60 text-sm">
                          {tx.date}
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
            <Button className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30">
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
                    {selectedSellerModal.businessName}
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
            <Button className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30">
              <Check className="w-4 h-4 mr-1" />
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
            <Button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30">
              <Check className="w-4 h-4 mr-1" />
              Resolve Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
