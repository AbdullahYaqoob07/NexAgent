"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Star, Zap, Shield, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    icon: <Zap className="w-6 h-6" />,
    price: "0",
    currency: "$",
    duration: "/forever",
    description: "Perfect for individuals exploring AI capabilities",
    features: [
      "5 AI agents per month",
      "Basic neural processing",
      "Community support",
      "Standard response time",
      "Access to public models",
      "Basic analytics dashboard"
    ],
    popular: false,
    cta: "Start Free"
  },
  {
    name: "Professional",
    icon: <Star className="w-6 h-6" />,
    price: "99",
    currency: "$",
    duration: "/month",
    description: "Advanced features for growing businesses",
    features: [
      "Unlimited AI agents",
      "Advanced neural processing",
      "Priority 24/7 support",
      "50ms response time",
      "Custom model training",
      "Advanced analytics suite",
      "API access & webhooks",
      "Team collaboration tools"
    ],
    popular: true,
    cta: "Start Trial"
  },
  {
    name: "Enterprise",
    icon: <Shield className="w-6 h-6" />,
    price: "Custom",
    currency: "",
    duration: "",
    description: "Tailored solutions for large organizations",
    features: [
      "Unlimited everything",
      "Quantum neural processing",
      "Dedicated support team",
      "<10ms response time",
      "Private model deployment",
      "Custom integrations",
      "On-premise options",
      "SLA guarantees",
      "Security compliance"
    ],
    popular: false,
    cta: "Contact Sales"
  }
];

const PricingCard = ({ plan, index }: { plan: typeof plans[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative"
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-cyan-400 text-black px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}
      
      <div className={`relative glass-card p-8 rounded-2xl h-full ${
        plan.popular ? 'border-2 border-cyan-400/50' : ''
      } hover:shadow-xl hover:shadow-cyan-400/10 transition-all duration-300`}>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
              {plan.icon}
            </div>
            <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
          </div>
          <p className="text-white/60 text-sm">{plan.description}</p>
        </div>
        
        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline">
            {plan.currency && <span className="text-cyan-400 text-2xl">{plan.currency}</span>}
            <span className="text-5xl font-bold text-white mx-1">{plan.price}</span>
            {plan.duration && <span className="text-white/60">{plan.duration}</span>}
          </div>
        </div>
        
        {/* Features */}
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span className="text-white/80 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* CTA Button */}
        <Button 
          className={`w-full py-6 rounded-xl font-semibold transition-all duration-300 ${
            plan.popular 
              ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30' 
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
        >
          {plan.cta}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-2xl blur-2xl" />
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
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
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">Transparent Pricing</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Choose Your
            <span className="block text-cyan-400">
              AI Journey
            </span>
          </h2>
          
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Scale seamlessly from prototype to production with pricing that grows with your needs
          </p>
        </motion.div>
        
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <PricingCard key={index} plan={plan} index={index} />
          ))}
        </div>
        
        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="glass-card p-6 rounded-2xl inline-block">
            <div className="flex items-center gap-8 flex-wrap justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">30-Day</div>
                <div className="text-white/60 text-sm">Money-back guarantee</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">No</div>
                <div className="text-white/60 text-sm">Hidden fees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">Cancel</div>
                <div className="text-white/60 text-sm">Anytime</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
