'use client';

import { CreditCard } from 'lucide-react';

interface StripeNodeProps {
  data?: {
    label?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function StripeNode({ data, selected }: StripeNodeProps) {
  const isConfigured = data?.isConfigured ?? false;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/30'
          : isConfigured
            ? 'border-indigo-300'
            : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-indigo-100' : 'bg-gray-100'}`}>
          <CreditCard className={`w-5 h-5 ${isConfigured ? 'text-indigo-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Stripe'}</h3>
          <p className="text-xs text-gray-500">Handle payments</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Ready</span>
        )}
      </div>
    </div>
  );
}
