import { 
  ShopifyLogo,
  InstagramLogo,
  FacebookLogo,
  WhatsAppLogo,
  OpenAILogo,
  SlackLogo,
  EmailLogo,
  DatabaseLogo,
  WebhookLogo,
  ScheduleLogo,
  HttpLogo,
  GitBranchLogo,
  FilterLogo,
  CodeLogo,
  BotLogo,
  FileLogo,
  ZapLogo,
  DefaultLogo,
  DoubleForkLogo,
  TripleForkLogo,
  QuadraForkLogo,
  CustomForkLogo
} from '@/components/icons/brands';
import {
  AuthenticShopifyLogo,
  AuthenticInstagramLogo,
  AuthenticFacebookLogo,
  AuthenticWhatsAppLogo,
  AuthenticOpenAILogo,
  AuthenticSlackLogo,
  AuthenticGmailLogo,
  AuthenticMongoDBLogo,
  AuthenticGitHubLogo,
  AuthenticGoogleLogo,
  AuthenticMicrosoftLogo,
  AuthenticDiscordLogo,
  AuthenticTelegramLogo,
  AuthenticTwitterLogo,
  AuthenticLinkedInLogo,
  AuthenticZapierLogo,
  AuthenticNotionLogo,
  AuthenticAirtableLogo,
  AuthenticStripeLogo,
  AuthenticPayPalLogo,
  AuthenticAWSLogo,
  AuthenticGoogleCloudLogo,
  AuthenticVercelLogo,
  AuthenticHerokuLogo
} from '@/lib/workflow/utils/AuthenticBrandLogos';
import React from 'react';

interface BrandLogoMapping {
  nodeType: string;
  logo: React.ComponentType<{ size?: number; className?: string }>;
  brandColor: string;
}

/**
 * Mapping of node types to their brand logos and colors
 */
