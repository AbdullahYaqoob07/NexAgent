'use client';

import { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Key } from 'lucide-react';

interface MFAVerifyProps {
  uid: string;
  onVerify: (code: string) => Promise<void>;
  onUseBackupCode?: () => void;
  error?: string;
}

export function MFAVerify({ uid, onVerify, onUseBackupCode, error }: MFAVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      return;
    }

    setLoading(true);
    try {
      await onVerify(code);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6 && !useBackup) {
      handleVerify();
    }
  }, [code]);

  if (useBackup) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <Key className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Enter Backup Code</h3>
          <p className="text-sm text-muted-foreground">
            Enter one of your backup codes to sign in
          </p>
        </div>

        <div className="space-y-2">
          <Label>Backup Code</Label>
          <InputOTP
            maxLength={8}
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
              <InputOTPSlot index={6} />
              <InputOTPSlot index={7} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setUseBackup(false);
              setCode('');
            }}
            className="flex-1"
          >
            Use Authenticator Code
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 8}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Shield className="h-12 w-12 mx-auto text-primary" />
        <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="space-y-2">
        <Label>Verification Code</Label>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            disabled={loading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {onUseBackupCode && (
        <Button
          variant="link"
          onClick={() => setUseBackup(true)}
          className="w-full"
        >
          Use a backup code instead
        </Button>
      )}

      {loading && (
        <div className="flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

