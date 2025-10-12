"use client";

import { motion } from "framer-motion";

const Selling = () => {
  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 
            className="text-4xl sm:text-5xl font-medium text-white mb-4" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Selling
          </h2>
        </motion.div>
        
        {/* Selling card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-[#1B1B1C] border border-zinc-800 rounded-2xl p-8 flex flex-col lg:flex-row items-center gap-8 h-80">
            {/* Left side - Content */}
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-4">
                  Selling Section Heading
                </h3>
                <p className="text-zinc-400 text-base leading-relaxed mb-6">
                  This is a placeholder description for the selling section. It will contain detailed information about selling features. We will improve the design and content later.
                </p>
              </div>
              <div className="mt-auto">
                <button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Get Started
                </button>
              </div>
            </div>
            
            {/* Right side - Image placeholder */}
            <div className="flex-1 lg:max-w-md">
              <div className="bg-zinc-700 rounded-xl h-48 flex items-center justify-center">
                <span className="text-zinc-400">Image Placeholder</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Selling;
