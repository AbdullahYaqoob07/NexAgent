import React from 'react';
import { siMongodb } from 'simple-icons';

interface DatabaseLogoProps {
  size?: number;
  className?: string;
}

const DatabaseLogo: React.FC<DatabaseLogoProps> = ({ size = 32, className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: `#${siMongodb.hex}`,
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: siMongodb.svg }}
        style={{
          width: size * 0.6,
          height: size * 0.6,
          filter: 'invert(1)', // Make logo white
        }}
      />
    </div>
  );
};

export default DatabaseLogo;
