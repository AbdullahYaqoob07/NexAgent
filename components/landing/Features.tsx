"use client";

import { motion } from "framer-motion";
import { Brain, Shield, Rocket, Database, Code, Bot } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Neural Processing",
    description: "Advanced machine learning algorithms with enterprise-grade processing capabilities for complex data analysis.",
  },
  {
    icon: Rocket,
    title: "High-Performance Deployment",
    description: "Deploy AI models at scale with optimized infrastructure designed for enterprise-level performance.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Military-grade encryption and security protocols ensuring your data remains protected and compliant.",
  },
  {
    icon: Database,
    title: "Scalable Architecture",
    description: "Handle massive datasets with distributed processing architecture built for enterprise workloads.",
  },
  {
    icon: Code,
    title: "API-First Design",
    description: "Integrate seamlessly with existing systems through comprehensive APIs and development tools.",
  },
  {
    icon: Bot,
    title: "Intelligent Automation",
    description: "Deploy autonomous agents that learn and adapt to optimize your business processes continuously.",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  const IconComponent = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="surface-elevated p-8 rounded-lg hover-lift transition-smooth group-hover:border-orange/20 h-full">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange/20 transition-standard">
            <IconComponent className="w-6 h-6 text-orange" />
          </div>
          <div className="space-y-3">
            <h3 className="text-white group-hover:text-orange transition-standard">
              {feature.title}
            </h3>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section id="features" className="section-padding">
      <div className="content-max container-padding">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          
          <h2 className="text-white">
            Enterprise-Grade
            <span className="block text-orange">AI Features</span>
          </h2>
          
          <p className="lead max-w-2xl mx-auto">
            Built for mission-critical applications with the reliability and performance your business demands.
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
