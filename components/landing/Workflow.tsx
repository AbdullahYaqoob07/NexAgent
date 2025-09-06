"use client";

import { motion } from "framer-motion";
import { MousePointer, Link, Play, BarChart3, ArrowRight, CheckCircle } from "lucide-react";

const workflowSteps = [
  {
    id: 1,
    title: "Design Visually",
    description: "Drag and drop to build workflows without code. Connect triggers, actions, and logic with our intuitive visual editor.",
    icon: <MousePointer className="w-6 h-6" />,
    benefits: ["No coding required", "Visual flow designer", "Real-time preview"]
  },
  {
    id: 2,
    title: "Connect Everything",
    description: "Integrate with 500+ applications and services. Use pre-built connectors or create custom integrations with our API.",
    icon: <Link className="w-6 h-6" />,
    benefits: ["500+ integrations", "Pre-built connectors", "Custom API support"]
  },
  {
    id: 3,
    title: "Deploy & Execute",
    description: "Launch your workflows with a single click. Set triggers, configure schedules, and let automation handle the rest.",
    icon: <Play className="w-6 h-6" />,
    benefits: ["One-click deployment", "Flexible scheduling", "Automatic execution"]
  },
  {
    id: 4,
    title: "Monitor & Scale",
    description: "Track performance with real-time analytics. Monitor executions, troubleshoot errors, and optimize for scale.",
    icon: <BarChart3 className="w-6 h-6" />,
    benefits: ["Real-time monitoring", "Error tracking", "Performance optimization"]
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative"
    >
      <div className="flex items-start gap-6">
        {/* Step number and icon */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#FF6900] rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
            {step.id}
          </div>
          {index < workflowSteps.length - 1 && (
            <div className="w-px h-16 bg-zinc-700 mt-4" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 pb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-[#FF6900]">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-white">
                {step.title}
              </h3>
            </div>
            <p className="text-zinc-400 mb-4">
              {step.description}
            </p>
            <div className="space-y-2">
              {step.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-zinc-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Workflow = () => {
  return (
    <section id="workflow" className="relative py-24 bg-zinc-950/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <span className="text-sm text-zinc-300 font-medium">Simple Process</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Get started with automation in minutes. Our intuitive platform guides you through every step.
          </p>
        </motion.div>
        
        {/* Workflow steps */}
        <div className="space-y-0">
          {workflowSteps.map((step, index) => (
            <WorkflowStep key={step.id} step={step} index={index} />
          ))}
        </div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
            <p className="text-zinc-300 mb-6">Ready to automate your business processes?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#FF6900] hover:bg-[#E55D00] text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
                Start Building Workflows
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200">
                View Live Demo
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Workflow;
