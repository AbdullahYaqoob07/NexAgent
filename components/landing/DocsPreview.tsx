"use client";

import { motion } from "framer-motion";
import { FileText, Code, BookOpen, Terminal, Layers, GitBranch, Eye, Download, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const documents = [
  {
    id: 1,
    type: "Guide",
    icon: <BookOpen size={40} className="text-[#FF6900]" />,
    title: "Getting Started with NexAgent",
    description: "Learn the fundamentals of building intelligent agents with our comprehensive quickstart guide",
    tags: ["Beginner", "Tutorial"],
    readTime: "5 min read",
    nodeConnections: 3,
    gradient: "from-[#FF6900]/10 to-transparent"
  },
  {
    id: 2,
    type: "API Reference",
    icon: <Code className="w-5 h-5" />,
    title: "Neural Network API v3.0",
    description: "Complete API documentation for integrating quantum neural processing into your applications",
    tags: ["API", "Advanced"],
    readTime: "12 min read",
    nodeConnections: 5,
    gradient: "from-[#FF8555]/10 to-transparent"
  },
  {
    id: 3,
    type: "Workflow",
    icon: <GitBranch className="w-5 h-5" />,
    title: "Advanced Automation Flows",
    description: "Master complex workflow patterns with node-based visual programming and AI orchestration",
    tags: ["Workflows", "Automation"],
    readTime: "8 min read",
    nodeConnections: 7,
    gradient: "from-[#FF6900]/15 to-transparent"
  },
  {
    id: 4,
    type: "Integration",
    icon: <Layers className="w-5 h-5" />,
    title: "Enterprise Integration Patterns",
    description: "Best practices for deploying NexAgent in large-scale distributed environments",
    tags: ["Enterprise", "Architecture"],
    readTime: "10 min read",
    nodeConnections: 4,
    gradient: "from-[#FF8555]/15 to-transparent"
  },
  {
    id: 5,
    type: "CLI Reference",
    icon: <Terminal className="w-5 h-5" />,
    title: "Command Line Interface",
    description: "Powerful CLI tools for managing agents, deployments, and monitoring from your terminal",
    tags: ["CLI", "DevOps"],
    readTime: "6 min read",
    nodeConnections: 2,
    gradient: "from-[#FF6900]/10 to-transparent"
  },
  {
    id: 6,
    type: "Tutorial",
    icon: <FileText className="w-5 h-5" />,
    title: "Building Your First AI Agent",
    description: "Step-by-step tutorial on creating, training, and deploying your first intelligent agent",
    tags: ["Tutorial", "Hands-on"],
    readTime: "15 min read",
    nodeConnections: 6,
    gradient: "from-[#FF8555]/10 to-transparent"
  }
];

const DocumentCard = ({ doc, index }: { doc: typeof documents[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative"
    >
      <div className="relative glass-card p-6 rounded-2xl h-full hover:shadow-xl hover:shadow-[#FF6900]/20 hover-lift cursor-pointer transition-all duration-300">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${doc.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Floating icon background - similar to Features */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#FF6900]/20 transition-all duration-300">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-[#FF6900]"
          >
            {doc.icon}
          </motion.div>
        </div>
        
        {/* Node connections visualization */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-[#FF6900] rounded-full opacity-50 group-hover:opacity-100 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="text-center w-full">
              <span className="text-xs text-[#FF6900] font-medium">{doc.type}</span>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#FF6900] transition-colors duration-300">
                {doc.title}
              </h3>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-white/70 text-sm mb-4 line-clamp-2 group-hover:text-white/90 transition-colors duration-300">
            {doc.description}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {doc.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/70">
                {tag}
              </span>
            ))}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">{doc.readTime}</span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-300">
                <Eye className="w-4 h-4 text-white/70" />
              </button>
              <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-300">
                <Download className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Hover effect line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6900] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </motion.div>
  );
};

const DocsPreview = () => {
  return (
    <section id="docs" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#FF6900]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-[#FF8555]/5 rounded-full blur-3xl" />
        
        {/* Workflowy grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="1" fill="#FF6900" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Explore Our
            <span className="block text-[#FF6900]">
              Documentation
            </span>
          </h2>
          
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Comprehensive guides, API references, and tutorials to accelerate your development
          </p>
        </motion.div>
        
        {/* Document grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {documents.map((doc, index) => (
            <DocumentCard key={doc.id} doc={doc} index={index} />
          ))}
        </div>
        
        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="glass-card p-8 rounded-2xl inline-block">
            <h3 className="text-2xl font-bold text-white mb-4">
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Access our complete documentation portal with advanced search, interactive examples, and community resources
            </p>
            <Button 
              className="bg-[#FF6900] hover:bg-[#FF8555] text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-[#FF6900]/20 hover:shadow-[#FF8555]/30"
            >
              View Full Documentation
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DocsPreview;