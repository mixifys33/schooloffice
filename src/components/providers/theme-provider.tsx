'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemePreference, initializeTheme, setTheme, getCurrentTheme, getCurrentResolvedTheme } from '@/lib/theme';

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: string;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<string>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme system
    initializeTheme();
    
    // Set initial state
    setThemeState(getCurrentTheme());
    setResolvedTheme(getCurrentResolvedTheme());
    setMounted(true);

    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      setThemeState(event.detail.theme);
      setResolvedTheme(event.detail.resolvedTheme);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  const handleSetTheme = (newTheme: ThemePreference) => {
    setTheme(newTheme);
  };


  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: handleSetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}