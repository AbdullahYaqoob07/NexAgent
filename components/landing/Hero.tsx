"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AnimatedBackground from "./AnimatedBackground";

export default function Hero() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    } else {
      router.push('/sign-in');
    }
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden w-full">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight"
        >
          <span className="text-white">
            The Future
          </span>
         
          <span className="text-white"> of AI</span>
          <br />
          <span className="relative">
            <span className="text-[#FF6900]">
              Intelligence
            </span>
            <motion.div
              className="absolute -right-4 -top-2 w-2 h-2 bg-[#FF6900] rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl sm:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Experience the power of advanced artificial intelligence designed for the
          <span className="text-[#FF6900] font-semibold"> future</span>. 
          Transform your workflow with cutting-edge automation and intelligent insights.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
         <button 
            onClick={handleGetStarted}
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-8 py-3 rounded-xl neon-glow hover-lift transition-all duration-300 flex items-center gap-2"
          >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
          
          <button className="glass border-white/20 hover:border-[#FF6900]/50 text-white font-semibold px-8 py-3 rounded-xl hover-lift transition-all duration-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Watch Demo
              </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[#FF6900] mb-2">99.9%</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#FF6900] mb-2">10M+</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Queries/Day</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#FF6900] mb-2">250ms</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Response Time</div>
          </div>
        </motion.div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
