import React from 'react';

export default function TokenIcon({ type, className = 'w-4 h-4' }) {
  if (type === 'life') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full text-fuchsia-400 drop-shadow-[0_0_6px_rgba(240,79,233,0.7)]"
        >
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
          <path d="M12 3a9 9 0 0 0 0 18V3z" fill="currentColor" fillOpacity="0.15" />
          <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="16.5" r="1.5" fill="currentColor" />
        </svg>
      </span>
    );
  }

  if (type === 'time') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full text-cyan-400 drop-shadow-[0_0_6px_rgba(0,212,255,0.7)]"
        >
          <path d="M5 3h14" />
          <path d="M5 21h14" />
          <path d="M19 3v4c0 3-2 5-5 5s-5-2-5-5V3" />
          <path d="M19 21v-4c0-3-2-5-5-5s-5 2-5 5v4" />
          <circle cx="12" cy="7" r="1" fill="currentColor" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      </span>
    );
  }

  return null;
}
