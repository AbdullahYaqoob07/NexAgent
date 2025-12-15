'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { siStripe } from 'simple-icons';
import SimpleIconsLogo from '@/components/icons/brands/SimpleIconsLogo';

export type PaymentMethod = 'stripe' | 'easypaisa' | 'jazzcash' | 'sadapay';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

interface PaymentMethodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMethod: (method: PaymentMethod) => void;
  amount: number;
  nexaName: string;
}

function BrandBadge({ label, color, subColor }: { label: string; color: string; subColor?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg px-3 py-2 text-white font-semibold tracking-wide uppercase shadow-sm"
      style={{
        background: subColor
          ? `linear-gradient(135deg, ${color} 0%, ${subColor} 100%)`
          : color,
      }}
    >
      {label}
    </div>
  );
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Credit & Debit Cards',
    icon: <SimpleIconsLogo icon={siStripe} size={32} whiteIcon={false} />,
    color: '#635BFF',
    bgGradient: 'from-purple-600/20 to-blue-600/20',
  },
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    description: 'Mobile Wallet',
    icon: <BrandBadge label="ep" color="#00A651" subColor="#00C26F" />,
    color: '#00A651',
    bgGradient: 'from-green-600/20 to-emerald-600/20',
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    description: 'Mobile Wallet',
    icon: <BrandBadge label="JC" color="#E51C23" subColor="#FBC02D" />,
    color: '#F7931E',
    bgGradient: 'from-amber-500/20 to-orange-600/20',
  },
  {
    id: 'sadapay',
    name: 'SadaPay',
    description: 'Digital Wallet',
    icon: <BrandBadge label="SP" color="#00C2F3" subColor="#00E0FF" />,
    color: '#00C2F3',
    bgGradient: 'from-cyan-500/20 to-blue-500/20',
  },
];

export default function PaymentMethodSelector({
  open,
  onOpenChange,
  onSelectMethod,
  amount,
  nexaName,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handleSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    onSelectMethod(method);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1410]/95 backdrop-blur-xl border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Select Payment Method
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Choose your preferred payment method for <span className="font-semibold text-white">{nexaName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Display */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-white/80">Total Amount</span>
              <span className="text-2xl font-bold text-[#FF6900]">
                ${(amount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleSelect(method.id)}
                className={`
                  relative group
                  bg-[#1a1410] border-2 rounded-xl p-6
                  transition-all duration-200
                  hover:border-[#FF6900]/50 hover:bg-white/5
                  focus:outline-none focus:ring-2 focus:ring-[#FF6900]/50 focus:ring-offset-2 focus:ring-offset-[#1a1410]
                  ${selectedMethod === method.id ? 'border-[#FF6900] bg-[#FF6900]/10' : 'border-white/10'}
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${method.bgGradient} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-200`} />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                  {/* Icon */}
                  <div 
                    className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
                    style={{ color: method.color }}
                  >
                    {method.icon}
                  </div>
                  
                  {/* Name */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {method.name}
                    </h3>
                    <p className="text-sm text-white/60">
                      {method.description}
                    </p>
                  </div>
                </div>

                {/* Selected Indicator */}
                {selectedMethod === method.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-[#FF6900] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/60 pt-4 border-t border-white/10">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>All payments are secured and encrypted</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

