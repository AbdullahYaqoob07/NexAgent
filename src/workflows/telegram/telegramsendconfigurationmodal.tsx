'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { telegramSendConfigSchema, type TelegramSendConfig } from '@/lib/workflow/nodes/telegram/schema';
import { extractVariables, validateVariableSyntax } from '@/lib/workflow/utils/variableReplacer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info, X } from 'lucide-react';

interface TelegramSendConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TelegramSendConfig) => void;
  initialConfig?: Partial<TelegramSendConfig>;
  nodeName?: string;
}

export function TelegramSendConfigurationModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  nodeName = 'Telegram Send',
}: TelegramSendConfigurationModalProps) {
  const [messageVariables, setMessageVariables] = useState<string[]>([]);
  const [variableErrors, setVariableErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'configuration' | 'settings'>('configuration');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TelegramSendConfig>({
    resolver: zodResolver(telegramSendConfigSchema),
    defaultValues: {
      botToken: initialConfig?.botToken || '',
      chatId: initialConfig?.chatId || '',
      message: initialConfig?.message || '',
      parseMode: (initialConfig?.parseMode || 'HTML') as any,
      disableNotification: initialConfig?.disableNotification || false,
      protectContent: initialConfig?.protectContent || false,
    },
  });

  const message = watch('message');

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setValue('message', newMessage);

    const vars = extractVariables(newMessage);
    setMessageVariables(vars);

    const validation = validateVariableSyntax(newMessage);
    setVariableErrors(validation.errors);
  };

  const onSubmit = (data: TelegramSendConfig) => {
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
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <span className="text-lg">📱</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{nodeName}</h2>
              <p className="text-sm text-gray-400">TelegramSend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950">
          <button
            onClick={() => setActiveTab('configuration')}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'configuration'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'configuration' && (
            <>
              {/* Bot Token */}
              <div className="space-y-2">
                <Label htmlFor="botToken" className="font-semibold text-white">
                  Bot Token <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-400 mb-2">
                  Get from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a> on Telegram
                </p>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  {...register('botToken')}
                  className={`bg-gray-800 border-gray-700 text-white placeholder-gray-500 ${
                    errors.botToken ? 'border-red-500' : ''
                  }`}
                />
                {errors.botToken && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.botToken.message}
                  </p>
                )}
              </div>

              {/* Chat ID */}
              <div className="space-y-2">
                <Label htmlFor="chatId" className="font-semibold text-white">
                  Chat ID <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-400 mb-2">
                  Channel or user ID (negative numbers for group/channel)
                </p>
                <Input
                  id="chatId"
                  placeholder="-1001234567890"
                  {...register('chatId')}
                  className={`bg-gray-800 border-gray-700 text-white placeholder-gray-500 ${
                    errors.chatId ? 'border-red-500' : ''
                  }`}
                />
                {errors.chatId && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.chatId.message}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message" className="font-semibold text-white">
                  Message <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-400 mb-2">
                  Supports variables: {'{{$trigger.x}}'}, {'{{$node.id.x}}'}, {'{{$vars.x}}'}
                </p>
                <textarea
                  id="message"
                  placeholder="Hello {{$trigger.name}}! Your message here..."
                  rows={5}
                  {...register('message')}
                  onChange={handleMessageChange}
                  className={`w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.message ? 'border-red-500' : ''
                  }`}
                />
                {errors.message && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.message.message}
                  </p>
                )}

                {/* Character count */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{message.length} / 4096 characters</span>
                  {message.length > 3500 && (
                    <span className="text-orange-400">⚠ Approaching limit</span>
                  )}
                </div>

                {/* Variable Preview */}
                {messageVariables.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-100">Variables detected:</p>
                        <ul className="mt-1 text-xs text-blue-200 space-y-1">
                          {messageVariables.map((v, i) => (
                            <li key={i} className="font-mono">
                              {`{{${v}}}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Variable Errors */}
                {variableErrors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-100">Validation errors:</p>
                        <ul className="mt-1 text-xs text-red-200 space-y-1">
                          {variableErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Parse Mode */}
              <div className="space-y-2">
                <Label htmlFor="parseMode" className="font-semibold text-white">
                  Parse Mode
                </Label>
                <p className="text-xs text-gray-400 mb-2">
                  HTML for bold, italic, links, etc.
                </p>
                <select
                  {...register('parseMode')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="HTML">HTML (recommended)</option>
                  <option value="Markdown">Markdown</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <>
              {/* Disable Notification */}
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="disableNotification"
                  {...register('disableNotification')}
                  className="w-4 h-4 mt-1 accent-orange-500 cursor-pointer"
                />
                <div className="flex-1">
                  <Label htmlFor="disableNotification" className="font-semibold text-white cursor-pointer">
                    Disable Notification
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Send message silently without sound/vibration
                  </p>
                </div>
              </div>

              {/* Protect Content */}
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="protectContent"
                  {...register('protectContent')}
                  className="w-4 h-4 mt-1 accent-orange-500 cursor-pointer"
                />
                <div className="flex-1">
                  <Label htmlFor="protectContent" className="font-semibold text-white cursor-pointer">
                    Protect Content
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Prevent message from being forwarded or saved
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-sm text-blue-100">
                  <strong>📝 Tip:</strong> Use these settings to customize message behavior. Silent messages are useful for notifications without bothering users.
                </p>
              </div>
            </>
          )}
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
            disabled={isSubmitting || variableErrors.length > 0}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
