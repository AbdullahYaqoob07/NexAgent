"use client";

import { motion } from "framer-motion";
import { Settings, Database, Zap, ArrowRight, Cpu, Network, CloudLightning } from "lucide-react";

const workflowSteps = [
  {
    id: 1,
    title: "Neural Design",
    description: "Create intelligent workflows using our quantum-powered visual interface",
    icon: <Settings className="w-8 h-8" />,
    color: "#FF6900",
  },
  {
    id: 2,
    title: "Data Fusion",
    description: "Connect unlimited data sources with zero-latency quantum tunneling",
    icon: <Database className="w-8 h-8" />,
    color: "#FF6900",
  },
  {
    id: 3,
    title: "AI Processing",
    description: "Deploy self-evolving agents across our distributed neural network",
    icon: <Cpu className="w-8 h-8" />,
    color: "#FF6900",
  },
  {
    id: 4,
    title: "Hyper Deployment",
    description: "Scale infinitely with autonomous optimization and real-time adaptation",
    icon: <CloudLightning className="w-8 h-8" />,
    color: "#FF6900",
  },
];

const AnimatedFlowDiagram = () => {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <svg
        viewBox="0 0 800 400"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="workflow-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(255, 105, 0, 0.1)"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6900" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6900" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#workflow-grid)" />
        
        {/* Main flow line */}
        <motion.path
          d="M 50 200 Q 200 100 400 200 T 750 200"
          stroke="url(#flowGradient)"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Data nodes */}
        {[150, 300, 450, 600].map((x, index) => (
          <motion.g key={index}>
            {/* Node circle */}
            <motion.circle
              cx={x}
              cy={200}
              r="8"
              fill="#FF6900"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.3, duration: 0.5 }}
            />
            
            {/* Pulsing effect */}
            <motion.circle
              cx={x}
              cy={200}
              r="8"
              fill="none"
              stroke="#FF6900"
              strokeWidth="2"
              opacity="0.6"
              animate={{
                r: [8, 20, 8],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.5,
              }}
            />
            
            {/* Branch lines */}
            <motion.line
              x1={x}
              y1={200}
              x2={x}
              y2={150}
              stroke="#FF6900"
              strokeWidth="1"
              opacity="0.5"
              initial={{ opacity: 0, y2: 200 }}
              animate={{ opacity: 0.5, y2: 150 }}
              transition={{ delay: index * 0.3 + 0.5, duration: 0.5 }}
            />
            <motion.line
              x1={x}
              y1={200}
              x2={x}
              y2={250}
              stroke="#FF6900"
              strokeWidth="1"
              opacity="0.5"
              initial={{ opacity: 0, y2: 200 }}
              animate={{ opacity: 0.5, y2: 250 }}
              transition={{ delay: index * 0.3 + 0.5, duration: 0.5 }}
            />
          </motion.g>
        ))}
        
        {/* Data packets */}
        <motion.circle
          cx="0"
          cy="200"
          r="3"
          fill="#FF8555"
          animate={{
            cx: [50, 750],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        
        {/* Additional particles */}
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.circle
            key={index}
            r="1"
            fill="rgba(255, 105, 0, 0.6)"
            animate={{
              cx: [Math.random() * 100, 700 + Math.random() * 100],
              cy: [180 + Math.random() * 40, 180 + Math.random() * 40],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: index * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
};

const WorkflowStep = ({ step, index }: { step: typeof workflowSteps[0]; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      viewport={{ once: true }}
      className="relative group"
    >
      <div className="flex items-start gap-6">
        {/* Step number and icon */}
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 glass-card rounded-2xl flex items-center justify-center group-hover:neon-glow transition-all duration-300">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="text-[#FF6900]"
            >
              {step.icon}
            </motion.div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF6900] rounded-full flex items-center justify-center text-white text-xs font-bold">
              {step.id}
            </div>
          </div>
          
          {/* Connector line */}
          {index < workflowSteps.length - 1 && (
            <motion.div
              className="w-0.5 h-24 bg-gradient-to-b from-[#FF6900]/50 to-transparent mt-4"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
              viewport={{ once: true }}
            />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 pb-12">
          <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#FF6900] transition-colors duration-300">
            {step.title}
          </h3>
          <p className="text-white/70 text-lg leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const Workflow = () => {
  return (
    <section id="workflow" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#FF6900]/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#FF6900]/30 to-transparent" />
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
            How It
            <span className="block bg-gradient-to-r from-[#FF6900] to-[#FF8555] bg-clip-text text-transparent">
              Actually Works
            </span>
          </h2>
          
          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-16">
            Experience the seamless fusion of artificial intelligence and quantum computing in action.
          </p>
        </motion.div>
        
        {/* Animated flow diagram */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <AnimatedFlowDiagram />
        </motion.div>
        
        {/* Workflow steps */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            {workflowSteps.slice(0, 2).map((step, index) => (
              <WorkflowStep key={step.id} step={step} index={index} />
            ))}
          </div>
          <div className="space-y-8">
            {workflowSteps.slice(2).map((step, index) => (
              <WorkflowStep key={step.id} step={step} index={index + 2} />
            ))}
          </div>
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="glass-card p-8 rounded-2xl inline-block">
            <p className="text-white/80 mb-6">Ready to revolutionize your workflow?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-8 py-3 rounded-xl neon-glow hover-lift transition-all duration-300 flex items-center gap-2">
                Start Building
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="glass border-white/20 hover:border-[#FF6900]/50 text-white font-semibold px-8 py-3 rounded-xl hover-lift transition-all duration-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                View Demo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Workflow;
