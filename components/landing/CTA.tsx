"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section id="contact" className="relative py-24 overflow-hidden">
      {/* CTA Background - extends into FAQ above and Footer below */}
       <div className="absolute inset-0 z-0 -top-64 -bottom-64">
        <Image
          src="/assets/CTA/gradient blob.svg"
          alt="CTA Background"
          fill
          className="object-fill opacity-100"
          style={{ 
            mixBlendMode: 'normal',
            transform: 'scale(1.2)'
          }}
        />
      </div>
      
      {/* Gradient blob on right side of section */}
      {/* <div className="absolute top-63 right-[-1] w-116 h-116 bg-[#3C0E06] rounded-full blur-3xl opacity-90 z-0 pointer-events-none transform -translate-y-1/2"></div> */}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-2 relative z-10">
        {/* CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-[#] border border-[#3B3B3B] p-12 text-center relative overflow-hidden"
          style={{ borderRadius: '20px' }}
        >
          {/* Mask-grid centered overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Image
              src="/assets/CTA/Mask-grid.svg"
              alt="Grid Overlay"
              width={600}
              height={600}
              className="opacity-100"
            />
          </div>
          
          {/* Mask-gradient at top */}
          <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none h-40 md:h-66 lg:h-64">
            <Image
              src="/assets/CTA/Mask-gradient.svg"
              alt="Gradient Mask"
              fill
              className="object-cover opacity-100"
            />
          </div>
          
          {/* Content with higher z-index */}
          <div className="relative z-10">
          <h2 
            className="text-4xl sm:text-5xl font-medium text-white mb-6" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Ready to Work Smarter?
          </h2>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Whether you're a freelancer, a team, or a growing agency—our tools adapt to your workflow. Design faster. Deliver better.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-10 py-2 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          </div>
          
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
