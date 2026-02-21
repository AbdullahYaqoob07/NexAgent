'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface StopperNodeProps {
  data?: {
    label?: string;
    isConfigured?: boolean;
    status?: 'success' | 'error' | 'warning';
  };
  selected?: boolean;
}

export function StopperNode({ data, selected }: StopperNodeProps) {
  const isConfigured = data?.isConfigured ?? false;
  const status = data?.status || 'success';

  const statusIcon = status === 'error' ? (
    <AlertCircle className={`w-5 h-5 ${isConfigured ? 'text-red-600' : 'text-gray-400'}`} />
  ) : (
    <CheckCircle2 className={`w-5 h-5 ${isConfigured ? 'text-green-600' : 'text-gray-400'}`} />
  );

  const bgColor = status === 'error' ? 'bg-red-100' : 'bg-green-100';
  const borderColor = status === 'error' ? 'border-red-300' : 'border-green-300';
  const selectedBorderColor = status === 'error' ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-green-500 shadow-lg shadow-green-500/30';

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected ? selectedBorderColor : borderColor
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? bgColor : 'bg-gray-100'}`}>
          {statusIcon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Stopper'}</h3>
          <p className="text-xs text-gray-500">Workflow completion checkpoint</p>
        </div>
        {isConfigured && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            status === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {status === 'error' ? '⚠️ Error' : '✓ Ready'}
          </span>
        )}
      </div>
    </div>
  );
}
