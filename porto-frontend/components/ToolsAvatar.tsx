import React from 'react';
import { ToolsIcon } from './icons';

interface ToolsAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToolsAvatar: React.FC<ToolsAvatarProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg backdrop-blur-sm`}>
      <ToolsIcon className={iconSizes[size]} color="text-teal-400" />
    </div>
  );
};

export default ToolsAvatar;


