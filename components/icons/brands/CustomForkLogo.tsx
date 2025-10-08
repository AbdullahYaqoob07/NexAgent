import React from 'react';

interface CustomForkLogoProps {
  size?: number;
  className?: string;
  outputCount?: number;
}

const CustomForkLogo: React.FC<CustomForkLogoProps> = ({ size = 32, className = "", outputCount = 5 }) => {
  const generateBranches = () => {
    const branches = [];
    const maxBranches = Math.min(outputCount, 6); // Cap at 6 for visual clarity
    const spacing = 14 / (maxBranches - 1); // Distribute branches across 14 units
    const startY = 12 - 7; // Start 7 units above center
    
    for (let i = 0; i < maxBranches; i++) {
      const y = startY + (i * spacing);
      
      // Branch line
      branches.push(
        <path
          key={`branch-${i}`}
          d={`M12 ${y}l10 0`}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
      
      // Output dot
      branches.push(
        <circle 
          key={`dot-${i}`}
          cx="20" 
          cy={y} 
          r="1.5" 
          fill="white"
        />
      );
      
      // Junction to branch line
      branches.push(
        <path
          key={`junction-${i}`}
          d={`M10 12L12 ${y}`}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    }
    
    return branches;
  };

  return (
    <div 
      className={`flex items-center justify-center relative ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: '#F59E0B',
      }}
    >
      {/* Fork SVG */}
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
        
        {/* Dynamic branches */}
        {generateBranches()}
      </svg>
      
      {/* Output count badge */}
      <div 
        className="absolute -bottom-1 -right-1 bg-white text-black rounded-full flex items-center justify-center font-bold"
        style={{
          width: size * 0.25,
          height: size * 0.25,
          fontSize: size * 0.125,
          minWidth: '16px',
          minHeight: '16px',
        }}
      >
        {outputCount}
      </div>
    </div>
  );
};

export default CustomForkLogo;