"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Zap } from "lucide-react";

const navItems = [
  { name: "Home", id: "hero" },
  { name: "Features", id: "features" },
  { name: "Workflow", id: "workflow" },
  { name: "Testimonials", id: "testimonials" },
];

export default function Navbar() {
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
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.6 }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => {
      navItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
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
              <div className="w-8 h-8 bg-gradient-to-br from-[#ff6b35] to-[#ff8555] rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold text-white">
                Nex<span className="text-[#ff6b35]">Agent</span>
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
                          ? "text-[#ff6b35]"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      {item.name}
                      {activeSection === item.id && (
                        <motion.div
                          className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ff6b35] rounded-full"
                          layoutId="activeTab"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                className="bg-[#ff6b35] hover:bg-[#ff5722] text-black font-semibold px-6 rounded-xl hover-lift transition-all duration-300 group"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-[#ff6b35] transition-colors duration-300"
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
                  ? "text-[#ff6b35] bg-[#ff6b35]/10 rounded-lg"
                  : "text-white/80 hover:text-white hover:bg-white/5 rounded-lg"
              }`}
            >
              {item.name}
            </button>
          ))}
          <div className="pt-4">
            <Button
              size="sm"
              className="w-full bg-[#ff6b35] hover:bg-[#ff5722] text-black font-semibold rounded-xl"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
