"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Hero() {
  const { user } = useAuth();
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/sign-in');
    }
  };

  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center">
      {/* Hero Background */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/assets/hero/Hero-BG.svg"
          alt="Hero Background"
          fill
          className="object-cover w-full h-full"
          priority
          quality={100}
        />
      </div>
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/25" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full pt-30">
        {/* Happy clients pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="inline-flex items-center gap-3 rounded-full px-6 py-2 border border-white/20 backdrop-blur-sm shadow-sm mb-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(to right, rgba(255, 105, 0, 0.13), rgba(255, 105, 0, 0.04))`
          }}
        >
          {/* Client image */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/hero/Client-Pill.svg"
              alt="Happy Clients"
              width={50}
              height={24}
              className="h-10 w-auto"
            />
          </div>
          {/* Stars above text */}
          <div className="flex flex-col items-start leading-none">
            <div className="flex items-center gap-0.5 mb-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-[#FF6900] text-[#FF6900]" />
              ))}
            </div>
            <span className="text-xs text-white/90 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>15+ happy clients</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium mb-6 leading-[1.1] tracking-tight"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <span className="text-white ">Automate </span>
          <span className="text-[#FF6900]">Intelligence</span>
          <span className="text-white">.</span>
          <br />
          <span className="text-white">Accelerate Growth.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="text-base sm:text-lg lg:text-xl text-white/80 mb-10 max-w-3xl mx-auto leading-relaxed font-normal"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Our AI-powered SaaS platform empowers businesses to streamline operations, automate repetitive tasks, and make smarter, data-driven decisions—all from one intuitive dashboard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20"
        >
          <button 
            onClick={handleGetStarted}
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-medium px-10 py-3 rounded-xl neon-glow hover-lift transition-all duration-300 flex items-center gap-3 text-lg"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            className="glass border-2 border-white/20 hover:border-[#FF6900]/50 text-white font-medium px-10 py-3 rounded-xl hover-lift transition-all duration-300 flex items-center gap-3 text-lg"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <Zap className="w-5 h-5" />
            Learn More
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="w-full max-w-4xl mx-auto mt-12"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-[#FF6900] text-sm font-medium mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Clients</div>
              <div className="text-4xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>120+</div>
            </div>
            <div className="text-center">
              <div className="text-[#FF6900] text-sm font-medium mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Projects</div>
              <div className="text-4xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>15+</div>
            </div>
            <div className="text-center">
              <div className="text-[#FF6900] text-sm font-medium mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>5-Star Reviews</div>
              <div className="text-4xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>32+</div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
