import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-16 h-16'
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modern, clean AI/Portfolio icon */}
      <rect x="4" y="4" width="24" height="24" rx="4" fill="url(#bgGradient)" />
      
      {/* P letter for Portfolio */}
      <path
        d="M10 8 L10 24 M10 8 L16 8 C19.314 8 22 10.686 22 14 C22 17.314 19.314 20 16 20 L10 20"
        stroke="url(#strokeGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* AI sparkle dots */}
      <circle cx="20" cy="10" r="1.5" fill="#a78bfa" />
      <circle cx="24" cy="14" r="1" fill="#a78bfa" />
      <circle cx="22" cy="18" r="1.2" fill="#a78bfa" />
      
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;

