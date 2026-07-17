import React from 'react';

export default function TokenIcon({ type, className = 'w-4 h-4' }) {
  if (type === 'life') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full text-rose-300"
        >
          <path d="M12 2c0 5 5 10 10 10-5 0-10 5-10 10 0-5-5-10-10-10 5 0 10-5 10-10z" />
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
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full text-sky-300"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
    );
  }

  return null;
}
