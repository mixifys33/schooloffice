'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Responsive Container Component
 * Requirements: 34.1, 34.2, 34.3 - Responsive layouts for mobile, tablet, and desktop
 * 
 * Provides consistent padding and max-width across different screen sizes
 */
export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Whether to add padding */
  padded?: boolean
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'xl',
  padded = true,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        padded && 'px-4 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Responsive Grid Component
 * Automatically adjusts columns based on screen size
 */
export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns on mobile (default: 1) */
  cols?: 1 | 2
  /** Number of columns on tablet (default: 2) */
  colsMd?: 1 | 2 | 3 | 4
  /** Number of columns on desktop (default: 3) */
  colsLg?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg'
}

const gapClasses = {
  sm: 'gap-2 md:gap-3',
  md: 'gap-3 md:gap-4 lg:gap-6',
  lg: 'gap-4 md:gap-6 lg:gap-8',
}

export function ResponsiveGrid({
  children,
  className,
  cols = 1,
  colsMd = 2,
  colsLg = 3,
  gap = 'md',
  ...props
}: ResponsiveGridProps) {
  const colsClass = cols === 1 ? 'grid-cols-1' : 'grid-cols-2'
  const colsMdClass = `md:grid-cols-${colsMd}`
  const colsLgClass = `lg:grid-cols-${colsLg}`

  return (
    <div
      className={cn(
        'grid',
        colsClass,
        colsMdClass,
        colsLgClass,
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Responsive Stack Component
 * Stacks items vertically on mobile, horizontally on larger screens
 */
export interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction on mobile */
  direction?: 'vertical' | 'horizontal'
  /** Direction on tablet and up */
  directionMd?: 'vertical' | 'horizontal'
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg'
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
}

export function ResponsiveStack({
  children,
  className,
  direction = 'vertical',
  directionMd = 'horizontal',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  ...props
}: ResponsiveStackProps) {
  const directionClass = direction === 'vertical' ? 'flex-col' : 'flex-row'
  const directionMdClass = directionMd === 'vertical' ? 'md:flex-col' : 'md:flex-row'

  return (
    <div
      className={cn(
        'flex',
        directionClass,
        directionMdClass,
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
