"use client";

import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Eye, 
  Clock, 
  Zap,
  Brain,
  Image,
  MessageSquare,
  Code,
  BarChart3,
  Globe
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";

const categories = [
  { name: "All", icon: Globe, count: 156 },
  { name: "AI Models", icon: Brain, count: 42 },
  { name: "Image Gen", icon: Image, count: 28 },
  { name: "Chat Bots", icon: MessageSquare, count: 35 },
  { name: "Code Gen", icon: Code, count: 24 },
  { name: "Analytics", icon: BarChart3, count: 27 }
];

const marketplaceItems = [
  {
    id: 1,
    name: "GPT-4 Vision Pro",
    description: "Advanced multimodal AI model for text and image understanding",
    category: "AI Models",
    rating: 4.9,
    downloads: 12500,
    price: "Free",
    image: "/api/placeholder/300/200",
    tags: ["Vision", "Text", "API"],
    featured: true
  },
  {
    id: 2,
    name: "DALL-E 3",
    description: "State-of-the-art image generation from text descriptions",
    category: "Image Gen",
    rating: 4.8,
    downloads: 9800,
    price: "$0.04/image",
    image: "/api/placeholder/300/200",
    tags: ["Images", "Creative", "API"]
  },
  {
    id: 3,
    name: "Code Assistant Pro",
    description: "AI-powered code generation and debugging assistant",
    category: "Code Gen",
    rating: 4.7,
    downloads: 7200,
    price: "$29/mo",
    image: "/api/placeholder/300/200",
    tags: ["Coding", "Debug", "API"]
  },
  {
    id: 4,
    name: "Customer Support Bot",
    description: "Intelligent chatbot for automated customer support",
    category: "Chat Bots",
    rating: 4.6,
    downloads: 5400,
    price: "$19/mo",
    image: "/api/placeholder/300/200",
    tags: ["Support", "Chat", "Automation"]
  },
  {
    id: 5,
    name: "Data Insights Engine",
    description: "Advanced analytics and data visualization AI tool",
    category: "Analytics",
    rating: 4.8,
    downloads: 6100,
    price: "$49/mo",
    image: "/api/placeholder/300/200",
    tags: ["Analytics", "Insights", "Visualization"]
  },
  {
    id: 6,
    name: "Content Creator AI",
    description: "Generate high-quality content for blogs and social media",
    category: "AI Models",
    rating: 4.5,
    downloads: 8900,
    price: "$15/mo",
    image: "/api/placeholder/300/200",
    tags: ["Content", "Writing", "Social"]
  }
];

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = marketplaceItems.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-white">
            AI <span className="text-[#FF6900]">Marketplace</span>
          </h1>
          <p className="text-white/70 text-lg">
            Discover and integrate powerful AI models and tools into your workflows
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4"
        >
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="text"
              placeholder="Search AI models, tools, and integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-[#FF6900] transition-colors duration-300"
            />
          </div>
          
          {/* Filter Button */}
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-white hover:bg-white/10 transition-colors duration-300">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex overflow-x-auto gap-4 pb-2"
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.name;
            
            return (
              <motion.button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-[#FF6900]/20 to-[#FF8555]/20 border border-[#FF6900]/30 text-[#FF6900]"
                    : "bg-white/5 border border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{category.name}</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {category.count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Marketplace Items */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group"
            >
              {/* Image Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-[#FF6900]/20 to-[#FF8555]/20 flex items-center justify-center">
                <Zap className="w-12 h-12 text-[#FF6900]/50" />
                {item.featured && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-[#FF6900] to-[#FF8555] text-white text-xs font-bold px-2 py-1 rounded-full">
                    Featured
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-3 py-1 rounded-full">
                  {item.price}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#FF6900] font-medium bg-[#FF6900]/20 px-2 py-1 rounded-full">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-white text-sm">{item.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{item.name}</h3>
                <p className="text-white/70 text-sm mb-4 line-clamp-2">{item.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-white/50 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>{item.downloads.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                    Install
                  </button>
                  <button className="px-4 py-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-lg transition-all duration-300">
                    Preview
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Load More */}
        {filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex justify-center"
          >
            <button className="px-8 py-3 bg-white/5 border border-white/20 text-white hover:bg-white/10 rounded-xl transition-all duration-300">
              Load More Items
            </button>
          </motion.div>
        )}

        {/* No Results */}
        {filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center py-16"
          >
            <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
            <p className="text-white/70">Try adjusting your search or category filters</p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
