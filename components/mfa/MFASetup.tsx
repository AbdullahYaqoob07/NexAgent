'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CheckCircle2, Copy, Download, Loader2, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface MFASetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function MFASetup({ open, onClose, onComplete }: MFASetupProps) {
  const { getUserToken } = useAuth();
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [manualKey, setManualKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
      // Get Firebase ID token directly from auth service
      const token = await getUserToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in again.');
      }
      
      const response = await fetch(`${backendUrl}/api/v1/auth/mfa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to setup MFA');
      }

      const data = await response.json();
      setQrCode(data.qr_code);
      setManualKey(data.manual_entry_key);
      // Stay on 'qr' step - user needs to see QR code and click Continue
    } catch (err: any) {
      setError(err.message || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';
      // Get Firebase ID token directly from auth service
      const token = await getUserToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in again.');
      }
      
      const response = await fetch(`${backendUrl}/api/v1/auth/mfa/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: verificationCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid verification code');
      }

      const data = await response.json();
      setBackupCodes(data.backup_codes);
      setStep('backup');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexagent-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    setStep('qr');
    setVerificationCode('');
    setBackupCodes([]);
    setQrCode('');
    setManualKey('');
    setError('');
    onComplete();
    onClose();
  };

  // Reset state when dialog opens (but don't auto-fetch QR code)
  useEffect(() => {
    if (open) {
      setStep('qr');
      setQrCode('');
      setManualKey('');
      setVerificationCode('');
      setBackupCodes([]);
      setError('');
      setLoading(false);
      // Don't auto-fetch - let user click "Start Setup" button
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] bg-[#1a1410]/95 backdrop-blur-xl border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'qr' && 'Scan the QR code with your authenticator app to get started.'}
            {step === 'verify' && 'Enter the 6-digit code from your authenticator app to verify setup.'}
            {step === 'backup' && 'Save these backup codes in a safe place. You can use them if you lose access to your authenticator app.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'qr' && (
          <div className="space-y-4">
            {!qrCode ? (
              <div className="text-center py-8">
                <Button onClick={handleSetup} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Start Setup
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-lg border-2 border-white/20">
                    <QRCodeSVG value={qrCode} size={200} />
                  </div>
                  
                  <div className="w-full space-y-2">
                    <Label className="text-white/80">Or enter this key manually:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={manualKey}
                        readOnly
                        className="font-mono text-sm bg-white/5 border-white/20 text-white"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(manualKey);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-white/80">
                    <p className="font-semibold mb-2 text-white">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left text-white/70">
                      <li>Open Google Authenticator, Authy, or Microsoft Authenticator</li>
                      <li>Tap the + button to add a new account</li>
                      <li>Scan the QR code above or enter the key manually</li>
                      <li>Click Continue to verify</li>
                    </ol>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => setStep('verify')} className="flex-1">
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter verification code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onComplete={handleVerify}
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
              <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6} className="flex-1">
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
        )}

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm font-semibold mb-2 text-white">⚠️ Important: Save these codes now!</p>
              <p className="text-sm text-white/70">
                You won't be able to see them again. Store them in a safe place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-white/5 rounded-lg">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm text-center p-2 bg-white/5 border border-white/10 rounded text-white">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <Button onClick={handleComplete} className="w-full">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Done, I've saved my backup codes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

