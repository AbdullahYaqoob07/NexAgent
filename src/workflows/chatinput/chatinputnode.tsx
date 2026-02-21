'use client';

import { MessageCircle } from 'lucide-react';

interface ChatInputNodeProps {
  data: {
    label: string;
    nodeId: string;
    placeholder?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function ChatInputNode({ data, selected }: ChatInputNodeProps) {
  const isConfigured = data?.isConfigured ?? true;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-500/30'
          : isConfigured
            ? 'border-blue-300'
            : 'border-gray-300'
      } ${isConnecting ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <MessageCircle className={`w-5 h-5 ${isConfigured ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Chat Input'}</h3>
          <p className="text-xs text-gray-500">User input node</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Configured</span>
        )}
      </div>

      </div>
    </div>
  );
}
