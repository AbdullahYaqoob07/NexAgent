import React from 'react';
const CodeLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#6366F1"/>
    <path d="M10 12l-4 4 4 4M22 12l4 4-4 4M18 8l-4 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export default CodeLogo;