'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

/**
 * Responsive Sidebar Navigation Component
 * Requirements: 34.4 - Collapsible menu on mobile and sidebar on desktop
 */

export interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  children?: NavItem[]
}

export interface SidebarProps {
  /** Navigation items */
  items: NavItem[]
  /** Brand/Logo element */
  brand?: React.ReactNode
  /** Brand text */
  brandText?: string
  /** Brand logo image URL */
  brandLogo?: string
  /** Subtitle text */
  subtitle?: string
  /** Footer content */
  footer?: React.ReactNode
  /** Additional class names */
  className?: string
  /** Render prop for mobile trigger - allows parent to position the button */
  renderMobileTrigger?: (triggerButton: React.ReactNode) => React.ReactNode
  /** Control sidebar open state externally */
  open?: boolean
  /** Callback when sidebar open state changes */
  onOpenChange?: (open: boolean) => void
}

function NavItemComponent({
  item,
  isActive,
  depth = 0,
}: {
  item: NavItem
  isActive: boolean
  depth?: number
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = item.children && item.children.length > 0
  const pathname = usePathname()

  const isChildActive = hasChildren
    ? item.children?.some((child) => pathname === child.href)
    : false

  React.useEffect(() => {
    if (isChildActive) {
      setIsExpanded(true)
    }
  }, [isChildActive])

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:opacity-80',
            'min-h-[44px]', // Touch-friendly height
            depth > 0 && 'pl-8'
          )}
          style={{
            backgroundColor: isChildActive ? 'var(--bg-surface)' : 'transparent',
            color: 'var(--text-primary)',
          }}
        >
          <span className="flex items-center gap-3">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                isActive={pathname === child.href}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:opacity-80',
        'min-h-[44px]', // Touch-friendly height
        depth > 0 && 'pl-8'
      )}
      style={{
        backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
        color: isActive ? 'var(--accent-contrast)' : 'var(--text-primary)',
      }}
    >
      <span className="flex items-center gap-3">
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span>{item.label}</span>
      </span>
      {item.badge && (
        <span 
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: isActive ? 'var(--accent-contrast)' : 'var(--accent-primary)',
            color: isActive ? 'var(--accent-primary)' : 'var(--accent-contrast)',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({
  items,
  brand,
  brandText,
  brandLogo,
  subtitle,
  footer,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div 
        className="flex items-center gap-2 border-b px-4 py-4"
        style={{ borderColor: 'var(--border-default)' }}
      >
        {brand}
        {brandText && (
          <span 
            className="text-lg font-bold"
            style={{ color: 'var(--accent-primary)' }}
          >
            {brandText}
          </span>
        )}
        {subtitle && (
          <span 
            className="ml-2 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {items.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      {footer && (
        <div 
          className="border-t p-4"
          style={{ borderColor: 'var(--border-default)' }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  // Use external state if provided, otherwise use internal state
  const isOpen = props.open !== undefined ? props.open : internalOpen
  const setIsOpen = props.onOpenChange || setInternalOpen

  // Prevent hydration mismatch by only rendering Sheet after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Create the trigger button
  const triggerButton = mounted ? (
    <Button
      variant="ghost"
      size="touch-icon"
      className="h-10 w-10"
      aria-label="Open navigation menu"
      onClick={() => setIsOpen(true)}
    >
      <Menu className="h-6 w-6" />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="touch-icon"
      className="h-10 w-10"
      aria-label="Open navigation menu"
    >
      <Menu className="h-6 w-6" />
    </Button>
  )

  // If renderMobileTrigger is provided, use it (allows parent to position the button)
  if (props.renderMobileTrigger) {
    return (
      <>
        {props.renderMobileTrigger(triggerButton)}
        
        {/* Mobile Sheet - controlled by external state */}
        {mounted && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent {...props} />
            </SheetContent>
          </Sheet>
        )}
        
        {/* Desktop: Fixed sidebar */}
        <aside
          className={cn(
            'hidden lg:flex lg:flex-col',
            'fixed inset-y-0 left-0 z-30',
            'w-64 border-r',
            props.className
          )}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
          }}
        >
          <SidebarContent {...props} />
        </aside>
      </>
    )
  }

  // Default behavior: fixed position button (legacy)
  return (
    <>
      {/* Mobile: Sheet-based sidebar with fixed button */}
      <div className="lg:hidden">
        <div className="fixed left-2 top-2 z-40">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              {triggerButton}
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent {...props} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop: Fixed sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col',
          'fixed inset-y-0 left-0 z-30',
          'w-64 border-r',
          props.className
        )}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  )
}

/**
 * Mobile Bottom Navigation Component
 * Alternative navigation pattern for mobile devices
 */
export interface BottomNavProps {
  items: NavItem[]
  className?: string
}

export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname()
  const visibleItems = items.slice(0, 5) // Max 5 items for bottom nav

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'border-t',
        'lg:hidden', // Only show on mobile/tablet
        className
      )}
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2',
                'min-h-[56px]', // Touch-friendly height
                'transition-colors'
              )}
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              {item.icon && (
                <span className="mb-1">{item.icon}</span>
              )}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <span 
                  className="absolute -top-1 right-1/4 flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
