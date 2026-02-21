'use client';

import { Send } from 'lucide-react';

interface TelegramSendNodeProps {
  data: {
    label: string;
    nodeId: string;
    botToken?: string;
    chatId?: string;
    isConfigured?: boolean;
  };
  selected?: boolean;
}

export function TelegramSendNode({ data, selected }: TelegramSendNodeProps) {
  const isConfigured = data?.isConfigured ?? false;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-orange-500 shadow-lg shadow-orange-500/30'
          : isConfigured
            ? 'border-orange-300'
            : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-orange-100' : 'bg-gray-100'}`}>
          <Send className={`w-5 h-5 ${isConfigured ? 'text-orange-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data?.label || 'Telegram Send'}</h3>
          <p className="text-xs text-gray-500">Send message to Telegram</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Ready</span>
        )}
        {!isConfigured && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">⚠ Configure</span>
        )}
      </div>
    </div>
  );
}
