"use client";

import { useState } from "react";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnectionSuccess?: (credentialId?: string) => void;
}

export const InstagramConnectionModal = ({ open, onClose, onConnectionSuccess }: Props) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const token = await authService.getUserToken();
      const res = await fetch('/api/integrations/instagram/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to initiate Instagram auth');
        return;
      }
      window.location.href = data.data.authUrl;
    } catch (e) {
      setError('Failed to start Instagram connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-neutral-900 text-white border border-white/10">
        <DialogHeader>
          <DialogTitle>Connect Instagram</DialogTitle>
          <DialogDescription>
            Authorize access to your Instagram Business Account for media and messaging.
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-white/5 border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/80">
            <div>• Click Connect and login with Facebook/Instagram</div>
            <div>• Select your IG Business account linked to a Facebook Page</div>
            <div>• Grant required permissions</div>
          </CardContent>
        </Card>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleConnect} className="flex-1">
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : <><ExternalLink className="w-4 h-4 mr-2" /> Connect</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
