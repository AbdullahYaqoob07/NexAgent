import React from 'react';
import { siGmail } from 'simple-icons';

interface EmailLogoProps {
  size?: number;
  className?: string;
}

const EmailLogo: React.FC<EmailLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siGmail.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siGmail.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default EmailLogo;
