'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail, Lock, Eye, EyeOff, User, ArrowRight, Star, Check, MailCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, sendVerificationEmail } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Password validation: at least 8 characters, including uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!passwordRegex.test(password)) {
      setError('Password must contain at least 8 characters with uppercase, lowercase, and a number');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, displayName);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      await sendVerificationEmail();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen relative overflow-hidden flex items-center justify-center bg-black">
        {/* Premium Background */}
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
              {/* Compact Success Icon */}
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
                Check Your Email
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-sm mb-4 leading-relaxed"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                We've sent you a secure verification link to <span className="text-white font-semibold">{email}</span> to complete your account setup.
              </motion.p>

              {resendSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs text-center"
                >
                  ✓ Verification email sent successfully!
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-xs text-center"
                >
                  {error}
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-3"
              >
                <Button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  variant="outline"
                  className="w-full h-10 bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-lg font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {resendLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MailCheck className="w-4 h-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => router.push('/sign-in')}
                  className="w-full h-11 bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-bold text-sm rounded-lg shadow-lg shadow-[#FF6900]/25 hover:shadow-[#FF6900]/40 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Go to Sign In
                  <ArrowRight className="w-4 h-4" />
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
          alt="Sign Up Background"
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
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#FF6900]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
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
          {/* <motion.div
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
            <span className="text-xs text-white/90 font-medium">Join platform</span>
          </motion.div> */}
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
                Create Account
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white/70 text-xs"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Start your automation journey
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

            {/* Compact Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-1"
              >
                <Label htmlFor="displayName" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Enter full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 h-9 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="space-y-1"
              >
                <Label htmlFor="email" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Business Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter business email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-9 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="space-y-1"
              >
                <Label htmlFor="password" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-9 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="space-y-1"
              >
                <Label htmlFor="confirmPassword" className="text-white font-medium text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>Confirm Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#FF6900] transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-9 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-[#FF6900] focus:bg-white/10 transition-all text-sm"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1 }}
                className="pt-1"
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#FF6900] hover:bg-[#E55D00] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-bold text-sm rounded-lg shadow-lg shadow-[#FF6900]/25 hover:shadow-[#FF6900]/40 transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
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
              transition={{ duration: 0.6, delay: 1.2 }}
              className="relative my-4"
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black/40 px-2 text-white/60 font-medium">Or sign up with</span>
              </div>
            </motion.div>

            {/* Compact Google Sign Up */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              <Button
                onClick={handleGoogleSignUp}
                disabled={loading}
                variant="outline"
                className="w-full h-9 bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-lg font-medium text-sm transition-all duration-300"
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

            {/* Compact Sign In Link */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="text-center mt-4 text-white/70 text-sm"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Already have an account?{' '}
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
        {/* <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.5 }}
          className="text-center mt-3 text-white/60 text-xs"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              Free 14-day trial
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
              No credit card required
            </div>
          </div>
        </motion.div> */}
      </div>
    </div>
  );
}