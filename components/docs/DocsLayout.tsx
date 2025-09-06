"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X, Zap, Search, BookOpen, Code, FileText, Workflow, Terminal, Layers, GitBranch, ChevronRight, ExternalLink, Github } from "lucide-react";
import Link from "next/link";

interface DocsLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  {
    title: "Getting Started",
    items: [
      { name: "Introduction", href: "/docs/getting-started", icon: BookOpen },
      { name: "Quick Start", href: "/docs/getting-started#quick-start", icon: Zap },
      { name: "Installation", href: "/docs/getting-started#installation", icon: Terminal },
    ]
  },
  {
    title: "Core Concepts",
    items: [
      { name: "JSON Node Engine", href: "/docs/json-node-engine", icon: Workflow },
      { name: "Node Types", href: "/docs/json-node-engine#node-types", icon: GitBranch },
      { name: "Workflows", href: "/docs/json-node-engine#workflows", icon: Layers },
    ]
  },
  {
    title: "API Reference",
    items: [
      { name: "Workflow Engine", href: "/docs/api/workflow-engine", icon: Code },
      { name: "Node Templates", href: "/docs/api/node-templates", icon: FileText },
      { name: "JSON Utils", href: "/docs/api/json-utils", icon: Code },
    ]
  },
  {
    title: "Examples",
    items: [
      { name: "Customer Onboarding", href: "/docs/examples/customer-onboarding", icon: FileText },
      { name: "Data Processing", href: "/docs/examples/data-processing", icon: FileText },
      { name: "AI Integration", href: "/docs/examples/ai-integration", icon: FileText },
    ]
  }
];

const DocsNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
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
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/docs/getting-started" className="text-white/80 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/docs/api" className="text-white/80 hover:text-white transition-colors">
              API Reference
            </Link>
            <Link href="/docs/examples" className="text-white/80 hover:text-white transition-colors">
              Examples
            </Link>
            <Link href="/workflows" className="text-white/80 hover:text-white transition-colors">
              Workflows
            </Link>
            <Button
              size="sm"
              className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-4 rounded-lg"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

const DocsSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <motion.aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-black/95 backdrop-blur-xl border-r border-white/10 z-50 overflow-y-auto lg:sticky lg:block ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-300`}
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="p-6">
          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-8">
            {sidebarItems.map((section, sectionIndex) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                      >
                        <item.icon className="w-4 h-4 text-[#FF6900] flex-shrink-0" />
                        <span className="text-sm">{item.name}</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Quick Links */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <div className="space-y-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group"
              >
                <Github className="w-4 h-4 text-[#FF6900]" />
                <span className="text-sm">GitHub Repository</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <Link
                href="/workflows"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group"
              >
                <Workflow className="w-4 h-4 text-[#FF6900]" />
                <span className="text-sm">Workflow Builder</span>
                <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

const DocsLayout: React.FC<DocsLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      <DocsNavbar />
      
      <div className="flex">
        <DocsSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <main className="flex-1 lg:ml-80">
          {/* Mobile sidebar toggle */}
          <div className="lg:hidden">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="ghost"
              size="sm"
              className="fixed bottom-6 left-6 z-40 bg-[#FF6900] hover:bg-[#E55D00] text-white shadow-lg"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsLayout;
