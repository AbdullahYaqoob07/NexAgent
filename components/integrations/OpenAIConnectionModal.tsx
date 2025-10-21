"use client";

import { useState } from "react";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Key, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnectionSuccess?: (credentialId: string) => void;
}

export const OpenAIConnectionModal = ({ open, onClose, onConnectionSuccess }: Props) => {
  const [apiKey, setApiKey] = useState("");
  const [organization, setOrganization] = useState("");
  const [project, setProject] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const token = await authService.getUserToken();
      const res = await fetch('/api/integrations/openai/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiKey, organization, project })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save OpenAI credential');
        return;
      }

      onConnectionSuccess?.(data.data.credentialId);
      onClose();
    } catch (e) {
      setError('Failed to connect OpenAI. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-neutral-900 text-white border border-white/10">
        <DialogHeader>
          <DialogTitle>Connect OpenAI</DialogTitle>
          <DialogDescription>
            Add your API key to enable OpenAI nodes in workflows.
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-white/5 border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2"><Key className="w-4 h-4" /> API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="bg-white/5 border-white/10 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border border-white/10 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Optional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Organization</Label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="org_..." className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="project name (optional)" className="bg-white/5 border-white/10 text-white" />
            </div>
          </CardContent>
        </Card>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isConnecting} className="flex-1">Cancel</Button>
          <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};