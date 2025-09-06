"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Star, Zap, Shield,  ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    icon: <Zap className="w-6 h-6" />,
    price: "49",
    currency: "$",
    duration: "/month",
    description: "Perfect for small teams getting started with automation",
    features: [
      "Up to 1,000 workflow executions/month",
      "50+ pre-built integrations",
      "Email support",
      "Basic analytics & monitoring",
      "5 team members included",
      "Standard execution priority"
    ],
    popular: false,
    cta: "Start Free Trial",
    monthlyExecutions: "1,000",
    teamSize: "5 users"
  },
  {
    name: "Professional",
    icon: <Star className="w-6 h-6" />,
    price: "149",
    currency: "$",
    duration: "/month",
    description: "Advanced automation for growing businesses",
    features: [
      "Up to 10,000 workflow executions/month",
      "500+ enterprise integrations",
      "Priority support & dedicated CSM",
      "Advanced analytics & reporting",
      "25 team members included",
      "High-priority execution",
      "API access & webhooks",
      "Advanced workflow features"
    ],
    popular: true,
    cta: "Start Free Trial",
    monthlyExecutions: "10,000",
    teamSize: "25 users"
  },
  {
    name: "Enterprise",
    icon: <Shield className="w-6 h-6" />,
    price: "Custom",
    currency: "",
    duration: "",
    description: "Enterprise-grade solutions with unlimited scale",
    features: [
      "Unlimited workflow executions",
      "All integrations + custom connectors",
      "24/7 dedicated support team",
      "Advanced security & compliance",
      "Unlimited team members",
      "Guaranteed SLA & uptime",
      "On-premise deployment options",
      "Custom integrations & features",
      "Priority feature requests"
    ],
    popular: false,
    cta: "Contact Sales",
    monthlyExecutions: "Unlimited",
    teamSize: "Unlimited"
  }
];

const PricingCard = ({ plan, index }: { plan: typeof plans[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative h-full"
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-[#FF6900] text-white px-3 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </div>
        </div>
      )}
      
      <div className={`relative bg-zinc-900/50 border rounded-xl p-6 h-full flex flex-col ${
        plan.popular ? 'border-[#FF6900] shadow-lg shadow-[#FF6900]/10' : 'border-zinc-800 hover:border-zinc-700'
      } transition-all duration-200`}>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-[#FF6900]">
              {plan.icon}
            </div>
            <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
          </div>
          <p className="text-zinc-400 text-sm">{plan.description}</p>
        </div>
        
        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline">
            {plan.currency && <span className="text-zinc-400 text-xl">{plan.currency}</span>}
            <span className="text-3xl font-bold text-white">{plan.price}</span>
            {plan.duration && <span className="text-zinc-400">{plan.duration}</span>}
          </div>
          {plan.monthlyExecutions && (
            <div className="mt-2 text-sm text-zinc-500">
              {plan.monthlyExecutions} executions • {plan.teamSize}
            </div>
          )}
        </div>
        
        {/* Features */}
        <div className="flex-grow mb-6">
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* CTA Button */}
        <div className="mt-auto">
          <Button 
            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
              plan.popular 
                ? 'bg-[#FF6900] hover:bg-[#E55D00] text-white' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-0'
            }`}
          >
            {plan.cta}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24">
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
            <span className="text-sm text-zinc-300 font-medium">Flexible Pricing</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include core automation features and integrations.
          </p>
        </motion.div>
        
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 inline-block">
            <div className="flex items-center gap-8 flex-wrap justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-white">14-Day</div>
                <div className="text-zinc-400 text-sm">Free trial</div>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">No</div>
                <div className="text-zinc-400 text-sm">Setup fees</div>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">Cancel</div>
                <div className="text-zinc-400 text-sm">Anytime</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
