'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChatInputConfigFormProps {
  onSave: (config: any) => void;
  initialConfig?: any;
}

export function ChatInputConfigForm({
  onSave,
  initialConfig,
}: ChatInputConfigFormProps) {
  const [placeholder, setPlaceholder] = useState(
    initialConfig?.placeholder || 'Type your message here...'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      placeholder,
      maxLength: 4096,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="placeholder" className="font-medium">
          Placeholder Text
        </Label>
        <Input
          id="placeholder"
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          placeholder="Enter placeholder text..."
        />
        <p className="text-xs text-gray-500">
          Text shown when input is empty
        </p>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" className="flex-1">
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
