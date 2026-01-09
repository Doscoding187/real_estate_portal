import React from 'react';

export const HouseMeasureIcon = ({ className = "w-4 h-4", strokeWidth = 2 }: { className?: string, strokeWidth?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* House Frame */}
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
      
      {/* Bottom Measurement Arrow */}
      <path d="M7 21h10" />
      <path d="M7 21l2 2" />
      <path d="M7 21l2-2" />
      <path d="M17 21l-2 2" />
      <path d="M17 21l-2-2" />

      {/* "m²" Text Representation (Simplified Paths for robustness) */}
      {/* m */}
      <path d="M9 13v4" />
      <path d="M9 14c0 0 1-1 2-1s2 1 2 1" />
      <path d="M11 14c0 0 1-1 2-1s2 1 2 1v3" />
      
      {/* 2 (superscript) */}
      <path d="M16 12a1 1 0 0 1 1-1 1 1 0 0 1 1 1c0 .5-.5 1-1 1.5l-1 .5h2" strokeWidth={strokeWidth * 0.8} /> 
    </svg>
  );
};
