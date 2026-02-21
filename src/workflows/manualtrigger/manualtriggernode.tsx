'use client';

import { Zap } from 'lucide-react';

interface ManualTriggerNodeProps {
  data?: {
    label?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function ManualTriggerNode({ data, selected }: ManualTriggerNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-500/30'
          : 'border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100">
          <Zap className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Manual Trigger'}</h3>
          <p className="text-xs text-gray-500">Start workflow manually</p>
        </div>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">🟢 Trigger</span>
      </div>
    </div>
  );
}
