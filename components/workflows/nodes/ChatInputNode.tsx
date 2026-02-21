'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputNodeProps {
  onMessageChange: (message: string) => void;
  initialMessage?: string;
}

export function ChatInputNode({
  onMessageChange,
  initialMessage = '',
}: ChatInputNodeProps) {
  const [message, setMessage] = useState(initialMessage);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    onMessageChange(newMessage);
  };

  return (
    <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Message to Send
        </label>
        <textarea
          value={message}
          onChange={handleChange}
          placeholder="Enter your message here..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-normal text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">
          {message.length} / 4096 characters
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-xs text-blue-900">
          <strong>📝 Preview:</strong> This message will be sent to your Telegram bot channel
        </p>
      </div>
    </div>
  );
}
