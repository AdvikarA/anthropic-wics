"use client";

import React from 'react';

type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6' 
  | 'subtitle1' 
  | 'subtitle2' 
  | 'body1' 
  | 'body2' 
  | 'caption' 
  | 'overline'
  | 'headline';

interface TypographyProps {
  variant?: TypographyVariant;
  component?: React.ElementType;
  className?: string;
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  component,
  className = '',
  children,
  color = 'inherit',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
  ...props
}) => {
  // Map variant to appropriate HTML element if component is not specified
  const Component = component || {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    subtitle1: 'h6',
    subtitle2: 'h6',
    body1: 'p',
    body2: 'p',
    caption: 'span',
    overline: 'span',
    headline: 'h2',
  }[variant];

  // Variant styles
  const variantStyles = {
    h1: 'text-4xl font-bold font-serif leading-tight',
    h2: 'text-3xl font-bold font-serif leading-tight',
    h3: 'text-2xl font-bold font-serif leading-tight',
    h4: 'text-xl font-semibold font-serif leading-snug',
    h5: 'text-lg font-semibold font-serif leading-snug',
    h6: 'text-base font-semibold font-serif leading-normal',
    subtitle1: 'text-lg font-medium font-sans leading-relaxed',
    subtitle2: 'text-base font-medium font-sans leading-relaxed',
    body1: 'text-base font-normal font-sans leading-relaxed',
    body2: 'text-sm font-normal font-sans leading-relaxed',
    caption: 'text-xs font-normal font-sans leading-normal',
    overline: 'text-xs font-medium font-sans uppercase tracking-wider',
    headline: 'text-2xl font-bold font-serif leading-tight border-b-2 border-[#D32F2F] pb-2 mb-4',
  };

  // Color styles
  const colorStyles = {
    primary: 'text-[#D32F2F]',
    secondary: 'text-[#1565C0]',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
    success: 'text-green-600',
    inherit: '',
  };

  // Alignment styles
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  // Additional styles
  const gutterBottomStyle = gutterBottom ? 'mb-4' : '';
  const noWrapStyle = noWrap ? 'whitespace-nowrap overflow-hidden text-ellipsis' : '';

  // Combine all styles
  const typographyStyles = `${variantStyles[variant]} ${colorStyles[color]} ${alignStyles[align]} ${gutterBottomStyle} ${noWrapStyle} ${className}`;

  return (
    <Component className={typographyStyles} {...props}>
      {children}
    </Component>
  );
};

export default Typography;
