import React from 'react';
const FileLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#64748B"/>
    <path d="M10 6v20h12V12l-6-6H10z" fill="white"/>
    <path d="M16 6v6h6" fill="#64748B"/>
    <path d="M12 16h8M12 18h6M12 20h8" stroke="#64748B" strokeWidth="1"/>
  </svg>
);
export default FileLogo;