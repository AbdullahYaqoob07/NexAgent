"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";

const plans = [
  {
    name: "Basic",
    monthlyPrice: "$15",
    yearlyPrice: "$144", // Should show as $12/month when yearly selected
    yearlyMonthlyEquivalent: "$12", // 144 / 12 = 12
    currency: "",
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
    monthlyPrice: "$17",
    yearlyPrice: "156", // 13 * 12 = 156
    yearlyMonthlyEquivalent: "$13", // Shows as $13/month when yearly selected
    currency: "",
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
    monthlyPrice: "$37",
    yearlyPrice: "384", // 32 * 12 = 384
    yearlyMonthlyEquivalent: "$32", // Shows as $32/month when yearly selected
    currency: "",
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

const PricingCard = ({ plan, index, isYearly }: { plan: typeof plans[0], index: number, isYearly: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={`relative h-full ${
        plan.popular ? 'z-20 lg:scale-[1.02] transform' : 'z-10'
      } ${
        index === 0 ? 'lg:mr-[-8px]' : index === 2 ? 'lg:ml-[-8px]' : ''
      }`}
    >
      {/* Gradient border for popular plan */}
      {plan.popular && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#FF6900] to-[#691A00] p-[2px]">
          <div className="h-full w-full rounded-2xl bg-[#1B1B1C]" />
        </div>
      )}
      
      <div className={`relative ${
        plan.popular ? 'border-0' : 'border border-zinc-800'
      } rounded-2xl p-7 h-full flex flex-col transition-all duration-200 ${
        plan.popular ? 'bg-transparent lg:min-h-[600px]' : 'bg-[#1B1B1C] lg:min-h-[540px]'
      }`}>
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3">
            <h3 className={`text-lg ${plan.popular ? 'font-bold text-[#FF6900]' : 'font-medium text-white'}`}>{plan.name}</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-8">
            {plan.currency && <span className="text-white text-2xl">{plan.currency}</span>}
            <span className="text-4xl font-bold text-white">
              {isYearly ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice}
            </span>
            <span className="text-zinc-400">
              {isYearly ? " / month" : " / month"}
            </span>
            {plan.discount && (
              <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-[#FF6900] text-white font-semibold">
                {plan.discount}
              </span>
            )}
          </div>
          {/* Gradient line */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
        </div>

        {/* Features */}
        <div className="flex-grow mb-6">
          <p className="text-zinc-400 text-sm mb-3">What's included</p>
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Image
                  src={plan.popular ? "/assets/pricing/tick-circle-2.svg" : "/assets/pricing/tick-circle.svg"}
                  alt="Check"
                  width={20}
                  height={20}
                  className="flex-shrink-0 mt-0.5"
                />
                <span className="text-zinc-300 text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="mt-auto flex justify-center">
          <div className="relative group">
            {/* Background glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-b from-[#B48B70] to-[#69462E] rounded-md opacity-50 blur-sm group-hover:opacity-75 group-hover:blur-md transition-all duration-300" />
            
            {/* Button with gradient border */}
            <div className="relative bg-gradient-to-b from-[#B48B70] to-[#69462E] p-[1px] rounded-md">
              <Button
                className="relative py-4 px-6 rounded-md font-normal text-base transition-all duration-300 flex items-center justify-center gap-2 bg-[#3D210E] hover:bg-[#5A2F17] text-white min-w-[100px] border-0 group-hover:shadow-lg"
              >
                {plan.cta}
                <Image
                  src="/assets/pricing/arrow.svg"
                  alt="Arrow"
                  width={8}
                  height={8}
                  className="ml-1 transition-transform group-hover:translate-x-0.5"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BillingToggle = ({ isYearly, setIsYearly }: { isYearly: boolean, setIsYearly: (value: boolean) => void }) => {
  return (
    <div className="flex items-center justify-center mb-12">
      <div className="relative bg-[#192124] border border-zinc-700 rounded-full p-1 backdrop-blur-sm">
        <div className="flex relative">
          <button
            onClick={() => setIsYearly(false)}
            className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              !isYearly
                ? 'text-white/80'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`relative z-10 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              isYearly
                ? 'text-white/80'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Yearly
          </button>
          {/* Active background */}
          <div
            className={`absolute top-1 bottom-1 bg-[#484D4D] rounded-full transition-all duration-300 ease-out ${
              isYearly ? 'left-[calc(50%+2px)] right-1' : 'left-1 right-[calc(50%+2px)]'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  
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
          className="text-center mb-8"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-white mb-4 max-w-xl mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Choose the Plan That's Right for You
          </h2>
          <p className="text-lg md:text-base text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Giving you access to essential features and over 1,000 creative tools. Upgrade to the Pro Plan to unlock powerful AI capabilities, cloud syncing, and a whole new level of creative freedom.
          </p>
        </motion.div>
        
        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <BillingToggle isYearly={isYearly} setIsYearly={setIsYearly} />
        </motion.div>

        {/* Pricing cards */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-0 mb-16 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`flex-1 ${index === 1 ? 'md:max-w-[360px]' : 'md:max-w-[320px]'}`}>
              <PricingCard plan={plan} index={index} isYearly={isYearly} />
            </div>
          ))}
        </div>
        
        {/* Trust badges */}
        
      </div>
    </section>
  );
};

export default Pricing;
