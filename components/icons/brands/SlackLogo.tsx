import React from 'react';
import { siSlack } from 'simple-icons';

interface SlackLogoProps {
  size?: number;
  className?: string;
}

const SlackLogo: React.FC<SlackLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siSlack.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siSlack.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default SlackLogo;
