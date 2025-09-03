"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Workflow, Shield, Rocket, Database, Code, Bot, Sparkles } from "lucide-react";

const features = [
  {
    icon: <Brain size={40} className="text-cyan-400" />,
    title: "Neural Processing",
    desc: "Advanced AI models with quantum-enhanced learning algorithms for unprecedented accuracy and speed.",
    gradient: "from-cyan-500/10 to-transparent",
  },
  {
    icon: <Rocket size={40} className="text-cyan-400" />,
    title: "Hyper-Speed Deployment",
    desc: "Deploy intelligent agents across multiple dimensions in milliseconds using our quantum infrastructure.",
    gradient: "from-blue-500/10 to-transparent",
  },
  {
    icon: <Shield size={40} className="text-cyan-400" />,
    title: "Quantum Security",
    desc: "Military-grade encryption with quantum-resistant protocols protecting your data across all realities.",
    gradient: "from-cyan-500/15 to-transparent",
  },
  {
    icon: <Database size={40} className="text-cyan-400" />,
    title: "Infinite Scale",
    desc: "Seamlessly handle unlimited data streams with our distributed neural network architecture.",
    gradient: "from-blue-500/10 to-transparent",
  },
  {
    icon: <Code size={40} className="text-cyan-400" />,
    title: "Zero-Code Interface",
    desc: "Create complex AI workflows using intuitive visual programming - no coding expertise required.",
    gradient: "from-cyan-500/10 to-transparent",
  },
  {
    icon: <Bot size={40} className="text-cyan-400" />,
    title: "Sentient Agents",
    desc: "Deploy self-learning autonomous agents that evolve and adapt to changing requirements.",
    gradient: "from-blue-500/15 to-transparent",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="relative glass-card p-8 rounded-2xl hover-lift cursor-pointer h-full">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Floating icon background */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-cyan-400/20 transition-all duration-300">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {feature.icon}
          </motion.div>
        </div>
        
        <div className="relative z-10 pt-6">
          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors duration-300">
            {feature.title}
          </h3>
          <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
            {feature.desc}
          </p>
        </div>
        
        {/* Corner accent */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full opacity-50 group-hover:opacity-100 animate-pulse" />
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">Advanced Capabilities</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Next-Generation
            <span className="block text-cyan-400">
              AI Features
            </span>
          </h2>
          
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Experience the cutting-edge capabilities that will define the future of artificial intelligence and automation.
          </p>
        </motion.div>
        
        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="glass-card p-8 rounded-2xl inline-block">
            <p className="text-white/80 mb-4">Ready to experience the future?</p>
            <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30">
              Start Your Journey
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
