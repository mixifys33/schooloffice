/**
 * 🔒 THEME SYSTEM - DETERMINISTIC AND TOKEN-BASED
 * This file manages theme state, persistence, and application
 */

export type ThemePreference = 'system' | 'light' | 'dark' | 'paper' | 'contrast';

const THEME_STORAGE_KEY = 'themePreference';
const DEFAULT_THEME: ThemePreference = 'system';

/**
 * Get the current theme preference from localStorage
 */
export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      return stored as ThemePreference;
    }
  } catch (error) {
    console.warn('Failed to read theme preference from localStorage:', error);
  }
  
  return DEFAULT_THEME;
}

/**
 * Store theme preference in localStorage
 */
export function storeTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to store theme preference:', error);
  }
}

/**
 * Validate theme preference
 */
function isValidTheme(theme: string): boolean {
  return ['system', 'light', 'dark', 'paper', 'contrast'].includes(theme);
}

/**
 * Resolve system theme based on media query
 */
export function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the actual theme to apply (resolves 'system' to light/dark)
 */
export function getResolvedTheme(preference: ThemePreference): string {
  if (preference === 'system') {
    return resolveSystemTheme();
  }
  return preference;
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  
  const resolvedTheme = getResolvedTheme(theme);
  
  // Add transitioning class to prevent flash
  document.documentElement.classList.add('theme-transitioning');
  
  // Apply theme
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  
  // Remove transitioning class after a brief delay
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 50);
}

/**
 * Main theme setter function - the single source of truth
 */
export function setTheme(theme: ThemePreference): void {
  if (!isValidTheme(theme)) {
    console.warn(`Invalid theme: ${theme}. Using default.`);
    theme = DEFAULT_THEME;
  }
  
  // Store preference
  storeTheme(theme);
  
  // Apply theme
  applyTheme(theme);
  
  // Dispatch custom event for components that need to react
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme, resolvedTheme: getResolvedTheme(theme) } 
    }));
  }
}

/**
 * Initialize theme system on app load
 */
export function initializeTheme(): void {
  const preference = getStoredTheme();
  applyTheme(preference);
  
  // Listen for system theme changes when in system mode
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = () => {
      const currentPreference = getStoredTheme();
      if (currentPreference === 'system') {
        applyTheme('system');
        window.dispatchEvent(new CustomEvent('themechange', { 
          detail: { theme: 'system', resolvedTheme: getResolvedTheme('system') } 
        }));
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }
}

/**
 * Get current theme preference
 */
export function getCurrentTheme(): ThemePreference {
  return getStoredTheme();
}

/**
 * Get current resolved theme (what's actually applied)
 */
export function getCurrentResolvedTheme(): string {
  return getResolvedTheme(getStoredTheme());
}