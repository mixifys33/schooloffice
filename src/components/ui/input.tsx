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
  ({ className, type, touchFriendly = false, error, ...props }, ref) => {
    const hasError = Boolean(error)
    
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Touch-friendly sizing: minimum 44px height for touch targets
          touchFriendly && "h-12 text-base px-4",
          // Default responsive sizing
          !touchFriendly && "h-10 md:h-10",
          // Error state styling - Requirements: 21.4
          hasError && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        ref={ref}
        aria-invalid={hasError ? "true" : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
