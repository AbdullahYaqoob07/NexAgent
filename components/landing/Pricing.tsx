"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const plans = [
  {
    name: "Free",
    price: "15",
    currency: "$",
    duration: "/month",
    description: "Everything you need to supercharge your productivity.",
    features: [
      "20 design generations/month",
      "Low-res downloads",
      "Basic style presets",
      "Limited customization options"
    ],
    popular: false,
    cta: "Subscribe",
    discount: "",
  },
  {
    name: "Pro",
    price: "17",
    currency: "$",
    duration: "/month",
    description: "Unlock a new level of your personal productivity.",
    features: [
      "Everything in Free",
      "Enigma AI",
      "Unlimited design generations",
      "Custom Themes",
      "High-resolution exports",
      "Custom Extensions",
      "Developer Tools",
    ],
    popular: true,
    cta: "Subscribe",
    discount: "-20%",
  },
  {
    name: "Team",
    price: "37",
    currency: "$",
    duration: "/month",
    description: "Everything you need to supercharge your productivity.",
    features: [
      "Everything in Free",
      "Unlimited Shared Commands",
      "Unlimited Shared Quicklinks",
      "Priority support",
    ],
    popular: false,
    cta: "Subscribe",
    discount: "-20%",
  },
];

const PricingCard = ({ plan, index }: { plan: typeof plans[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={`relative h-full ${plan.popular ? 'lg:scale-[1.04] lg:-mt-6 z-10' : 'lg:opacity-95'}`}
    >
      <div className={`relative border rounded-2xl p-7 h-full flex flex-col bg-[#111111]/90 ${
        plan.popular ? 'border-[#FF6900] shadow-xl shadow-[#FF6900]/20' : 'border-zinc-800'
      } transition-all duration-200`}>
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3">
            <h3 className={`text-lg font-semibold ${plan.popular ? 'text-[#FF6900]' : 'text-white'}`}>{plan.name}</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            {plan.currency && <span className="text-white text-2xl">{plan.currency}</span>}
            <span className="text-4xl font-bold text-white">{plan.price}</span>
            {plan.duration && <span className="text-zinc-400">{plan.duration}</span>}
            {plan.discount && (
              <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-[#FF6900] text-black/90 font-semibold">
                {plan.discount}
              </span>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="flex-grow mb-6">
          <p className="text-zinc-400 text-sm mb-3">What's included</p>
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#FF6900] flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="mt-auto">
          <Button 
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              plan.popular 
                ? 'bg-[#FF6900] hover:bg-[#E55D00] text-white shadow-lg hover:shadow-[#FF6900]/25' 
                : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 hover:border-[#FF6900]/50'
            }`}
          >
            {plan.cta}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 opacity-100">
        <Image
          src="/assets/pricing/bg.svg"
          alt="Pricing Background"
          fill
          className="object-cover"
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Choose the Plan That's Right for You
          </h2>
          <p className="text-sm md:text-base text-zinc-400 max-w-3xl mx-auto">
            Giving you access to essential features and over 1,000 creative tools. Upgrade to the Pro Plan to unlock powerful AI capabilities, cloud syncing, and a whole new level of creative freedom.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16 items-stretch">
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
