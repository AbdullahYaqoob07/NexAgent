import React from 'react';

interface HttpLogoProps {
  size?: number;
  className?: string;
}

const HttpLogo: React.FC<HttpLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#4F46E5"/>
      <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="2" fill="none"/>
      <path
        d="M6 16h20M16 6c5 0 9 4.5 9 10s-4 10-9 10c-5 0-9-4.5-9-10s4-10 9-10z"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
};

export default HttpLogo;