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
          className="w-full h-full text-rose-400"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
          className="w-full h-full text-sky-400"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
    );
  }

  return null;
}
