"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import AnimatedBackground from "./AnimatedBackground";

export default function Hero() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/workflows');
  };

  return (
    <section id="hero" className="relative min-h-screen flex mt-6 items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full mb-8"
        >
          <div className="w-2 h-2 bg-[#FF6900] rounded-full animate-pulse" />
          <span className="text-sm text-zinc-300 font-medium">Enterprise AI Automation Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight tracking-tight"
        >
          <span className="text-white">
            Automate Your Business
          </span>
          <br />
          <span className="text-white">with </span>
          <span className="text-[#FF6900]">
            Intelligent Workflows
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg sm:text-xl text-zinc-300 mb-8 max-w-2xl mx-auto leading-relaxed"
        >
          Build powerful automation workflows without code. Connect your tools, 
          process data, and scale operations with enterprise-grade reliability.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex items-center justify-center gap-8 mb-12 text-sm text-zinc-400"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>99.99% Uptime SLA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span>Enterprise Security</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <button 
            onClick={handleGetStarted}
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            Start Building Workflows
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button className="bg-transparent border-2 border-zinc-700 hover:border-zinc-600 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Book a Demo
          </button>
        </motion.div>

        {/* Enterprise Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto pt-8 border-t border-zinc-800"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">500K+</div>
            <div className="text-zinc-400 text-sm">Workflows Executed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">99.99%</div>
            <div className="text-zinc-400 text-sm">Uptime SLA</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">10K+</div>
            <div className="text-zinc-400 text-sm">Enterprise Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">&lt;100ms</div>
            <div className="text-zinc-400 text-sm">Average Response</div>
          </div>
        </motion.div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
