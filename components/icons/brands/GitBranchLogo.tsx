import React from 'react';

const GitBranchLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#10B981"/>
      <circle cx="10" cy="10" r="3" fill="white"/>
      <circle cx="22" cy="10" r="3" fill="white"/>
      <circle cx="16" cy="22" r="3" fill="white"/>
      <path d="M10 13v3c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4v-3" stroke="white" strokeWidth="2"/>
    </svg>
  );
};

export default GitBranchLogo;