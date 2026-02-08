'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/providers/theme-provider';
import { ThemePreference } from '@/lib/theme';
import { CheckCircle } from 'lucide-react';

interface ThemeOption {
  id: ThemePreference;
  name: string;
  icon: string;
  description: string;
  recommended?: boolean;
  note?: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'system',
    name: 'System',
    icon: '🖥️',
    description: 'Automatically matches your phone or computer appearance.',
    recommended: true,
  },
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    description: 'Bright and clear. Best for daytime use.',
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    description: 'Reduces eye strain. Ideal for night or low light.',
  },
  {
    id: 'paper',
    name: 'Paper',
    icon: '📄',
    description: 'Soft background for reading reports and marks for long periods.',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    icon: '👁️',
    description: 'Strong colors and text for better visibility.',
    note: 'Useful for vision difficulties.',
  },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [appliedTheme, setAppliedTheme] = useState<ThemePreference | null>(null);

  useEffect(() => {
    // Clear applied state after showing feedback
    if (appliedTheme) {
      const timer = setTimeout(() => {
        setAppliedTheme(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appliedTheme]);

  const handleThemeSelect = (selectedTheme: ThemePreference) => {
    setTheme(selectedTheme);
    setAppliedTheme(selectedTheme);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Appearance</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Change how SchoolOffice looks on your screen.
        </p>
      </div>

      {/* Theme Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themeOptions.map((option) => {
          const isSelected = theme === option.id;
          const isApplied = appliedTheme === option.id;
          
          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                isSelected
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }`}
              onClick={() => handleThemeSelect(option.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label={option.name}>
                      {option.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center space-x-2">
                        <span>{option.name}</span>
                        {option.recommended && (
                          <Badge variant="secondary" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  <div className="flex items-center space-x-2">
                    {isApplied && (
                      <div className="flex items-center space-x-1 text-[var(--success)] text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Applied</span>
                      </div>
                    )}
                    {isSelected && !isApplied && (
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-contrast)]"></div>
                      </div>
                    )}
                    {!isSelected && (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-default)]"></div>
                    )}
                  </div>
                </div>
                
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {option.description}
                </p>
                
                {option.note && (
                  <p className="text-[var(--text-muted)] text-xs mt-2 italic">
                    {option.note}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">About Themes</h3>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <p>
              • Your appearance choice is saved automatically and will persist across sessions.
            </p>
            <p>
              • The System option will automatically switch between light and dark based on your device settings.
            </p>
            <p>
              • Paper mode is specifically designed for teachers who spend long hours reading reports and entering marks.
            </p>
            <p>
              • High Contrast mode improves accessibility for users with visual difficulties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}