import React from 'react';

interface TripleForkLogoProps {
  size?: number;
  className?: string;
}

const TripleForkLogo: React.FC<TripleForkLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: '#0EA5E9',
      }}
    >
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
      >
        {/* Main input line */}
        <path
          d="M2 12h8"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Fork junction */}
        <circle
          cx="10"
          cy="12"
          r="2"
          fill="white"
        />
        
        {/* Upper branch */}
        <path
          d="M12 8l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Middle branch */}
        <path
          d="M12 12l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Lower branch */}
        <path
          d="M12 16l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Output dots */}
        <circle cx="20" cy="8" r="1.5" fill="white"/>
        <circle cx="20" cy="12" r="1.5" fill="white"/>
        <circle cx="20" cy="16" r="1.5" fill="white"/>
        
        {/* Branch lines from junction to outputs */}
        <path
          d="M10 12L12 8"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12L12 12"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12L12 16"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default TripleForkLogo;