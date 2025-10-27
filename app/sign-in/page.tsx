'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      
      // Check if user is admin and redirect accordingly
      setTimeout(() => {
        const isAdmin = localStorage.getItem('user_is_admin') === 'true';
        const redirectUrl = localStorage.getItem('admin_redirect_url');
        
        if (isAdmin && redirectUrl) {
          console.log('🔐 Redirecting admin user to:', redirectUrl);
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
      }, 100); // Small delay to ensure localStorage is updated
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      
      // Check if user is admin and redirect accordingly
      setTimeout(() => {
        const isAdmin = localStorage.getItem('user_is_admin') === 'true';
        const redirectUrl = localStorage.getItem('admin_redirect_url');
        
        if (isAdmin && redirectUrl) {
          console.log('🔐 Redirecting admin user to:', redirectUrl);
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
      }, 100); // Small delay to ensure localStorage is updated
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen relative overflow-hidden flex items-center justify-center bg-black">
      {/* Premium Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/hero/Hero-BG.svg"
          alt="Authentication Background"
          fill
          className="object-cover w-full h-full"
          priority
        />
        {/* Enhanced overlay for auth pages */}
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
            <span className="text-xs text-white/90 font-medium">Trusted platform</span>
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
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Welcome Back
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-sm"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Continue your automation journey
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
            <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                    placeholder="Enter your email"
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
                className="space-y-1.5"
              >
                <Label htmlFor="password" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="text-right"
              >
                <Link 
                  href="/reset-password" 
                  className="text-xs text-[#FF6900] hover:text-[#FF8555] font-medium transition-colors"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Forgot password?
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
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
                      Signing you in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Compact Divider */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="relative my-5"
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black/40 px-3 text-white/60 font-medium">Or continue with</span>
              </div>
            </motion.div>

            {/* Compact Google Sign In */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full h-10 bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-lg font-medium text-sm transition-all duration-300"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </motion.div>

            {/* Compact Sign Up Link */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
              className="text-center mt-5 text-white/70 text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Don't have an account?{' '}
              <Link 
                href="/sign-up" 
                className="text-[#FF6900] hover:text-[#FF8555] font-semibold transition-colors hover:underline"
              >
                Create one now
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Compact Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.4 }}
          className="text-center mt-4 text-white/60 text-xs"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              Enterprise Security
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              SOC 2 Certified
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}