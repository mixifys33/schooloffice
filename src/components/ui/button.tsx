"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-[var(--white-pure)] hover:opacity-90",
        destructive: "text-[var(--white-pure)] hover:opacity-90", 
        outline: "border hover:opacity-90",
        secondary: "hover:opacity-80",
        ghost: "hover:opacity-90",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Touch-friendly sizes for mobile (Requirements 34.5)
        touch: "h-12 px-6 py-3 min-w-[44px]",
        "touch-sm": "h-11 px-4 py-2.5 min-w-[44px]",
        "touch-lg": "h-14 px-8 py-4 min-w-[44px]",
        "touch-icon": "h-12 w-12 min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Define theme-based styles for each variant
    const getVariantStyles = (variant: string) => {
      switch (variant) {
        case 'default':
          return {
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-contrast)',
            borderColor: 'var(--accent-primary)',
          }
        case 'destructive':
          return {
            backgroundColor: 'var(--danger)',
            color: 'var(--accent-contrast)',
            borderColor: 'var(--danger)',
          }
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-default)',
          }
        case 'secondary':
          return {
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-default)',
          }
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            borderColor: 'transparent',
          }
        case 'link':
          return {
            backgroundColor: 'transparent',
            color: 'var(--accent-primary)',
            borderColor: 'transparent',
          }
        default:
          return {
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-contrast)',
            borderColor: 'var(--accent-primary)',
          }
      }
    }
    
    const variantStyles = getVariantStyles(variant || 'default')
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{
          ...variantStyles,
          ...style,
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
