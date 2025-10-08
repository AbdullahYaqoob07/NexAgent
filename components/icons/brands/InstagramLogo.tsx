import React from 'react';
import { siInstagram } from 'simple-icons';

interface InstagramLogoProps {
  size?: number;
  className?: string;
}

const InstagramLogo: React.FC<InstagramLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siInstagram.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default InstagramLogo;
