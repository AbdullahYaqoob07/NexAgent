"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const marketplaceItems = [
  {
    id: 1,
    title: "Google Sheets Automation",
    description: "Automatically sync data between Google Sheets and your workflows. Perfect for data analysis and reporting.",
    userName: "Sarah Johnson",
    initials: "SJ",
    category: "Data Processing",
    rating: "4.8",
    integrations: "12,500",
    image: "/assets/marketPlace/Sheets.svg"
  },
  {
    id: 2,
    title: "Slack Integration Hub",
    description: "Real-time analytics and insights to track your business performance and growth metrics.",
    userName: "Mike Chen",
    initials: "MC",
    category: "Communication",
    rating: "4.8",
    integrations: "12,500",
    image: "/assets/marketPlace/Slack.svg"
  },
  {
    id: 3,
    title: "OpenAI Content Generator",
    description: "Streamline your business processes with intelligent automation and task management.",
    userName: "Alex Rivera",
    initials: "AR",
    category: "AI & ML",
    rating: "4.8",
    integrations: "12,500",
    image: "/assets/marketPlace/OpenAi.svg"
  }
];

const MarketplaceCard = ({
  item,
  index,
  onPreview,
  onIntegrate,
}: {
  item: typeof marketplaceItems[0];
  index: number;
  onPreview: () => void;
  onIntegrate: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-[#1B1B1C] border border-[#393F40] rounded-2xl overflow-hidden flex flex-col"
      style={{ height: '450px' }}
    >
      {/* Top 40% - Image area with badges */}
      <div className="relative h-2/5 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6900]/20 via-transparent to-[#FF6900]/10" />
        
        {/* Top badges row with higher z-index */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          {/* Category badge */}
          <div className="bg-[#161616] border border-[#312F2F] rounded-full px-3 py-1 flex items-center justify-center">
            <span className="text-white text-xs font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {item.category}
            </span>
          </div>
        </div>
        
        {/* Free badge fixed at top-right */}
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-[#161616] border border-[#312F2F] rounded-full px-3 py-1 flex items-center justify-center">
            <span className="text-white text-xs font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Free
            </span>
          </div>
        </div>
        
        {/* Rating + Integrations combined badge - below category badge */}
        <div className="absolute top-36 left-3 z-10">
          <div className="bg-[#161616] border border-[#312F2F] rounded-full px-2 py-1 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Image
                src="/assets/marketPlace/Star.svg"
                alt="Star"
                width={12}
                height={12}
                className="w-3 h-3"
              />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {item.rating}
              </span>
            </div>
            <span className="text-white text-xs">•</span>
            <div className="flex items-center gap-1">
              <Image
                src="/assets/marketPlace/Switch.svg"
                alt="Star"
                width={12}
                height={12}
                className="w-3 h-3"
              />
            <span className="text-white text-xs font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {item.integrations} integrations
            </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom 60% - Content area */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title and Description */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {item.title}
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {item.description}
          </p>
        </div>
        
        {/* Bottom row - User and buttons */}
        <div className="flex items-center justify-between mt-4">
          {/* User with full name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#161616] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {item.initials}
              </span>
            </div>
            <span className="text-zinc-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {item.userName.split(' ')[0]}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Preview button with text */}
            <button
              onClick={onPreview}
              className="bg-[#161616] border border-[#312F2F] hover:bg-[#2A2A2A] hover:border-[#4A4A4A] text-white px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1"
            >
              <Image
                src="/assets/marketPlace/Eye.svg"
                alt="Eye"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Preview</span>
            </button>
            
            {/* Integrate button */}
            <button
              onClick={onIntegrate}
              className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-1 hover:scale-105"
            >
              <Image
                src="/assets/marketPlace/Switch.svg"
                alt="Switch"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Integrate</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Marketplace = () => {
  const router = useRouter();
  const { user, loading } = useAuth();

  const navigateWithAuthCheck = (targetPath: string) => {
    if (loading) return;
    if (user) {
      router.push(targetPath);
      return;
    }
    router.push('/sign-in');
  };

  return (
    <section id="marketplace" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 
            className="text-4xl sm:text-5xl font-medium text-white mb-4" 
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Explore Market Place
          </h2>
          <p className="text-lg md:text-base text-white/80 max-w-2xl mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}> Celebrate the joy of accomplishment with an app designed to track your progress, motivate your efforts, and celebrate your successes, one task at a time.</p>
        </motion.div>
        
        {/* Marketplace cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {marketplaceItems.map((item, index) => (
            <MarketplaceCard
              key={item.id}
              item={item}
              index={index}
              onPreview={() => navigateWithAuthCheck('/marketplace')}
              onIntegrate={() => navigateWithAuthCheck('/workflows')}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Marketplace;
