"use client";

import { useState } from "react";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, Phone, Key, ShieldCheck } from "lucide-react";
import WhatsAppLogo from "@/components/icons/brands/WhatsAppLogo";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnectionSuccess?: (credentialId: string) => void;
}

export const WhatsAppConnectionModal = ({ open, onClose, onConnectionSuccess }: Props) => {
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [token, setToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!businessAccountId || !phoneNumberId || !token || !verifyToken) {
      setError("Please fill all required fields");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const auth = await authService.getUserToken();
      const res = await fetch('/api/integrations/whatsapp/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth}`,
        },
        body: JSON.stringify({
          businessAccountId,
          phoneNumberId,
          token,
          webhookVerifyToken: verifyToken,
          defaultTemplateLanguage: language,
          displayName,
          phoneNumber,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save credential');
        return;
      }
      onConnectionSuccess?.(data.data.credentialId);
      onClose();
      // Optionally show webhook URL
      alert(`Webhook URL: ${data.data.webhookUrl}`);
    } catch (e) {
      setError('Failed to connect WhatsApp. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
<DialogContent className="max-w-2xl bg-neutral-900 text-white border border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <WhatsAppLogo />
            </div>
            Connect WhatsApp Cloud API
          </DialogTitle>
          <DialogDescription>
            Provide your Business Account details to enable WhatsApp nodes and webhooks.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-2 text-sm">
          <div className={`h-2 w-24 rounded ${step === 1 ? 'bg-emerald-500' : 'bg-emerald-700'}`} />
          <div className={`h-2 w-24 rounded ${step === 2 ? 'bg-emerald-500' : 'bg-white/20'}`} />
          <span className="ml-2 text-white/60">{step === 1 ? 'Step 1 of 2 · Required' : 'Step 2 of 2 · Optional'}</span>
        </div>

        <div className="space-y-4">
          {/* Step 1: Required */}
          {step === 1 && (
            <Card className="bg-white/5 border border-white/10 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Required Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Business Account ID</Label>
                  <Input value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)} placeholder="WA_BUSINESS_ACCOUNT_ID" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone Number ID</Label>
                  <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="WA_PHONE_NUMBER_ID" />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label className="flex items-center gap-2"><Key className="w-4 h-4" /> Access Token</Label>
                  <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="WA_ACCESS_TOKEN" />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Webhook Verify Token</Label>
                  <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="WA_WEBHOOK_VERIFY_TOKEN" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Optional */}
          {step === 2 && (
            <Card className="bg-white/5 border border-white/10 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Optional</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Default Template Language</Label>
                  <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en_US" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Business Display Name" />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Phone Number</Label>
                  <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+15551234567" />
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isConnecting} className="flex-1">
              Cancel
            </Button>
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={isConnecting || !businessAccountId || !phoneNumberId || !token || !verifyToken}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
                {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : 'Connect'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};