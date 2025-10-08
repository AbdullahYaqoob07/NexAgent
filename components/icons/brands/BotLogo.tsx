import React from 'react';
const BotLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#8B5CF6"/>
    <rect x="8" y="10" width="16" height="14" rx="4" fill="white"/>
    <circle cx="12" cy="15" r="1.5" fill="#8B5CF6"/>
    <circle cx="20" cy="15" r="1.5" fill="#8B5CF6"/>
    <path d="M14 19h4" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
    <rect x="15" y="6" width="2" height="4" fill="white"/>
  </svg>
);
export default BotLogo;