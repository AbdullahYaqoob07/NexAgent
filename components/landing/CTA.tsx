"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const CTA = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* CTA Background - extends into FAQ above and Footer below */}
      <div className="absolute inset-0 z-0 -top-64 -bottom-64">
        <Image
          src="/assets/CTA/gradient blob.svg"
          alt="CTA Background"
          fill
          className="object-cover opacity-50"
          style={{ 
            mixBlendMode: 'normal',
            transform: 'scale(1.2)'
          }}
        />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-[#1B1B1C] border border-zinc-800 rounded-2xl p-12 text-center"
        >
          <h2 
            className="text-4xl sm:text-5xl font-medium text-white mb-6" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Ready to Transform Your Workflow?
          </h2>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            Join thousands of teams already using NexAgent to automate their processes, 
            increase productivity, and achieve better results with AI-powered solutions.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Start Your Free Trial
          </motion.button>
          
          <p className="text-sm text-zinc-500 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
