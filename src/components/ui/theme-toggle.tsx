'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  const currentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="touch-icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        className="relative"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        {showLabel && (
          <span className="ml-2 capitalize">{theme}</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value)
                setIsOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                theme === value && 'bg-gray-100 dark:bg-gray-700 font-medium'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Simple theme toggle button that cycles through themes
 */
export function ThemeToggleSimple({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <Button
      variant="ghost"
      size="touch-icon"
      onClick={cycleTheme}
      aria-label="Toggle theme"
      className={className}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
