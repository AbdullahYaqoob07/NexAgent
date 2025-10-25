'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, ArrowLeft, ArrowRight, Star, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
      <div className="h-screen relative overflow-hidden flex items-center justify-center bg-black">
        {/* Premium Background */}
        <div className="absolute inset-0">
          <Image
            src="/assets/hero/Hero-BG.svg"
            alt="Reset Success Background"
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
              {/* Compact Success Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-16 h-16 bg-gradient-to-r from-[#FF6900] to-[#FF8555] rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Mail className="w-8 h-8 text-white" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-2xl font-bold text-white mb-3"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Check Your Email
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-sm mb-6 leading-relaxed"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                We've sent a secure password reset link to your email address.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <Button
                  onClick={() => router.push('/sign-in')}
                  className="w-full h-11 bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-bold text-sm rounded-lg shadow-lg shadow-[#FF6900]/25 hover:shadow-[#FF6900]/40 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Button>
              </motion.div>
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
          alt="Reset Password Background"
          fill
          className="object-cover w-full h-full"
          priority
        />
        {/* Enhanced overlay */}
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-[#FF6900]/10" />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Compact Logo Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <Link href="/" className="inline-block">
            <Image
              src="/assets/logo/Logo.svg"
              alt="NexAgent Logo"
              width={140}
              height={42}
              className="h-10 w-auto mx-auto mb-3"
              priority
            />
          </Link>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6900]/20 to-[#FF6900]/10 border border-[#FF6900]/30 rounded-full px-3 py-1 backdrop-blur-sm"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-[#FF6900] text-[#FF6900]" />
              ))}
            </div>
            <span className="text-xs text-white/90 font-medium">Secure & trusted</span>
          </motion.div>
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
          
          <div className="p-6">
            {/* Compact Header */}
            <div className="text-center mb-6">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Reset Password
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-sm"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Enter your email for a secure reset link
              </motion.p>
            </div>

            {/* Compact Error Display */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-lg mb-4"
              >
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}

            {/* Compact Form */}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-1.5"
              >
                <Label htmlFor="email" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-bold text-sm rounded-lg shadow-lg shadow-[#FF6900]/25 hover:shadow-[#FF6900]/40 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Compact Sign In Link */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-center mt-5 text-white/70 text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Remember your password?{' '}
              <Link 
                href="/sign-in" 
                className="text-[#FF6900] hover:text-[#FF8555] font-semibold transition-colors hover:underline"
              >
                Sign in here
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Compact Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="text-center mt-4 text-white/60 text-xs"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              Secure Recovery
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              Encrypted Process
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}