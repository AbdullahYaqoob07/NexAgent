import React from 'react';
import { 
  siShopify, 
  siInstagram, 
  siFacebook, 
  siWhatsapp, 
  siOpenai,
  siSlack,
  siGmail,
  siMongodb,
  siGithub,
  siGoogle,
  siDiscord,
  siTelegram,
  siX, // Twitter is now X
  siZapier,
  siNotion,
  siAirtable,
  siHeroku,
  siVercel,
  siGooglecloud,
  siStripe,
  siPaypal
} from 'simple-icons';
import SimpleIconsLogo from '@/components/icons/brands/SimpleIconsLogo';

// Authentic brand logo components using Simple Icons
export const AuthenticShopifyLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siShopify} {...props} />
);

export const AuthenticInstagramLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo 
    icon={siInstagram} 
    customBackground="linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" 
    {...props} 
  />
);

export const AuthenticFacebookLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siFacebook} {...props} />
);

export const AuthenticWhatsAppLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siWhatsapp} {...props} />
);

export const AuthenticOpenAILogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siOpenai} {...props} />
);

export const AuthenticSlackLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siSlack} {...props} />
);

export const AuthenticGmailLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siGmail} {...props} />
);

export const AuthenticMongoDBLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siMongodb} {...props} />
);

export const AuthenticGitHubLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siGithub} {...props} />
);

export const AuthenticGoogleLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siGoogle} {...props} />
);

// Microsoft logo - using generic fallback since siMicrosoft doesn't exist
export const AuthenticMicrosoftLogo = (props: { size?: number; className?: string }) => (
  <div 
    className={`flex items-center justify-center ${props.className || ''}`}
    style={{
      width: props.size || 32,
      height: props.size || 32,
      borderRadius: '8px',
      backgroundColor: '#00BCF2',
    }}
  >
    <div style={{ color: 'white', fontSize: (props.size || 32) * 0.4, fontWeight: 'bold' }}>MS</div>
  </div>
);

export const AuthenticDiscordLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siDiscord} {...props} />
);

export const AuthenticTelegramLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siTelegram} {...props} />
);

export const AuthenticTwitterLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siX} {...props} />
);

// LinkedIn logo - using generic fallback since siLinkedin doesn't exist
export const AuthenticLinkedInLogo = (props: { size?: number; className?: string }) => (
  <div 
    className={`flex items-center justify-center ${props.className || ''}`}
    style={{
      width: props.size || 32,
      height: props.size || 32,
      borderRadius: '8px',
      backgroundColor: '#0077B5',
    }}
  >
    <div style={{ color: 'white', fontSize: (props.size || 32) * 0.4, fontWeight: 'bold' }}>in</div>
  </div>
);

export const AuthenticZapierLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siZapier} {...props} />
);

export const AuthenticNotionLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siNotion} {...props} />
);

export const AuthenticAirtableLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siAirtable} {...props} />
);

export const AuthenticStripeLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siStripe} {...props} />
);

export const AuthenticPayPalLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siPaypal} {...props} />
);

// AWS logo - using generic fallback since siAmazonaws doesn't exist
export const AuthenticAWSLogo = (props: { size?: number; className?: string }) => (
  <div 
    className={`flex items-center justify-center ${props.className || ''}`}
    style={{
      width: props.size || 32,
      height: props.size || 32,
      borderRadius: '8px',
      backgroundColor: '#FF9900',
    }}
  >
    <div style={{ color: 'white', fontSize: (props.size || 32) * 0.25, fontWeight: 'bold' }}>AWS</div>
  </div>
);

export const AuthenticGoogleCloudLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siGooglecloud} {...props} />
);

export const AuthenticVercelLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siVercel} {...props} />
);

export const AuthenticHerokuLogo = (props: { size?: number; className?: string }) => (
  <SimpleIconsLogo icon={siHeroku} {...props} />
);