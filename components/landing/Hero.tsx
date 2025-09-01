"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20">
      <AnimatedBackground />
      
      <div className="relative z-10 content-max container-padding">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-white leading-tight">
                Enterprise-Grade
                <br />
                <span className="text-orange">AI Solutions</span>
              </h1>
              
              <p className="lead max-w-lg">
                Power your business operations with advanced artificial intelligence. 
                Scalable, secure, and built for mission-critical applications.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                className="bg-orange hover:bg-orange-dark text-white font-medium px-8 py-4 rounded-md transition-standard group"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="border-border hover:bg-muted text-white px-8 py-4 rounded-md transition-standard"
              >
                <Play className="mr-2 w-5 h-5" />
                View Demo
              </Button>
            </motion.div>

            {/* Professional metrics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-8 pt-8 border-t border-border"
            >
              <div>
                <div className="text-2xl font-bold text-orange mb-1">99.9%</div>
                <div className="text-muted-foreground text-sm font-medium">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange mb-1">&lt;50ms</div>
                <div className="text-muted-foreground text-sm font-medium">Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange mb-1">10M+</div>
                <div className="text-muted-foreground text-sm font-medium">Operations</div>
              </div>
            </motion.div>
          </div>
          
          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Professional dashboard mockup */}
              <div className="w-full max-w-md mx-auto surface-elevated rounded-lg p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-sm" />
                    </div>
                    <div className="text-white font-semibold">NexAgent</div>
                  </div>
                  <div className="w-2 h-2 bg-orange rounded-full animate-pulse" />
                </div>
                
                {/* Content blocks */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange/60 rounded-full" />
                      <div className="h-2 bg-white/20 rounded flex-1" />
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <div className="w-2 h-2 bg-white/40 rounded-full" />
                      <div className="h-2 bg-white/10 rounded w-3/4" />
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <div className="w-2 h-2 bg-white/40 rounded-full" />
                      <div className="h-2 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-1 bg-orange/40 rounded w-full" />
                    <div className="h-1 bg-white/20 rounded w-4/5" />
                    <div className="h-1 bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-6 h-6 border-2 border-orange/30 rounded" 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -bottom-6 -left-6 w-4 h-4 bg-orange/20 rounded-full"
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
