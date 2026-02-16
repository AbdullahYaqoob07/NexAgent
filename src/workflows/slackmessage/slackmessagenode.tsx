'use client';

import { MessageSquare } from 'lucide-react';

interface SlackMessageNodeProps {
  data?: {
    label?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function SlackMessageNode({ data, selected }: SlackMessageNodeProps) {
  const isConfigured = data?.isConfigured ?? false;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-amber-500 shadow-lg shadow-amber-500/30'
          : isConfigured
            ? 'border-amber-300'
            : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-amber-100' : 'bg-gray-100'}`}>
          <MessageSquare className={`w-5 h-5 ${isConfigured ? 'text-amber-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Slack Message'}</h3>
          <p className="text-xs text-gray-500">Send Slack message</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Ready</span>
        )}
      </div>
    </div>
  );
}
