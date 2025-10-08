import React from 'react';
import { SimpleIcon } from 'simple-icons';

interface SimpleIconsLogoProps {
  icon: SimpleIcon;
  size?: number;
  className?: string;
  customBackground?: string;
  whiteIcon?: boolean;
}

const SimpleIconsLogo: React.FC<SimpleIconsLogoProps> = ({ 
  icon, 
  size = 32, 
  className = "",
  customBackground,
  whiteIcon = true
}) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: customBackground || `#${icon.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: icon.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: whiteIcon ? 'invert(1)' : 'none', // Make logo white or keep original color
        }}
      />
    </div>
  );
};

export default SimpleIconsLogo;