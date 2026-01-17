'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getButtonClasses, getActionVisibility, transitions } from '@/lib/teacher-ui-standards'

/**
 * Action Button Component for Teacher Dashboard
 * Requirements: 12.2, 12.3
 * - 12.2: Clearly indicate enabled vs disabled states with visual distinction
 * - 12.3: Hide or disable non-permitted actions instead of showing errors after click
 */

interface ActionButtonProps {
  /** Button label */
  label: string
  /** Icon to display before label */
  icon?: React.ReactNode
  /** Whether the action is permitted */
  isPermitted?: boolean
  /** Whether to hide (true) or disable (false) when not permitted */
  hideWhenNotPermitted?: boolean
  /** Whether the button is in loading state */
  isLoading?: boolean
  /** Loading label to show */
  loadingLabel?: string
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Link href (makes button a link) */
  href?: string
  /** Click handler */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Disabled state (separate from permission) */
  disabled?: boolean
  /** Type for form buttons */
  type?: 'button' | 'submit' | 'reset'
  /** Full width */
  fullWidth?: boolean
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

const iconSizeClasses = {
  sm: '[&_svg]:h-3.5 [&_svg]:w-3.5',
  md: '[&_svg]:h-4 [&_svg]:w-4',
  lg: '[&_svg]:h-4 [&_svg]:w-4',
}

export function ActionButton({
  label,
  icon,
  isPermitted = true,
  hideWhenNotPermitted = false,
  isLoading = false,
  loadingLabel,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className,
  disabled = false,
  type = 'button',
  fullWidth = false,
}: ActionButtonProps) {
  // Requirement 12.3: Determine visibility based on permission
  const visibility = getActionVisibility(isPermitted, hideWhenNotPermitted)
  
  if (visibility === 'hidden') {
    return null
  }

  const isDisabled = visibility === 'disabled' || disabled || isLoading
  
  // Requirement 12.2: Get appropriate button classes based on state
  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    sizeClasses[size],
    iconSizeClasses[size],
    transitions.color,
    getButtonClasses(variant, !isDisabled),
    fullWidth && 'w-full',
    className
  )

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      <span>{isLoading ? (loadingLabel || label) : label}</span>
    </>
  )

  // If it's a link and enabled, render as Link
  if (href && !isDisabled) {
    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    )
  }

  // Otherwise render as button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={buttonClasses}
      aria-disabled={isDisabled}
    >
      {content}
    </button>
  )
}

/**
 * Icon-only Action Button
 * For compact action buttons with just an icon
 */
interface IconActionButtonProps {
  /** Icon to display */
  icon: React.ReactNode
  /** Accessible label */
  ariaLabel: string
  /** Whether the action is permitted */
  isPermitted?: boolean
  /** Whether to hide when not permitted */
  hideWhenNotPermitted?: boolean
  /** Whether loading */
  isLoading?: boolean
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Link href */
  href?: string
  /** Click handler */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

const iconButtonSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

export function IconActionButton({
  icon,
  ariaLabel,
  isPermitted = true,
  hideWhenNotPermitted = false,
  isLoading = false,
  variant = 'secondary',
  size = 'md',
  href,
  onClick,
  className,
  disabled = false,
}: IconActionButtonProps) {
  const visibility = getActionVisibility(isPermitted, hideWhenNotPermitted)
  
  if (visibility === 'hidden') {
    return null
  }

  const isDisabled = visibility === 'disabled' || disabled || isLoading

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded-md',
    iconButtonSizeClasses[size],
    iconSizeClasses[size],
    transitions.color,
    getButtonClasses(variant, !isDisabled),
    className
  )

  const content = isLoading ? (
    <Loader2 className="animate-spin" aria-hidden="true" />
  ) : (
    icon
  )

  if (href && !isDisabled) {
    return (
      <Link href={href} className={buttonClasses} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={buttonClasses}
      aria-label={ariaLabel}
      aria-disabled={isDisabled}
    >
      {content}
    </button>
  )
}

/**
 * Button Group Component
 * For grouping related action buttons
 */
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

export default ActionButton
