'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
              <CardDescription className="text-white/70">
                Password reset link sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="text-white/80">
                We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
              </div>
              <Button
                onClick={() => router.push('/sign-in')}
                className="w-full bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
            <CardDescription className="text-white/70">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="text-center text-sm text-white/70">
              Remember your password?{' '}
              <Link href="/sign-in" className="text-[#FF6900] hover:text-[#FF8555]">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}