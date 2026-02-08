'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemePreference } from '@/lib/theme';

interface ThemeOption {
  value: ThemePreference;
  icon: string;
  label: string;
  description: string;
  recommended?: boolean;
  note?: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'system',
    icon: '🖥️',
    label: 'System',
    description: 'Automatically matches your phone or computer appearance.',
    recommended: true,
  },
  {
    value: 'light',
    icon: '☀️',
    label: 'Light mode',
    description: 'Bright and clear. Best for daytime use.',
  },
  {
    value: 'dark',
    icon: '🌙',
    label: 'Dark mode',
    description: 'Reduces eye strain. Ideal for night or low light.',
  },
  {
    value: 'paper',
    icon: '📄',
    label: 'Paper mode',
    description: 'Soft background for reading reports and marks for long periods.',
  },
  {
    value: 'contrast',
    icon: '👁️',
    label: 'High contrast',
    description: 'Strong colors and text for better visibility.',
    note: 'Useful for vision difficulties.',
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const handleThemeSelect = (selectedTheme: ThemePreference) => {
    setTheme(selectedTheme);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Appearance
        </h2>
        <p 
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Change how SchoolOffice looks on your screen.
        </p>
      </div>

      <div className="grid gap-3">
        {themeOptions.map((option) => (
          <Card
            key={option.value}
            className={`
              relative cursor-pointer transition-all duration-200 p-4 border-2
              ${theme === option.value 
                ? 'ring-2 ring-offset-2' 
                : 'hover:shadow-md'
              }
            `}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: theme === option.value 
                ? 'var(--accent-primary)' 
                : 'var(--border-default)',
            }}
            className={`${theme === option.value ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
            onClick={() => handleThemeSelect(option.value)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {option.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 
                    className="font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {option.label}
                  </h3>
                  {option.recommended && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-contrast)',
                      }}
                    >
                      Recommended
                    </Badge>
                  )}
                  {theme === option.value && (
                    <div 
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <svg 
                        className="w-3 h-3" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      Applied
                    </div>
                  )}
                </div>
                
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {option.description}
                </p>
                
                {option.note && (
                  <p 
                    className="text-xs mt-2 italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {option.note}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}