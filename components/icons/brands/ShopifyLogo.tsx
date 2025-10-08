import React from 'react';
import { siShopify } from 'simple-icons';

interface ShopifyLogoProps {
  size?: number;
  className?: string;
}

const ShopifyLogo: React.FC<ShopifyLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siShopify.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siShopify.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default ShopifyLogo;
