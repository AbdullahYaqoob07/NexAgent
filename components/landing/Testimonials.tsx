"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Operations",
    company: "TechFlow Inc.",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b75b3e12?w=400&h=400&fit=crop&crop=face",
    content: "NexAgent transformed our operations completely. We've automated 80% of our manual processes and reduced processing time by 90%. The ROI was evident within the first month.",
    rating: 5,
    metrics: "90% faster processing"
  },
  {
    name: "Michael Rodriguez",
    role: "CTO",
    company: "DataSync Solutions",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    content: "The enterprise security and compliance features give us complete peace of mind. Our audit team was impressed with the comprehensive logging and access controls.",
    rating: 5,
    metrics: "SOC 2 compliant"
  },
  {
    name: "Emily Watson",
    role: "Head of Customer Success",
    company: "GrowthMetrics",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    content: "Integration with our existing tools was seamless. The visual workflow builder lets our non-technical team members create complex automations independently.",
    rating: 5,
    metrics: "500+ integrations"
  }
];

const companies = [
  { name: "Microsoft" },
  { name: "Salesforce" },
  { name: "AWS" },
  { name: "Google" },
  { name: "Slack" },
  { name: "Zoom" }
];

const TestimonialCard = ({ t, i }: { t: typeof testimonials[0]; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: i * 0.1 }}
    viewport={{ once: true }}
    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full flex flex-col"
  >
    <div className="mb-4">
      <Quote className="w-8 h-8 text-[#FF6900] opacity-60" />
    </div>
    <blockquote className="text-zinc-300 mb-6 flex-grow leading-relaxed">“{t.content}”</blockquote>
    <div className="flex items-center gap-1 mb-4">
      {[...Array(t.rating)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
    <div className="mb-4">
      <span className="inline-block px-3 py-1 bg-[#FF6900]/10 border border-[#FF6900]/20 rounded-full text-xs font-medium text-[#FF6900]">{t.metrics}</span>
    </div>
    <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
      <div>
        <div className="font-medium text-white text-sm">{t.name}</div>
        <div className="text-zinc-400 text-xs">{t.role}</div>
        <div className="text-zinc-500 text-xs">{t.company}</div>
      </div>
    </div>
  </motion.div>
);

const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trusted by */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm text-zinc-500 mb-8">Trusted by teams at</p>
          <div className="flex items-center justify-center gap-8 flex-wrap grayscale opacity-60">
            {companies.map((company, index) => (
              <div key={index} className="h-8 flex items-center">
                <span className="text-zinc-400 font-semibold text-lg">{company.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full mb-6">
            <div className="w-2 h-2 bg-[#FF6900] rounded-full" />
            <span className="text-sm text-zinc-300 font-medium">Customer Success</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Loved by Enterprise Teams</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">Join thousands of companies that trust NexAgent to power their most critical business processes.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} i={i} />
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">10,000+</div>
              <div className="text-zinc-400 text-sm">Enterprise Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">99.99%</div>
              <div className="text-zinc-400 text-sm">Uptime SLA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">5M+</div>
              <div className="text-zinc-400 text-sm">Workflows Daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-zinc-400 text-sm">Enterprise Support</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
