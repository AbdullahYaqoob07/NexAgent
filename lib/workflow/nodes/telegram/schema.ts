import { z } from 'zod';

export const telegramSendConfigSchema = z.object({
  botToken: z.string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format. Get from @BotFather'),

  chatId: z.string()
    .min(1, 'Chat ID is required')
    .regex(/^-?\d+$/, 'Chat ID must be a number (e.g., -100123456789)'),

  message: z.string()
    .min(1, 'Message is required')
    .max(4096, 'Message must be less than 4096 characters'),

  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML').optional(),

  disableNotification: z.boolean().default(false).optional(),

  protectContent: z.boolean().default(false).optional(),
});

export type TelegramSendConfig = z.infer<typeof telegramSendConfigSchema>;
