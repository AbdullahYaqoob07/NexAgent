"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "CTO, Orbital Labs",
    text: "We reduced inference latency by 80% and scaled to millions of queries overnight.",
  },
  {
    name: "David Kim",
    role: "Head of AI, SynapseX",
    text: "The agent workflow system is years ahead—it's like building in 3025.",
  },
  {
    name: "Aisha Khan",
    role: "Research Director, QuantumWorks",
    text: "Unmatched performance and control. This platform is our new standard.",
  },
];

const TestimonialCard = ({ t, i }: { t: typeof testimonials[0]; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: i * 0.15 }}
    viewport={{ once: true }}
    className="relative glass-card p-8 rounded-2xl text-left hover-lift"
  >
    {/* Holographic edge */}
    <div className="absolute inset-0 rounded-2xl pointer-events-none"
      style={{
        background: "linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0) 40%, rgba(255,107,53,0.15))",
        mask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
        WebkitMask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
        maskComposite: "exclude",
        WebkitMaskComposite: "xor",
        padding: 1,
      }}
    />

    <p className="text-white/80 italic mb-6">“{t.text}”</p>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">{t.name}</h3>
        <p className="text-sm text-white/60">{t.role}</p>
      </div>
      <div className="w-2 h-2 bg-[#ff6b35] rounded-full animate-pulse" />
    </div>
  </motion.div>
);

const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-10 right-0 w-80 h-80 bg-[#ff6b35]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl font-bold text-center text-white mb-12"
        >
          Trusted by pioneers of the future
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
