'use client';

import { FileText } from 'lucide-react';

interface LoggerNodeProps {
  data: {
    label: string;
    nodeId: string;
    logLevel?: 'info' | 'error' | 'warning';
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function LoggerNode({ data, selected }: LoggerNodeProps) {
  const isConfigured = data?.isConfigured ?? true;
  const logLevel = (data?.logLevel || 'info') as 'info' | 'error' | 'warning';

  const levelColors: Record<'info' | 'error' | 'warning', string> = {
    info: 'bg-purple-100 text-purple-600',
    error: 'bg-red-100 text-red-600',
    warning: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-purple-500 shadow-lg shadow-purple-500/30'
          : isConfigured
            ? 'border-purple-300'
            : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-purple-100' : 'bg-gray-100'}`}>
          <FileText className={`w-5 h-5 ${isConfigured ? 'text-purple-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Logger'}</h3>
          <p className="text-xs text-gray-500">Log output</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full capitalize ${levelColors[logLevel]}`}>
          {logLevel}
        </span>
      </div>
    </div>
  );
}
