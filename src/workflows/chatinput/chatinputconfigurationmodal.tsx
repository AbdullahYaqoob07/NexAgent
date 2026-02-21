'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Info } from 'lucide-react';

interface ChatInputConfig {
  label: string;
  placeholder?: string;
}

interface ChatInputConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ChatInputConfig) => void;
  initialConfig?: Partial<ChatInputConfig>;
  nodeName?: string;
}

export function ChatInputConfigurationModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  nodeName = 'Chat Input',
}: ChatInputConfigurationModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChatInputConfig>({
    defaultValues: {
      label: initialConfig?.label || 'Chat Input',
      placeholder: initialConfig?.placeholder || 'Type your message here...',
    },
  });

  const onSubmit = (data: ChatInputConfig) => {
    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{nodeName}</h2>
              <p className="text-sm text-gray-400">ChatInput</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label" className="font-semibold text-white">
              Node Label <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-400 mb-2">
              Display name for this node in the canvas
            </p>
            <Input
              id="label"
              placeholder="e.g., User Message, Chat Message"
              {...register('label', { required: 'Label is required' })}
              className={`bg-gray-800 border-gray-700 text-white placeholder-gray-500 ${
                errors.label ? 'border-red-500' : ''
              }`}
            />
            {errors.label && (
              <p className="text-sm text-red-400">{errors.label.message}</p>
            )}
          </div>

          {/* Placeholder */}
          <div className="space-y-2">
            <Label htmlFor="placeholder" className="font-semibold text-white">
              Placeholder Text
            </Label>
            <p className="text-xs text-gray-400 mb-2">
              Hint text shown to users before they type
            </p>
            <Input
              id="placeholder"
              placeholder="Type message here..."
              {...register('placeholder')}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-100">
                  <strong>📝 Variables:</strong> The output of this node can be accessed as{' '}
                  <code className="font-mono bg-blue-900/50 px-2 py-1 rounded">{'{{$node.{nodeId}.message}}'}</code>
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800 bg-gray-950">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
