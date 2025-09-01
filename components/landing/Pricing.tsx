"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Star, Zap, Shield, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    icon: <Zap className="w-6 h-6" />,
    price: "15",
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
          <div className="bg-orange text-black px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}
      
      <div className={`relative surface-elevated p-8 rounded-lg h-full flex flex-col ${
        plan.popular ? 'border-2 border-orange/50' : ''
      } hover:border-orange/30 transition-standard`}>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
              {plan.icon}
            </div>
            <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
          </div>
          <p className="text-white/60 text-sm">{plan.description}</p>
        </div>
        
        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline">
            {plan.currency && <span className="text-orange text-2xl">{plan.currency}</span>}
            <span className="text-5xl font-bold text-white mx-1">{plan.price}</span>
            {plan.duration && <span className="text-white/60">{plan.duration}</span>}
          </div>
        </div>
        
        {/* Features - flex-grow pushes button to bottom */}
        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-orange" />
              </div>
              <span className="text-white/80 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* CTA Button - always at bottom */}
        <Button 
          className={`w-full py-4 rounded-lg font-medium transition-standard mt-auto ${
            plan.popular 
              ? 'bg-orange hover:bg-orange-dark text-white' 
              : 'bg-secondary hover:bg-secondary/80 text-white border border-border'
          }`}
        >
          {plan.cta}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
        
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      
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
            Choose Your
            <span className="block text-orange">
              Plan
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
          <div className="surface-elevated p-6 rounded-lg">
            <div className="flex items-center gap-8 flex-wrap justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange">30-Day</div>
                <div className="text-muted-foreground text-sm">Money-back guarantee</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange">No</div>
                <div className="text-muted-foreground text-sm">Hidden fees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange">Cancel</div>
                <div className="text-muted-foreground text-sm">Anytime</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
