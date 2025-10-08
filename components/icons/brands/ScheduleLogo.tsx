import React from 'react';

const ScheduleLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#8B5CF6"/>
      <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M16 10v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

export default ScheduleLogo;