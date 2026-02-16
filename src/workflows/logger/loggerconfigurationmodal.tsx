'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Info } from 'lucide-react';

interface LoggerConfig {
  label: string;
  logLevel?: 'info' | 'error' | 'warning';
  fields?: string[];
}

interface LoggerConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LoggerConfig) => void;
  initialConfig?: Partial<LoggerConfig>;
  nodeName?: string;
}

export function LoggerConfigurationModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  nodeName = 'Logger',
}: LoggerConfigurationModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoggerConfig>({
    defaultValues: {
      label: initialConfig?.label || 'Logger',
      logLevel: initialConfig?.logLevel || 'info',
      fields: initialConfig?.fields || ['message'],
    },
  });

  const logLevel = watch('logLevel');

  const onSubmit = (data: LoggerConfig) => {
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
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{nodeName}</h2>
              <p className="text-sm text-gray-400">Logger</p>
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
              Display name for this logger node
            </p>
            <Input
              id="label"
              placeholder="e.g., Log Output, Save Results"
              {...register('label', { required: 'Label is required' })}
              className={`bg-gray-800 border-gray-700 text-white placeholder-gray-500 ${
                errors.label ? 'border-red-500' : ''
              }`}
            />
            {errors.label && (
              <p className="text-sm text-red-400">{errors.label.message}</p>
            )}
          </div>

          {/* Log Level */}
          <div className="space-y-2">
            <Label htmlFor="logLevel" className="font-semibold text-white">
              Log Level
            </Label>
            <p className="text-xs text-gray-400 mb-2">
              Severity level for logs
            </p>
            <select
              {...register('logLevel')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="error">❌ Error</option>
            </select>
          </div>

          {/* Log Level Description */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-300">
              {logLevel === 'info' && '📝 Informational logs for debugging'}
              {logLevel === 'warning' && '⚠️ Warning logs for potential issues'}
              {logLevel === 'error' && '❌ Error logs for system failures'}
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg space-y-2">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-100 font-semibold mb-2">
                  💡 How to use Logger:
                </p>
                <ul className="text-xs text-blue-200 space-y-2 list-disc list-inside">
                  <li>Connect this node to the end of your workflow</li>
                  <li>Use it to store or display workflow outputs</li>
                  <li>Reference variables like: {'{{$node.chatInput.message}}'}</li>
                  <li>Useful for testing and debugging workflows</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test & Output Note */}
          <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg text-xs text-purple-100">
            <strong>📊 Note:</strong> Logs will be visible in the Test & Output section when you run the workflow.
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
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
