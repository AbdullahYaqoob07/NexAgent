import React from 'react';
import { siWhatsapp } from 'simple-icons';

interface WhatsAppLogoProps {
  size?: number;
  className?: string;
}

const WhatsAppLogo: React.FC<WhatsAppLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siWhatsapp.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siWhatsapp.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default WhatsAppLogo;
