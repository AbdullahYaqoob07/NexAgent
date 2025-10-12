"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

const faqs = [
  {
    question: "What is NexAgent and how does it work?",
    answer: "It's an AI-powered design assistant that helps you generate, customize, and export creative assets in seconds—whether for personal projects, brand work, or commercial use."
  },
  {
    question: "How do I get started with NexAgent?",
    answer: "Simply sign up for an account, choose your plan, and start creating your first AI agent. Our onboarding process will guide you through the setup."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through our encrypted payment system."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. Your access will continue until the end of your billing period."
  },
  {
    question: "Do you offer customer support?",
    answer: "Yes, we provide 24/7 customer support through chat, email, and phone. Our dedicated support team is always ready to help you with any questions or issues."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* Fixed Background Elements - Won't move when content expands */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Rounded Rectangle Orange - Left Top (touching screen border) */}
        <div className="absolute w-32 h-20 lg:w-48 lg:h-32" style={{ top: 'calc(100vh * 0.4)', left: '-40px', transform: 'translateY(-50%)' }}>
          <Image
            src="/assets/FAQ/Rounded-rectangle-orange.svg"
            alt="Orange Rectangle"
            fill
            className="object-contain"
          />
        </div>
        
        {/* Circle Orange - Right Side (touching screen border) */}
        <div className="absolute w-24 h-24 lg:w-36 lg:h-36" style={{ top: 'calc(100vh * 0.5)', right: '-40px', transform: 'translateY(-50%)' }}>
          <Image
            src="/assets/FAQ/Circle-orange.svg"
            alt="Orange Circle"
            fill
            className="object-contain"
          />
        </div>
        
        {/* Rounded Rectangle White - Left Bottom (touching screen border) */}
        <div className="absolute w-28 h-16 lg:w-40 lg:h-24" style={{ top: 'calc(100vh * 0.7)', left: '-40px', transform: 'translateY(50%)' }}>
          <Image
            src="/assets/FAQ/Rounded-rectangle-white.svg"
            alt="White Rectangle"
            fill
            className="object-contain"
          />
        </div>
        
        {/* CTA Background - Bottom Right with top blend */}
        <div className="absolute" style={{ top: 'calc(100vh * 0.6)', right: '-100px', width: '600px', height: '600px' }}>
          {/* Top blend overlay */}
          <div 
            className="absolute inset-0 z-10"
            style={{
              background: 'linear-gradient(to bottom, #000000 0%, transparent 30%)',
            }}
          />
          <Image
            src="/assets/CTA/gradient blob.svg"
            alt="CTA Background"
            fill
            className="object-cover opacity-30"
          />
        </div>
      </div>
      
      <section className="relative py-24 z-10">
      
      {/* Old backgrounds removed - now using fixed positioned ones above */}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 
            className="text-4xl sm:text-5xl font-medium text-white mb-4 max-w-4xl mx-auto text-center" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Got questions? We've got answers.
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Got questions? We've got answers. Find everything you need to know about using our platform, plans, and features.
          </p>
        </motion.div>
        
        {/* FAQ items */}
        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="border-b border-zinc-800 last:border-b-0"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full py-6 text-left flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-normal text-white pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-zinc-400 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      duration: 0.3,
                      ease: "easeInOut",
                      height: { duration: 0.3 },
                      opacity: { duration: 0.2 }
                    }}
                    className="pb-6 overflow-hidden"
                  >
                    <p className="text-zinc-400 leading-relaxed ">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
};

export default FAQ;
