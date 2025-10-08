import React from 'react';

interface DefaultLogoProps {
  size?: number;
  className?: string;
}

const DefaultLogo: React.FC<DefaultLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#6B7280"/>
      <circle cx="16" cy="12" r="3" stroke="white" strokeWidth="2" fill="none"/>
      <path
        d="M10 20v-2c0-3.3 2.7-6 6-6s6 2.7 6 6v2"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default DefaultLogo;