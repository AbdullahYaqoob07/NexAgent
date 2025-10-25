"use client";

import { useState } from "react";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingBag, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ShopifyConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onConnectionSuccess?: (credentialId: string) => void;
}

export const ShopifyConnectionModal = ({ 
  open, 
  onClose, 
  onConnectionSuccess 
}: ShopifyConnectionModalProps) => {
  const [shopDomain, setShopDomain] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      setError("Please enter your shop domain");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const token = await authService.getUserToken();
      const response = await fetch('/api/integrations/shopify/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shopDomain: shopDomain.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to Shopify OAuth
        window.location.href = result.data.authUrl;
      } else {
        setError(result.error || 'Failed to initiate connection');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect to Shopify. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDomainChange = (value: string) => {
    setShopDomain(value);
    setError(null);
  };

  const formatShopDomain = (domain: string) => {
    // Remove common URL prefixes and suffixes
    let formatted = domain
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com$/, '')
      .replace(/\/$/, '');
    
    return formatted;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
<<<<<<< HEAD
      <DialogContent className="max-w-md">
=======
<DialogContent className="max-w-md bg-neutral-900 text-white border border-white/10">
>>>>>>> 52f0342f9c042b37ca534d495ca3a26475f642fc
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#96bf48] rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            Connect Shopify Store
          </DialogTitle>
          <DialogDescription>
            Connect your Shopify store to trigger workflows when orders are placed, updated, or cancelled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Steps */}
<<<<<<< HEAD
          <Card>
=======
<Card className="bg-white/5 border border-white/10 text-white">
>>>>>>> 52f0342f9c042b37ca534d495ca3a26475f642fc
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How it works:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Enter your Shopify store domain
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Authorize NexAgent to access your store
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Start creating workflows with Shopify triggers
              </div>
            </CardContent>
          </Card>

          {/* Shop Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="shopDomain">Shop Domain</Label>
            <div className="relative">
              <Input
                id="shopDomain"
                placeholder="your-store"
                value={shopDomain}
                onChange={(e) => handleDomainChange(formatShopDomain(e.target.value))}
                className="pr-32"
                disabled={isConnecting}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                .myshopify.com
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your shop's subdomain (e.g., "my-store" for my-store.myshopify.com)
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Permissions Info */}
<<<<<<< HEAD
          <Card>
=======
<Card className="bg-white/5 border border-white/10 text-white">
>>>>>>> 52f0342f9c042b37ca534d495ca3a26475f642fc
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Required Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <div>• Read orders and customer information</div>
              <div>• Read product information</div>
              <div>• Create webhooks for real-time updates</div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConnecting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!shopDomain.trim() || isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Store
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You'll be redirected to Shopify to authorize the connection
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};