"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">Next-Gen AI Platform • 3025</span>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </div>
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
          <br />
          <span className="text-white">of AI</span>
          <br />
          <span className="relative">
            <span className="text-cyan-400">
              Intelligence
            </span>
            <motion.div
              className="absolute -right-4 -top-2 w-2 h-2 bg-cyan-400 rounded-full"
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
          <span className="text-cyan-400 font-semibold"> future</span>. 
          Transform your workflow with cutting-edge automation and intelligent insights.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <Button 
            size="lg" 
            className="group bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="group glass-card border-white/20 hover:border-cyan-400/50 text-white px-8 py-6 text-lg rounded-xl transition-all duration-300"
          >
            <Zap className="mr-2 w-5 h-5" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">99.9%</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">10M+</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Queries/Day</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400 mb-2">250ms</div>
            <div className="text-white/60 text-sm uppercase tracking-wider">Response Time</div>
          </div>
        </motion.div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
