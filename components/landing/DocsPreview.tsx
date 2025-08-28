"use client";

import { motion } from "framer-motion";
import { FileText, Code, BookOpen, Terminal, Layers, GitBranch, Eye, Download, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const documents = [
  {
    id: 1,
    type: "Guide",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Getting Started with NexAgent",
    description: "Learn the fundamentals of building intelligent agents with our comprehensive quickstart guide",
    tags: ["Beginner", "Tutorial"],
    readTime: "5 min read",
    nodeConnections: 3,
    color: "from-cyan-500/20 to-blue-500/20"
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
    color: "from-blue-500/20 to-purple-500/20"
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
    color: "from-purple-500/20 to-pink-500/20"
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
    color: "from-pink-500/20 to-cyan-500/20"
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
    color: "from-green-500/20 to-cyan-500/20"
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
    color: "from-yellow-500/20 to-orange-500/20"
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
      <div className="relative glass-card p-6 rounded-2xl h-full hover:shadow-xl hover:shadow-cyan-400/10 transition-all duration-300 overflow-hidden">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${doc.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Node connections visualization */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 text-cyan-400/50">
            {[...Array(doc.nodeConnections)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-cyan-400/50 rounded-full" />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                {doc.icon}
              </div>
              <div>
                <span className="text-xs text-cyan-400 font-medium">{doc.type}</span>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                  {doc.title}
                </h3>
              </div>
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
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </motion.div>
  );
};

const DocsPreview = () => {
  return (
    <section id="docs" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        
        {/* Workflowy grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="1" fill="#64b5f6" />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">Knowledge Base</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Explore Our
            <span className="block text-cyan-400">
              Documentation
            </span>
          </h2>
          
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Comprehensive guides, API references, and tutorials to accelerate your development
          </p>
        </motion.div>
        
        {/* Document grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
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
              Can't find what you're looking for?
            </h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Access our complete documentation portal with advanced search, interactive examples, and community resources
            </p>
            <Button 
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
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
