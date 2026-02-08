"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Touch-friendly input component
 * Requirements: 34.5 - Touch-friendly input controls with appropriate sizing for mobile
 * Requirements: 21.4 - Highlight empty required fields with red border
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Use touch-friendly sizing for mobile devices */
  touchFriendly?: boolean
  /** Error state - applies red border styling */
  error?: boolean | string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, touchFriendly = false, error, style, ...props }, ref) => {
    const hasError = Boolean(error)
    
    const inputStyles = {
      backgroundColor: 'var(--bg-surface)',
      borderColor: hasError ? 'var(--danger)' : 'var(--border-default)',
      color: 'var(--text-primary)',
      ...style,
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border px-3 py-2 text-sm ring-offset-2 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Touch-friendly sizing: minimum 44px height for touch targets
          touchFriendly && "h-12 text-base px-4",
          // Default responsive sizing
          !touchFriendly && "h-10 md:h-10",
          // Error state styling - Requirements: 21.4
          hasError && "focus-visible:ring-2",
          className
        )}
        style={inputStyles}
        ref={ref}
        aria-invalid={hasError ? "true" : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
