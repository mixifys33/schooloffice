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
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'min-h-[44px]', // Touch-friendly height
            isChildActive && 'bg-gray-100 dark:bg-gray-800',
            depth > 0 && 'pl-8'
          )}
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
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'min-h-[44px]', // Touch-friendly height
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
          : 'text-gray-700 dark:text-gray-300',
        depth > 0 && 'pl-8'
      )}
    >
      <span className="flex items-center gap-3">
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span>{item.label}</span>
      </span>
      {item.badge && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
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
      <div className="flex items-center gap-2 border-b px-4 py-4">
        {brand}
        {brandText && (
          <span className="text-lg font-bold text-blue-600">{brandText}</span>
        )}
        {subtitle && (
          <span className="ml-2 text-sm text-gray-500">{subtitle}</span>
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
        <div className="border-t p-4">
          {footer}
        </div>
      )}
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering Sheet after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {/* Mobile: Sheet-based sidebar - only render after mount to prevent hydration mismatch */}
      <div className="lg:hidden">
        {mounted ? (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="touch-icon"
                className="fixed left-4 top-4 z-40 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent {...props} />
            </SheetContent>
          </Sheet>
        ) : (
          <Button
            variant="ghost"
            size="touch-icon"
            className="fixed left-4 top-4 z-40 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Desktop: Fixed sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col',
          'fixed inset-y-0 left-0 z-30',
          'w-64 border-r bg-white dark:bg-gray-900',
          props.className
        )}
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
        'border-t bg-white dark:bg-gray-900',
        'lg:hidden', // Only show on mobile/tablet
        className
      )}
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
                'transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {item.icon && (
                <span className="mb-1">{item.icon}</span>
              )}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 right-1/4 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
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
