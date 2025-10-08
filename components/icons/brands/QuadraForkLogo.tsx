import React from 'react';

interface QuadraForkLogoProps {
  size?: number;
  className?: string;
}

const QuadraForkLogo: React.FC<QuadraForkLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: '#8B5CF6',
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
        
        {/* Top branch */}
        <path
          d="M12 7l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Upper middle branch */}
        <path
          d="M12 10l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Lower middle branch */}
        <path
          d="M12 14l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Bottom branch */}
        <path
          d="M12 17l10 0"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        
        {/* Output dots */}
        <circle cx="20" cy="7" r="1.5" fill="white"/>
        <circle cx="20" cy="10" r="1.5" fill="white"/>
        <circle cx="20" cy="14" r="1.5" fill="white"/>
        <circle cx="20" cy="17" r="1.5" fill="white"/>
        
        {/* Branch lines from junction to outputs */}
        <path
          d="M10 12L12 7"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12L12 10"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12L12 14"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10 12L12 17"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default QuadraForkLogo;