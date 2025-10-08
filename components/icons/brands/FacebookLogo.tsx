import React from 'react';
import { siFacebook } from 'simple-icons';

interface FacebookLogoProps {
  size?: number;
  className?: string;
}

const FacebookLogo: React.FC<FacebookLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siFacebook.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siFacebook.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default FacebookLogo;
