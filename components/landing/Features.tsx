"use client";

import { motion } from "framer-motion";
import { 
  Workflow, 
  Shield, 
  Zap, 
  Database, 
  Code2, 
  Users, 
  BarChart3, 
  Clock, 
  Lock,
  Globe,
  Settings,
  CheckCircle
} from "lucide-react";

const features = [
  {
    icon: <Workflow size={24} className="text-[#FF6900]" />,
    title: "Visual Workflow Builder",
    desc: "Drag-and-drop interface to build complex automation workflows without writing a single line of code.",
    benefits: ["No coding required", "Visual flow designer", "Real-time preview"]
  },
  {
    icon: <Database size={24} className="text-[#FF6900]" />,
    title: "Enterprise Integrations",
    desc: "Connect with 500+ enterprise applications including Salesforce, SAP, ServiceNow, and more.",
    benefits: ["500+ integrations", "Pre-built connectors", "Custom API support"]
  },
  {
    icon: <Shield size={24} className="text-[#FF6900]" />,
    title: "Enterprise Security",
    desc: "SOC 2 Type II certified with end-to-end encryption, role-based access control, and audit logs.",
    benefits: ["SOC 2 certified", "End-to-end encryption", "Compliance ready"]
  },
  {
    icon: <BarChart3 size={24} className="text-[#FF6900]" />,
    title: "Real-time Analytics",
    desc: "Monitor workflow performance with detailed analytics, error tracking, and business insights.",
    benefits: ["Performance metrics", "Error tracking", "Business insights"]
  },
  {
    icon: <Users size={24} className="text-[#FF6900]" />,
    title: "Team Collaboration",
    desc: "Share workflows across teams with role-based permissions and collaborative editing features.",
    benefits: ["Role-based access", "Team sharing", "Version control"]
  },
  {
    icon: <Zap size={24} className="text-[#FF6900]" />,
    title: "High Performance",
    desc: "Process millions of transactions with 99.99% uptime and sub-100ms response times at scale.",
    benefits: ["99.99% uptime", "Sub-100ms response", "Auto-scaling"]
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="relative bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl hover:border-zinc-700 transition-all duration-200 h-full">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-lg mb-4 group-hover:bg-zinc-700 transition-colors">
          {feature.icon}
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-3">
          {feature.title}
        </h3>
        
        <p className="text-zinc-400 mb-4 leading-relaxed">
          {feature.desc}
        </p>
        
        {/* Benefits */}
        <div className="space-y-2">
          {feature.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              <span className="text-zinc-300">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section id="features" className="relative py-24 bg-zinc-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full mb-6">
            <div className="w-2 h-2 bg-[#FF6900] rounded-full" />
            <span className="text-sm text-zinc-300 font-medium">Platform Capabilities</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Enterprise-Grade Automation
          </h2>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Built for scale with enterprise security, reliability, and performance that growing businesses demand.
          </p>
        </motion.div>
        
        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
