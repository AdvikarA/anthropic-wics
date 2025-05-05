// Global theme configuration
export const theme = {
  // Color palette
  colors: {
    // Primary colors
    primary: {
      main: '#D32F2F',       // Guardian red
      light: '#FF6659',
      dark: '#9A0007',
      contrastText: '#FFFFFF'
    },
    // Secondary colors
    secondary: {
      main: '#1565C0',       // Blue
      light: '#5E92F3',
      dark: '#003C8F',
      contrastText: '#FFFFFF'
    },
    // Neutral colors
    neutral: {
      main: '#121212',       // Almost black
      light: '#383838',
      dark: '#000000',
      gray1: '#F5F5F5',
      gray2: '#E0E0E0',
      gray3: '#9E9E9E',
      gray4: '#616161',
      white: '#FFFFFF'
    },
    // Semantic colors
    semantic: {
      success: '#2E7D32',
      warning: '#ED6C02',
      error: '#D32F2F',
      info: '#0288D1'
    }
  },
  // Typography
  typography: {
    fontFamily: {
      primary: '"Guardian Egyptian Web", Georgia, serif',
      secondary: '"Guardian Text Sans Web", "Helvetica Neue", Helvetica, Arial, sans-serif'
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    }
  },
  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '2.5rem',  // 40px
    '3xl': '3rem',    // 48px
  },
  // Borders
  borders: {
    radius: {
      none: '0',
      sm: '0.125rem',  // 2px
      md: '0.25rem',   // 4px
      lg: '0.5rem',    // 8px
      full: '9999px'   // Circular
    }
  },
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  // Breakpoints
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Helper functions
export const getColor = (path: string): string => {
  const parts = path.split('.');
  let result: any = theme.colors;
  
  for (const part of parts) {
    if (result[part] === undefined) {
      return '';
    }
    result = result[part];
  }
  
  return typeof result === 'string' ? result : '';
};

export default theme;
