"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const navItems = [
  { name: "Home", id: "hero" },
  { name: "Features", id: "features" },
  { name: "Workflow", id: "workflow" },
  { name: "Pricing", id: "pricing" },
  { name: "Docs", id: "docs" },
];

export default function Navbar() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [activeSection, setActiveSection] = useState("hero");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
        let maxIntersectionRatio = 0;
        let activeId = "";
        
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio;
            activeId = entry.target.id;
          }
        });
        
        if (activeId) {
          setActiveSection(activeId);
        }
      },
      { 
        threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], 
        rootMargin: "-100px 0px -100px 0px" 
      }
    );

    const observeElements = () => {
      navItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) {
          observer.observe(el);
        }
      });
    };

    // Add a small delay to ensure all elements are mounted
    const timeout = setTimeout(observeElements, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    } else {
      router.push('/sign-in');
    }
    setIsMobileMenuOpen(false);
  };

  const handleWorkflowsClick = () => {
    if (isSignedIn) {
      router.push('/workflows');
    } else {
      router.push('/sign-in');
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "glass-card border-b border-white/10" : "bg-transparent"
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF6900] to-[#FF8555] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Nex<span className="text-[#FF6900]">Agent</span>
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <ul className="flex space-x-6">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`relative px-3 py-2 text-sm font-medium transition-all duration-300 ${
                        activeSection === item.id
                          ? "text-[#FF6900]"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      {item.name}
                      {activeSection === item.id && (
                        <motion.div
                          className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FF6900] rounded-full"
                          layoutId="activeTab"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={handleWorkflowsClick}
                    className="relative px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-all duration-300"
                  >
                    Workflows
                  </button>
                </li>
              </ul>

              <Button
                onClick={handleGetStarted}
                size="sm"
                className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-6 rounded-xl hover-lift transition-all duration-300 group"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-[#FF6900] transition-colors duration-300"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <motion.div
        className={`md:hidden fixed inset-x-0 top-16 z-40 glass-card border-b border-white/10 ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: isMobileMenuOpen ? 1 : 0,
          y: isMobileMenuOpen ? 0 : -20,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 py-6 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left px-3 py-2 text-base font-medium transition-all duration-300 ${
                activeSection === item.id
                  ? "text-[#FF6900] bg-[#FF6900]/10 rounded-lg"
                  : "text-white/80 hover:text-white hover:bg-white/5 rounded-lg"
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            onClick={handleWorkflowsClick}
            className="block w-full text-left px-3 py-2 text-base font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-300"
          >
            Workflows
          </button>
          <div className="pt-4">
            <Button
              onClick={handleGetStarted}
              size="sm"
              className="w-full bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold rounded-xl"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
