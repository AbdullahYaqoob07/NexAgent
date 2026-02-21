'use client';

import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data?: {
    label?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  const isConfigured = data?.isConfigured ?? false;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-yellow-500 shadow-lg shadow-yellow-500/30'
          : isConfigured
            ? 'border-yellow-300'
            : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-yellow-100' : 'bg-gray-100'}`}>
          <Clock className={`w-5 h-5 ${isConfigured ? 'text-yellow-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Delay'}</h3>
          <p className="text-xs text-gray-500">Wait for duration</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Ready</span>
        )}
      </div>
    </div>
  );
}
