'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { telegramSendConfigSchema, type TelegramSendConfig } from '@/lib/workflow/nodes/telegram/schema';
import { extractVariables, validateVariableSyntax } from '@/lib/workflow/utils/variableReplacer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info } from 'lucide-react';

interface TelegramSendConfigFormProps {
  onSave: (config: TelegramSendConfig) => void;
  initialConfig?: Partial<TelegramSendConfig>;
}

export function TelegramSendConfigForm({
  onSave,
  initialConfig,
}: TelegramSendConfigFormProps) {
  const [messageVariables, setMessageVariables] = useState<string[]>([]);
  const [variableErrors, setVariableErrors] = useState<string[]>([]);

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

  // Update variable preview when message changes
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
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      {/* Bot Token */}
      <div className="space-y-2">
        <Label htmlFor="botToken" className="font-medium">
          Bot Token <span className="text-red-500">*</span>
        </Label>
        <Input
          id="botToken"
          type="password"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          {...register('botToken')}
          className={`${errors.botToken ? 'border-red-500' : ''}`}
        />
        {errors.botToken && (
          <p className="text-sm text-red-500">{errors.botToken.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Get from{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            @BotFather
          </a>
        </p>
      </div>

      {/* Chat ID */}
      <div className="space-y-2">
        <Label htmlFor="chatId" className="font-medium">
          Chat ID <span className="text-red-500">*</span>
        </Label>
        <Input
          id="chatId"
          placeholder="-1001234567890"
          {...register('chatId')}
          className={`${errors.chatId ? 'border-red-500' : ''}`}
        />
        {errors.chatId && (
          <p className="text-sm text-red-500">{errors.chatId.message}</p>
        )}
        <p className="text-xs text-gray-500">
          Channel ID (negative) or user ID
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="font-medium">
          Message <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="message"
          placeholder="Hello {{$trigger.name}}!"
          rows={5}
          {...register('message')}
          onChange={handleMessageChange}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
            errors.message ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.message && (
          <p className="text-sm text-red-500">{errors.message.message}</p>
        )}

        {/* Variable Preview */}
        {messageVariables.length > 0 && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Variables detected:</p>
                <ul className="mt-1 text-xs text-blue-800 space-y-1">
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
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Errors:</p>
                <ul className="mt-1 text-xs text-red-800 space-y-1">
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
        <Label htmlFor="parseMode" className="font-medium">
          Parse Mode
        </Label>
        <select
          {...register('parseMode')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="HTML">HTML</option>
          <option value="Markdown">Markdown</option>
          <option value="MarkdownV2">MarkdownV2</option>
        </select>
        <p className="text-xs text-gray-500">
          Format for bold, italic, links, etc.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || variableErrors.length > 0}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </form>
  );
}
