"use client";

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'medium',
}) => {
  // Base styles
  const baseStyles = 'bg-white';
  
  // Variant styles
  const variantStyles = {
    default: '',
    outlined: 'border border-gray-200',
    elevated: 'shadow-md',
  };
  
  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-8',
  };
  
  // Combine all styles
  const cardStyles = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`;
  
  return (
    <div className={cardStyles}>
      {children}
    </div>
  );
};

export default Card;
