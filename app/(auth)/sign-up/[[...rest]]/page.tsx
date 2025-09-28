"use client";

import { SignUp } from "@clerk/nextjs";
import { Zap, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,105,0,0.03),transparent_70%)]" />
        {/* Subtle glassy overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,105,0,0.05),transparent_50%)]" />
      </div>

      {/* Header */}
      <motion.div 
        className="absolute top-8 left-8 flex items-center gap-3 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-xl flex items-center justify-center shadow-lg hover:shadow-[#FF6900]/25 transition-all duration-300">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <span className="text-3xl font-bold text-white">
          Nex<span className="text-[#FF6900]">Agent</span>
        </span>
      </motion.div>

      {/* Back to Home Link */}
      <motion.div 
        className="absolute top-8 right-8 z-10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Link 
          href="/"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Header Text */}
          <div className="text-center mb-6 mr-5">
            <h1 className="text-4xl font-bold text-white mb-3">
              Create your account
            </h1>
            <p className="text-white/70 text-lg">
              Join thousands of users building the future with AI-powered workflows
            </p>
          </div>

          
          {/* Sign Up Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-black/30 backdrop-blur-2xl border border-white/20 shadow-2xl p-8 rounded-2xl w-full",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlock: "flex flex-col gap-4 mb-6",
                  socialButtonsBlockButton: 
                    "flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-[#FF6900]/50 font-medium py-3 px-6 rounded-xl transition-all duration-300 w-full group shadow-lg min-h-[48px]",
                  socialButtonsBlockButtonText: "text-white font-medium text-sm",
                  socialButtonsBlockButtonIcon: "w-5 h-5 flex-shrink-0",
                  dividerLine: "bg-white/20",
                  dividerText: "text-white/60 text-sm",
                  formFieldInput: 
                    "bg-white/5 border border-white/20 text-white placeholder-white/50 focus:border-[#FF6900] focus:ring-[#FF6900]/20 rounded-xl py-3 px-4 transition-all duration-300 w-full",
                  formFieldLabel: "text-white/80 font-medium mb-2 text-sm",
                  formButtonPrimary: 
                    "bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 w-full shadow-lg hover:shadow-[#FF6900]/25 hover:scale-105 active:scale-95 min-h-[48px]",
                  formFieldInputShowPasswordButton: "text-white/60 hover:text-white",
                  formFieldInputShowPasswordIcon: "text-white/60 w-4 h-4",
                  footerActionLink: "text-[#FF6900] hover:text-[#FF8555] font-medium transition-colors duration-300 text-sm",
                  identityPreviewText: "text-white/80 text-sm",
                  formFieldSuccessText: "text-green-400 text-sm",
                  formFieldErrorText: "text-red-400 text-sm",
                  alertText: "text-red-400 text-sm",
                  formResendCodeLink: "text-[#FF6900] hover:text-[#FF8555] text-sm",
                  otpCodeFieldInput: "bg-white/5 border border-white/20 text-white focus:border-[#FF6900] rounded-xl text-center",
                  formHeaderTitle: "text-white text-2xl font-bold",
                  formHeaderSubtitle: "text-white/70",
                  footer: "hidden",
                  formField: "space-y-2",
                  formFieldRow: "flex flex-col gap-4",
                },
              }}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
            />
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}