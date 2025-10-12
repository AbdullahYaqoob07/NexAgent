"use client";

import { motion } from "framer-motion";

const Marketplace = () => {
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
            Marketplace
          </h2>
        </motion.div>
        
        {/* Marketplace cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[1, 2, 3].map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-[#1B1B1C] border border-zinc-800 rounded-2xl p-6 h-64"
            >
              <h3 className="text-xl font-semibold text-white mb-4">
                Marketplace Card {item}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This is a placeholder description for marketplace card {item}. We will improve the design and content later.
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Marketplace;
