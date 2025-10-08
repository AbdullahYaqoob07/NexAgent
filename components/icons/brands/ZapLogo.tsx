import React from 'react';
const ZapLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#F59E0B"/>
    <path d="M18 6L8 16h6l-2 10 10-10h-6l2-10z" fill="white"/>
  </svg>
);
export default ZapLogo;