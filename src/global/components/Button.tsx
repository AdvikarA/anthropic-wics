"use client";

import React from 'react';
import { theme } from '../styles/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'auth';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size styles
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  // Variant styles
  const variantStyles = {
    primary: `bg-[${theme.colors.primary.main}] text-white hover:bg-[${theme.colors.primary.dark}] focus:ring-[${theme.colors.primary.main}]`,
    secondary: `bg-[${theme.colors.secondary.main}] text-white hover:bg-[${theme.colors.secondary.dark}] focus:ring-[${theme.colors.secondary.main}]`,
    outline: `border border-[${theme.colors.neutral.gray3}] text-[${theme.colors.neutral.main}] hover:bg-[${theme.colors.neutral.gray1}] focus:ring-[${theme.colors.neutral.gray3}]`,
    text: `text-[${theme.colors.primary.main}] hover:bg-[${theme.colors.neutral.gray1}] focus:ring-[${theme.colors.primary.main}]`,
    auth: `bg-[#DB0000] text-white hover:bg-[#B00000] focus:ring-[#DB0000] font-semibold rounded-sm`
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Disabled styles
  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';
  
  // Combine all styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${className}`;
  
  return (
    <button
      className={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        <>
          {startIcon && <span className="mr-2">{startIcon}</span>}
          {children}
          {endIcon && <span className="ml-2">{endIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
