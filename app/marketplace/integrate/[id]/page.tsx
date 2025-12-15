'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, CheckCircle, Shield, Zap, Star, Plug } from 'lucide-react';
import Link from 'next/link';
import PaymentModal from '@/components/marketplace/PaymentModal';
import PaymentMethodSelector, { PaymentMethod } from '@/components/marketplace/PaymentMethodSelector';
import EasyPaisaPaymentModal from '@/components/marketplace/EasyPaisaPaymentModal';
import JazzcashPaymentModal from '@/components/marketplace/JazzcashPaymentModal';
import SadapayPaymentModal from '@/components/marketplace/SadapayPaymentModal';

export default function IntegratePage() {
  const params = useParams();
  const router = useRouter();
  const nexaId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [nexa, setNexa] = useState<any>(null);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showEasyPaisaModal, setShowEasyPaisaModal] = useState(false);
  const [showJazzcashModal, setShowJazzcashModal] = useState(false);
  const [showSadapayModal, setShowSadapayModal] = useState(false);

  useEffect(() => {
    // Fetch NEXA data - using the same data from marketplace
    const nexasData = [
      {
        id: '1',
        name: 'Google Sheets Automation',
        category: 'Data Processing',
        rating: 4.8,
        installs: 12500,
        author: 'NexAgent Team',
        price: 'Free',
        priceAmount: 0,
        description: 'Automatically sync data between Google Sheets and your workflows. Perfect for data analysis and reporting.',
        image: '/assets/dashboard/market-excel.svg',
        features: [
          'Unlimited Google Sheets connections',
          'Real-time data synchronization',
          'Custom workflow triggers',
          'Advanced filtering options',
          'Export and import capabilities',
          'Community support'
        ]
      },
      {
        id: '2',
        name: 'Slack Integration Hub',
        category: 'Communication',
        rating: 4.6,
        installs: 8900,
        author: 'DevCorp',
        price: '$9.99',
        priceAmount: 999,
        description: 'Send notifications, create channels, and manage team communication directly from your workflows.',
        image: '/assets/dashboard/market-slack.svg',
        features: [
          'Send messages and notifications',
          'Create and manage channels',
          'Bot integration included',
          'Slash commands support',
          'Team collaboration tools',
          'Priority email support'
        ]
      },
      {
        id: '3',
        name: 'OpenAI Content Generator',
        category: 'AI & ML',
        rating: 4.9,
        installs: 15600,
        author: 'AI Solutions',
        price: '$19.99',
        priceAmount: 1999,
        description: 'Generate high-quality content using OpenAI\'s GPT models. Perfect for marketing and content creation.',
        image: '/assets/dashboard/market-gpt.svg',
        features: [
          'Access to GPT-4 models',
          'Content generation templates',
          'Multi-language support',
          'Custom prompts',
          'API access included',
          '24/7 priority support'
        ]
      },
      {
        id: '4',
        name: 'JSON Data Processor',
        category: 'Data Processing',
        rating: 4.4,
        installs: 6700,
        author: 'DataFlow Inc',
        price: 'Free',
        priceAmount: 0,
        description: 'Parse, transform, and validate JSON data in your workflows with ease.',
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop',
        features: [
          'JSON parsing and validation',
          'Data transformation tools',
          'Schema validation',
          'Error handling',
          'Documentation included',
          'Community support'
        ]
      },
      {
        id: '5',
        name: 'Shopify Store Manager',
        category: 'E-commerce',
        rating: 4.7,
        installs: 4200,
        author: 'E-commerce Pro',
        price: '$14.99',
        priceAmount: 1499,
        description: 'Manage inventory, process orders, and sync product data with your Shopify store.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop',
        features: [
          'Inventory management',
          'Order processing automation',
          'Product sync',
          'Customer data integration',
          'Analytics dashboard',
          'Email support'
        ]
      },
      {
        id: '6',
        name: 'Google Maps Locator',
        category: 'Location Services',
        rating: 4.5,
        installs: 3800,
        author: 'GeoTech Solutions',
        price: '$7.99',
        priceAmount: 799,
        description: 'Integrate location services, geocoding, and map features into your workflows.',
        image: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=400&h=200&fit=crop',
        features: [
          'Geocoding and reverse geocoding',
          'Distance calculations',
          'Map rendering',
          'Place search',
          'Route planning',
          'Standard support'
        ]
      }
    ];
    
    const foundNexa = nexasData.find(n => n.id === nexaId);
    if (foundNexa) {
      setNexa(foundNexa);
    } else {
      router.push('/marketplace');
    }
  }, [nexaId, router]);

  const handlePayment = async () => {
    // If the NEXA is free, skip payment and activate directly
    if (nexa.priceAmount === 0 || nexa.price === 'Free') {
      try {
        setLoading(true);
        // TODO: Activate the integration in your backend
        router.push(`/marketplace/success?nexa_id=${nexa.id}&free=true`);
      } catch (error: any) {
        console.error('Activation error:', error);
        alert(error.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Show payment method selector for paid Nexas
    setShowPaymentMethodSelector(true);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowPaymentMethodSelector(false);
    
    // Show the appropriate payment modal based on selection
    switch (method) {
      case 'stripe':
        setShowStripeModal(true);
        break;
      case 'easypaisa':
        setShowEasyPaisaModal(true);
        break;
      case 'jazzcash':
        setShowJazzcashModal(true);
        break;
      case 'sadapay':
        setShowSadapayModal(true);
        break;
    }
  };

  const handlePaymentSuccess = async (transactionId: string, method: PaymentMethod) => {
    try {
      // TODO: Verify payment and activate the integration in your backend
      // You can call your backend API here to confirm the purchase
      router.push(`/marketplace/success?nexa_id=${nexa.id}&transaction_id=${transactionId}&method=${method}`);
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      alert('Payment succeeded but activation failed. Please contact support.');
    }
  };

  if (!nexa) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/marketplace" 
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Complete Your Integration</h1>
          <p className="text-white/70 text-lg">Integrate {nexa.name} into your workflow</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NEXA Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* NEXA Card */}
            <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
              <div className="relative h-48 w-full flex items-center justify-center overflow-hidden">
                <img src={nexa.image} alt={nexa.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{nexa.name}</h2>
                    <p className="text-white/60">{nexa.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/80">{nexa.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Plug className="w-4 h-4 text-white/60" />
                    <span className="text-white/60">{nexa.installs.toLocaleString()} integrations</span>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-white/5 text-white/70 text-xs">
                    {nexa.category}
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">What's Included</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nexa.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-white/80 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1410]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 sticky top-6 space-y-6">
              <h3 className="text-xl font-bold text-white">Order Summary</h3>
              
              <div className="space-y-3 py-4 border-y border-white/5">
                <div className="flex justify-between text-white/80">
                  <span>NEXA Price</span>
                  <span className="font-semibold">{nexa.price}</span>
                </div>
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Processing Fee</span>
                  <span>$0.00</span>
                </div>
              </div>

              <div className="flex justify-between text-lg">
                <span className="text-white font-bold">Total</span>
                <span className="text-[#FF6900] font-bold">{nexa.price}</span>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-[#FF6900] hover:bg-[#FF6900]/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 
                 nexa.price === 'Free' ? 'Activate Integration' : 'Proceed to Payment'}
              </button>

              <div className="space-y-3 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Secure payment with Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FF6900]" />
                  <span>Instant activation after payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>

              <p className="text-xs text-white/40 text-center">
                By proceeding, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selector */}
      {nexa && nexa.priceAmount > 0 && (
        <PaymentMethodSelector
          open={showPaymentMethodSelector}
          onOpenChange={setShowPaymentMethodSelector}
          onSelectMethod={handlePaymentMethodSelect}
          amount={nexa.priceAmount}
          nexaName={nexa.name}
        />
      )}

      {/* Stripe Payment Modal */}
      {nexa && nexa.priceAmount > 0 && (
        <PaymentModal
          open={showStripeModal}
          onOpenChange={setShowStripeModal}
          nexaId={nexa.id}
          nexaName={nexa.name}
          amount={nexa.priceAmount}
          onSuccess={(paymentIntentId) => handlePaymentSuccess(paymentIntentId, 'stripe')}
        />
      )}

      {/* EasyPaisa Payment Modal */}
      {nexa && nexa.priceAmount > 0 && (
        <EasyPaisaPaymentModal
          open={showEasyPaisaModal}
          onOpenChange={setShowEasyPaisaModal}
          nexaId={nexa.id}
          nexaName={nexa.name}
          amount={nexa.priceAmount}
          onSuccess={(transactionId) => handlePaymentSuccess(transactionId, 'easypaisa')}
        />
      )}

      {/* JazzCash Payment Modal */}
      {nexa && nexa.priceAmount > 0 && (
        <JazzcashPaymentModal
          open={showJazzcashModal}
          onOpenChange={setShowJazzcashModal}
          nexaId={nexa.id}
          nexaName={nexa.name}
          amount={nexa.priceAmount}
          onSuccess={(transactionId) => handlePaymentSuccess(transactionId, 'jazzcash')}
        />
      )}

      {/* SadaPay Payment Modal */}
      {nexa && nexa.priceAmount > 0 && (
        <SadapayPaymentModal
          open={showSadapayModal}
          onOpenChange={setShowSadapayModal}
          nexaId={nexa.id}
          nexaName={nexa.name}
          amount={nexa.priceAmount}
          onSuccess={(transactionId) => handlePaymentSuccess(transactionId, 'sadapay')}
        />
      )}
    </DashboardLayout>
  );
}

