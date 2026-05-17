'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, ArrowLeft, ArrowRight, Check, MailCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import apiClient from '@/lib/api/client';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const userId = searchParams?.get('userId') || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setError('');
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      setLoading(false);
      return;
    }

    try {
      // Get Firebase token first
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      
      if (!user) {
        setError('Session expired. Please sign in again.');
        router.push('/sign-in');
        return;
      }

      const idToken = await user.getIdToken();

      // Verify OTP
      const response = await apiClient.post('/api/v1/two-factor/verify-otp', {
        otp: otpCode
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (response.data.success) {
        // Reset failed login attempts on successful OTP verification
        try {
          await apiClient.post('/api/v1/two-factor/reset-failed-attempts', {}, {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          });
        } catch (resetError) {
          console.warn('Failed to reset failed attempts:', resetError);
        }

        setSuccess(true);
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Invalid OTP code. Please try again.';
      setError(errorMessage);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      
      if (!user) {
        setError('Session expired. Please sign in again.');
        router.push('/sign-in');
        return;
      }

      const idToken = await user.getIdToken();

      const response = await apiClient.post('/api/v1/two-factor/send-otp', {}, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (response.data.success) {
        setResendCooldown(60); // 1 minute cooldown
        setError('');
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to resend OTP. Please try again.';
      setError(errorMessage);
      
      // Check if it's a rate limit error
      if (error?.response?.status === 429) {
        const waitTime = errorMessage.match(/(\d+)\s+seconds/)?.[1];
        if (waitTime) {
          setResendCooldown(parseInt(waitTime));
        }
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen relative overflow-hidden flex items-center justify-center bg-black">
        <div className="absolute inset-0">
          <Image
            src="/assets/hero/Hero-BG.svg"
            alt="Success Background"
            fill
            className="object-cover w-full h-full"
            priority
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-[#FF6900]/10" />
        </div>

        <div className="relative z-10 w-full max-w-sm mx-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-black/40 overflow-hidden text-center"
          >
            <div className="h-0.5 bg-gradient-to-r from-[#FF6900] to-[#FF8555]" />
            
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-16 h-16 bg-gradient-to-r from-[#FF6900] to-[#FF8555] rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-2xl font-bold text-white mb-3"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Verification Successful
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-sm mb-6 leading-relaxed"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Redirecting to your dashboard...
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative overflow-hidden flex items-center justify-center bg-black">
      {/* Premium Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/hero/Hero-BG.svg"
          alt="OTP Verification Background"
          fill
          className="object-cover w-full h-full"
          priority
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-[#FF6900]/10" />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Compact Logo Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <Link href="/" className="inline-block">
            <Image
              src="/assets/logo/Logo.svg"
              alt="NexAgent Logo"
              width={140}
              height={42}
              className="h-10 w-auto mx-auto mb-2"
              priority
            />
          </Link>
        </motion.div>

        {/* Compact Premium Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* Gradient top border */}
          <div className="h-0.5 bg-gradient-to-r from-[#FF6900] to-[#FF8555]" />
          
          <div className="p-5">
            {/* Compact Header */}
            <div className="text-center mb-4">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-xl font-bold text-white mb-1"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Verify Your Email
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-xs"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Enter the 6-digit code sent to <span className="text-white font-semibold">{email || 'your email'}</span>
              </motion.p>
            </div>

            {/* Compact Error Display */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 text-red-400 bg-red-400/10 border border-red-400/20 p-2 rounded-lg mb-3"
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}

            {/* OTP Input Form */}
            <form onSubmit={handleVerifyOTP} className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-2"
              >
                <Label className="text-white font-medium text-xs text-center block" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Verification Code
                </Label>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-12 text-center text-lg font-bold bg-white/5 border border-white/20 rounded-lg text-white focus:border-[#FF6900] focus:bg-white/10 transition-all"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="pt-1"
              >
                <Button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-10 bg-[#FF6900] hover:bg-[#E55D00] text-white font-bold text-sm rounded-lg shadow-lg shadow-[#FF6900]/25 hover:shadow-[#FF6900]/40 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Resend OTP */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-center mt-4"
            >
              <button
                onClick={handleResendOTP}
                disabled={resendLoading || resendCooldown > 0}
                className="text-xs text-white/70 hover:text-[#FF6900] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {resendLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3 h-3" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <MailCheck className="w-3 h-3" />
                    Resend Code
                  </>
                )}
              </button>
            </motion.div>

            {/* Back to Sign In */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="text-center mt-4 text-white/70 text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <Link 
                href="/sign-in" 
                className="text-[#FF6900] hover:text-[#FF8555] font-semibold transition-colors hover:underline flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Sign In
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

