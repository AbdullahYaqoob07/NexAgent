"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Workflow, Shield, Rocket, Database, Code, Bot, Sparkles } from "lucide-react";

const features = [
  {
    icon: <Brain size={40} className="text-[#FF6900]" />,
    title: "Neural Processing",
    desc: "Advanced AI models with quantum-enhanced learning algorithms for unprecedented accuracy and speed.",
    gradient: "from-[#FF6900]/10 to-transparent",
  },
  {
    icon: <Rocket size={40} className="text-[#FF6900]" />,
    title: "Hyper-Speed Deployment",
    desc: "Deploy intelligent agents across multiple dimensions in milliseconds using our quantum infrastructure.",
    gradient: "from-[#FF8555]/10 to-transparent",
  },
  {
    icon: <Shield size={40} className="text-[#FF6900]" />,
    title: "Quantum Security",
    desc: "Military-grade encryption with quantum-resistant protocols protecting your data across all realities.",
    gradient: "from-[#FF6900]/15 to-transparent",
  },
  {
    icon: <Database size={40} className="text-[#FF6900]" />,
    title: "Infinite Scale",
    desc: "Seamlessly handle unlimited data streams with our distributed neural network architecture.",
    gradient: "from-[#FF8555]/10 to-transparent",
  },
  {
    icon: <Code size={40} className="text-[#FF6900]" />,
    title: "Zero-Code Interface",
    desc: "Create complex AI workflows using intuitive visual programming - no coding expertise required.",
    gradient: "from-[#FF6900]/10 to-transparent",
  },
  {
    icon: <Bot size={40} className="text-[#FF6900]" />,
    title: "Sentient Agents",
    desc: "Deploy self-learning autonomous agents that evolve and adapt to changing requirements.",
    gradient: "from-[#FF8555]/15 to-transparent",
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
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#FF6900]/20 transition-all duration-300">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {feature.icon}
          </motion.div>
        </div>
        
        <div className="relative z-10 pt-6">
          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-[#FF6900] transition-colors duration-300">
            {feature.title}
          </h3>
          <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
            {feature.desc}
          </p>
        </div>
        
        {/* Corner accent */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-[#FF6900] rounded-full opacity-50 group-hover:opacity-100 animate-pulse" />
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#FF6900]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#FF8555]/5 rounded-full blur-3xl" />
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
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Next-Generation
            <span className="block text-[#FF6900]">
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
            <button className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-[#FF6900]/30 hover:shadow-[#FF6900]/40 hover-lift">
              Start Your Journey
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