export const BRAND_LOGO_MAPPINGS: BrandLogoMapping[] = [
  // E-commerce - Using authentic logos
  { nodeType: 'Shopify', logo: AuthenticShopifyLogo, brandColor: '#96BF48' },
  { nodeType: 'Instagram', logo: AuthenticInstagramLogo, brandColor: '#E1306C' },
  { nodeType: 'Facebook', logo: AuthenticFacebookLogo, brandColor: '#1877F2' },
  { nodeType: 'WhatsApp', logo: AuthenticWhatsAppLogo, brandColor: '#25D366' },
  
  // AI/ML - Using authentic logos where available
  { nodeType: 'OpenAI', logo: AuthenticOpenAILogo, brandColor: '#000000' },
  { nodeType: 'Text Analysis', logo: BotLogo, brandColor: '#8B5CF6' },
  { nodeType: 'Image Processing', logo: BotLogo, brandColor: '#8B5CF6' },
  { nodeType: 'Data Transform', logo: CodeLogo, brandColor: '#6366F1' },
  
  // Communications - Using authentic logos
  { nodeType: 'Slack', logo: AuthenticSlackLogo, brandColor: '#4A154B' },
  { nodeType: 'Email', logo: AuthenticGmailLogo, brandColor: '#EA4335' },
  { nodeType: 'Email Trigger', logo: AuthenticGmailLogo, brandColor: '#EA4335' },
  { nodeType: 'Discord', logo: AuthenticDiscordLogo, brandColor: '#5865F2' },
  { nodeType: 'Telegram', logo: AuthenticTelegramLogo, brandColor: '#26A5E4' },
  { nodeType: 'Twitter', logo: AuthenticTwitterLogo, brandColor: '#1DA1F2' },
  
  // Data & Storage - Using authentic logos
  { nodeType: 'Database', logo: AuthenticMongoDBLogo, brandColor: '#47A248' },
  { nodeType: 'Database Trigger', logo: AuthenticMongoDBLogo, brandColor: '#47A248' },
  { nodeType: 'Save', logo: FileLogo, brandColor: '#64748B' },
  { nodeType: 'File Operation', logo: FileLogo, brandColor: '#64748B' },
  { nodeType: 'File Watch', logo: FileLogo, brandColor: '#64748B' },
  
  // Cloud & Hosting - Adding new authentic services
  { nodeType: 'AWS', logo: AuthenticAWSLogo, brandColor: '#FF9900' },
  { nodeType: 'Google Cloud', logo: AuthenticGoogleCloudLogo, brandColor: '#4285F4' },
  { nodeType: 'Vercel', logo: AuthenticVercelLogo, brandColor: '#000000' },
  { nodeType: 'Heroku', logo: AuthenticHerokuLogo, brandColor: '#430098' },
  
  // Productivity - Adding new authentic services
  { nodeType: 'Notion', logo: AuthenticNotionLogo, brandColor: '#000000' },
  { nodeType: 'Airtable', logo: AuthenticAirtableLogo, brandColor: '#18BFFF' },
  { nodeType: 'Zapier', logo: AuthenticZapierLogo, brandColor: '#FF4A00' },
  
  // Payment & Finance - Adding new authentic services
  { nodeType: 'Stripe', logo: AuthenticStripeLogo, brandColor: '#635BFF' },
  { nodeType: 'PayPal', logo: AuthenticPayPalLogo, brandColor: '#00457C' },
  
  // Development - Adding new authentic services
  { nodeType: 'GitHub', logo: AuthenticGitHubLogo, brandColor: '#181717' },
  { nodeType: 'Google', logo: AuthenticGoogleLogo, brandColor: '#4285F4' },
  { nodeType: 'Microsoft', logo: AuthenticMicrosoftLogo, brandColor: '#5E5E5E' },
  
  // Logic & Control - Keeping generic logos
  { nodeType: 'If', logo: GitBranchLogo, brandColor: '#10B981' },
  { nodeType: 'Switch', logo: FilterLogo, brandColor: '#EF4444' },
  { nodeType: 'Loop', logo: CodeLogo, brandColor: '#6366F1' },
  { nodeType: 'Merge', logo: GitBranchLogo, brandColor: '#10B981' },
  { nodeType: 'Delay', logo: ScheduleLogo, brandColor: '#8B5CF6' },
  
  // Triggers - Keeping generic logos
  { nodeType: 'HTTP Request', logo: HttpLogo, brandColor: '#4F46E5' },
  { nodeType: 'Schedule', logo: ScheduleLogo, brandColor: '#8B5CF6' },
  { nodeType: 'Webhook', logo: WebhookLogo, brandColor: '#F59E0B' },
  { nodeType: 'On Clicking Execute', logo: ZapLogo, brandColor: '#F59E0B' },
  
  // Data Processing - Keeping generic logos
  { nodeType: 'JSON Parse', logo: CodeLogo, brandColor: '#6366F1' },
  { nodeType: 'XML Parse', logo: CodeLogo, brandColor: '#6366F1' },
  { nodeType: 'CSV Parse', logo: CodeLogo, brandColor: '#6366F1' },
  { nodeType: 'Data Filter', logo: FilterLogo, brandColor: '#EF4444' },
  
  // Fork nodes - Using beautiful visual fork logos
  { nodeType: 'Double', logo: DoubleForkLogo, brandColor: '#10B981' },
  { nodeType: 'Triple', logo: TripleForkLogo, brandColor: '#0EA5E9' },
  { nodeType: 'Quadra', logo: QuadraForkLogo, brandColor: '#8B5CF6' },
  { nodeType: 'Custom', logo: CustomForkLogo, brandColor: '#F59E0B' }
];

/**
 * Get the brand logo component for a given node type
 */
export const getBrandLogo = (nodeType: string): React.ComponentType<{ size?: number; className?: string }> => {
  const mapping = BRAND_LOGO_MAPPINGS.find(m => m.nodeType === nodeType);
  return mapping?.logo || DefaultLogo;
};

/**
 * Get the brand color for a given node type
 */
export const getBrandColor = (nodeType: string): string => {
  const mapping = BRAND_LOGO_MAPPINGS.find(m => m.nodeType === nodeType);
  return mapping?.brandColor || '#6B7280';
};

/**
 * Check if a node type has a custom brand logo
 */
export const hasBrandLogo = (nodeType: string): boolean => {
  return BRAND_LOGO_MAPPINGS.some(m => m.nodeType === nodeType);
};

/**
 * Get all available brand logos (useful for testing or UI previews)
 */
export const getAllBrandLogos = (): BrandLogoMapping[] => {
  return BRAND_LOGO_MAPPINGS;
};