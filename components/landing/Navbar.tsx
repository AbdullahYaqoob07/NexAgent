"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

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
      setIsScrolled(window.scrollY > 40);
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
          isScrolled 
            ? "bg-black/80 backdrop-blur-md border-b border-border" 
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="content-max container-padding">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="w-8 h-8 bg-orange rounded-md flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-sm" />
              </div>
              <span className="text-2xl font-bold text-white">
                Nex<span className="text-orange">Agent</span>
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-12">
              <ul className="flex items-center gap-8">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`relative px-4 py-2 text-sm font-medium transition-standard group ${
                        activeSection === item.id
                          ? "text-orange"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {item.name}
                      <div className={`absolute bottom-0 left-0 h-0.5 bg-orange rounded-full transition-all duration-300 ${
                        activeSection === item.id ? "w-full" : "w-0 group-hover:w-full"
                      }`} />
                    </button>
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                className="bg-orange hover:bg-orange-dark text-white font-medium px-6 py-2 rounded-md transition-standard focus-ring"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white transition-standard"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <motion.div
        className={`md:hidden fixed inset-x-0 top-20 z-40 bg-black/95 backdrop-blur-md border-b border-border ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: isMobileMenuOpen ? 1 : 0,
          y: isMobileMenuOpen ? 0 : -20,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="container-padding py-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left px-4 py-3 text-base font-medium rounded-md transition-standard ${
                activeSection === item.id
                  ? "text-orange bg-orange/10"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.name}
            </button>
          ))}
          <div className="pt-4">
            <Button
              size="sm"
              className="w-full bg-orange hover:bg-orange-dark text-white font-medium py-3 rounded-md"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
