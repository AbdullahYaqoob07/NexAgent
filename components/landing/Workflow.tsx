"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";


const Workflow = () => {
  return (
    <section id="workflow" className="relative py-20 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl lg:text-6xl font-medium text-white mb-6"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Interactive Interface
        </motion.h2>
        
        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-lg text-white/80 mb-12 max-w-2xl mx-auto"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Celebrate the joy of accomplishment with an app designed to track your progress, motivate your efforts, and celebrate your successes, one task at a time.
        </motion.p>
        
        {/* Centered Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="w-full max-w-5xl mx-auto"
        >
          <Image
            src="/assets/workflow/Dashboard.svg"
            alt="NexAgent Workflow Dashboard"
            width={1200}
            height={800}
            className="w-full h-auto rounded-2xl shadow-2xl"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
};

export default Workflow;
