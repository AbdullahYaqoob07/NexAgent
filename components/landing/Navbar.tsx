"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useBackendAuth } from "@/lib/contexts/BackendAuthContext";
import Image from "next/image";

const navItems = [
  { name: "Home", id: "hero" },
  { name: "Product", id: "features" },
  { name: "Solution", id: "workflow" },
  { name: "Marketplace", id: "marketplace" },
  { name: "Pricing", id: "pricing" },
  { name: "Contact", id: "contact" },
];

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();
  const { user: backendUser, isAuthenticated: backendAuthenticated } = useBackendAuth();
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
        threshold: [0, 0.1, 0.25], 
        rootMargin: "-15% 0px -35% 0px" 
      }
    );

    const observeElements = () => {
      navItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) {
          observer.observe(el);
        }
      });

      // Edge case: when scrolled to bottom, ensure Contact is active
      const onScrollEnd = () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) {
          setActiveSection('contact');
        }
      };
      window.addEventListener('scroll', onScrollEnd);
    };

    // Add a small delay to ensure all elements are mounted
    const timeout = setTimeout(observeElements, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id); // immediately reflect active tab
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const isLoggedIn = !!user || !!backendUser || backendAuthenticated;

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/sign-up');
    }
    setIsMobileMenuOpen(false);
  };

  const handleWorkflowsClick = () => {
    if (isLoggedIn) {
      router.push('/workflows');
    } else {
      router.push('/sign-up');
    }
    setIsMobileMenuOpen(false);
  };


  return (
    <>
      <motion.nav className="fixed inset-x-0 top-0 z-50">
        <motion.div
          className={[
            "backdrop-blur-xl transition-all duration-500",
            "bg-[rgba(217,217,217,0.1)]",
            isScrolled
              ? "mx-0 rounded-none shadow-lg w-full"
              : "mx-4 sm:mx-6 xl:mx-auto xl:max-w-[1120px] mt-[30px] rounded-[5px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-gradient",
          ].join(" ")
        }
          animate={{
            y: 0,
            borderRadius: isScrolled ? 0 : 5,
            marginTop: isScrolled ? 0 : 30,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          initial={{ y: -80, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
        >
          <div className={`${isScrolled ? 'px-4 sm:px-6 xl:px-[160px] max-w-none mx-auto' : 'px-4 sm:px-6 lg:px-8'}`}>
            <div className={`flex justify-between items-center h-[70px] transition-all duration-300`}>
              {/* Logo */}
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image
                  src="/assets/logo/Logo.svg"
                  alt="NEXAGENT Logo"
                  width={120}
                  height={40}
                  className="h-7 w-auto"
                  priority
                />
              </motion.div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center">
                <ul className="flex space-x-8 mr-6">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={`relative px-1 py-2 text-sm font-medium transition-all duration-300 font-montserrat ${
                          activeSection === item.id
                            ? "text-white"
                            : "text-white/70 hover:text-white/90"
                        }`}
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
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
                </ul>

                <div className="mr-[14px] my-4 border-gradient rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#153E48]/20 hover:scale-105">
                  <Button
                    onClick={handleGetStarted}
                    variant="ghost"
                    className="h-[40px] w-[94px] bg-transparent hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10 text-white font-medium rounded-lg transition-all duration-300 group flex items-center justify-center gap-1.5 text-sm border-0"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    <Image
                      src="/assets/navbar/person-icon.svg"
                      alt="User Icon"
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="transition-all duration-300 group-hover:text-white/95">Sign up</span>
                  </Button>
                </div>
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
        </motion.div>
      </motion.nav>

      {/* Mobile Menu */}
      <motion.div
        className={`md:hidden fixed inset-x-4 z-40 backdrop-blur-xl bg-[rgba(217,217,217,0.1)] border border-white/10 rounded-[5px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
        style={{ 
          top: isScrolled ? '70px' : '100px' 
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: isMobileMenuOpen ? 1 : 0,
          y: isMobileMenuOpen ? 0 : -20,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-6 py-6 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left px-3 py-3 text-base font-medium transition-all duration-300 ${
                activeSection === item.id
                  ? "text-white bg-[#FF6900]/20 rounded-lg border-l-2 border-[#FF6900]"
                  : "text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            onClick={handleWorkflowsClick}
            className="block w-full text-left px-3 py-3 text-base font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-300"
          >
            Workflows
          </button>
          
          <div className="pt-4 border-t border-white/10">
            <Button
              onClick={handleGetStarted}
              size="sm"
              className="w-full bg-[#FF6900] hover:bg-[#E55D00] text-white font-bold rounded-xl py-3 transition-all duration-300"
            >
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}