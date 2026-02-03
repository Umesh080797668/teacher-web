'use client';

import { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingSpinner = memo(({ size = 'md', message, className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="relative mb-4">
          <div className={`animate-spin rounded-full ${sizeClasses[size]} border-4 border-primary/20 border-t-primary mx-auto`}></div>
          {size === 'lg' && (
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-r-primary/40 animate-spin animation-delay-75"></div>
          )}
        </div>
        {message && (
          <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;