import React from 'react';

const WebhookLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#F59E0B"/>
      <path d="M16 6l6 4-6 4-6-4 6-4z" fill="white"/>
      <path d="M10 14v8l6-4v-8l-6 4z" fill="white" fillOpacity="0.8"/>
      <path d="M22 14v8l-6-4v-8l6 4z" fill="white" fillOpacity="0.6"/>
    </svg>
  );
};

export default WebhookLogo;