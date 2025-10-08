import React from 'react';
const FilterLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#EF4444"/>
    <path d="M6 8h20l-8 8v6l-4 2v-8L6 8z" fill="white"/>
  </svg>
);
export default FilterLogo;