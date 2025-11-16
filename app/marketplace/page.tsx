'use client';

import { useRequireAuth } from '@/lib/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MarketplaceView from '@/components/marketplace/MarketplaceView';

// Dummy marketplace data
const dummyNexas = [
  {
    id: '1',
    name: 'Google Sheets Automation',
    category: 'Data Processing',
    rating: 4.8,
    installs: 12500,
    author: 'NexAgent Team',
    price: 'Free',
    updated: '2024-01-15',
    description: 'Automatically sync data between Google Sheets and your workflows. Perfect for data analysis and reporting.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
    tools: ['google', 'excel']
  },
  {
    id: '2',
    name: 'Slack Integration Hub',
    category: 'Communication',
    rating: 4.6,
    installs: 8900,
    author: 'DevCorp',
    price: '$9.99',
    updated: '2024-01-12',
    description: 'Send notifications, create channels, and manage team communication directly from your workflows.',
    image: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=400&h=200&fit=crop',
    tools: ['slack']
  },
  {
    id: '3',
    name: 'OpenAI Content Generator',
    category: 'AI & ML',
    rating: 4.9,
    installs: 15600,
    author: 'AI Solutions',
    price: '$19.99',
    updated: '2024-01-18',
    description: 'Generate high-quality content using OpenAI\'s GPT models. Perfect for marketing and content creation.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop',
    tools: ['openai']
  },
  {
    id: '4',
    name: 'JSON Data Processor',
    category: 'Data Processing',
    rating: 4.4,
    installs: 6700,
    author: 'DataFlow Inc',
    price: 'Free',
    updated: '2024-01-10',
    description: 'Parse, transform, and validate JSON data in your workflows with ease.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop',
    tools: ['json']
  },
  {
    id: '5',
    name: 'Shopify Store Manager',
    category: 'E-commerce',
    rating: 4.7,
    installs: 4200,
    author: 'E-commerce Pro',
    price: '$14.99',
    updated: '2024-01-08',
    description: 'Manage inventory, process orders, and sync product data with your Shopify store.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop',
    tools: ['shopify']
  },
  {
    id: '6',
    name: 'Google Maps Locator',
    category: 'Location Services',
    rating: 4.5,
    installs: 3800,
    author: 'GeoTech Solutions',
    price: '$7.99',
    updated: '2024-01-05',
    description: 'Integrate location services, geocoding, and map features into your workflows.',
    image: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=400&h=200&fit=crop',
    tools: ['maps', 'google']
  }
];

export default function MarketplacePage() {
  const { user, loading } = useRequireAuth();
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Marketplace Component */}
        <MarketplaceView nexas={dummyNexas} />
      </div>
    </DashboardLayout>
  );
}
