'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PermissionGuard } from '@/components/auth/permission-guard'

/**
 * Permission-Aware Sidebar Navigation Component
 * Requirements: 12.3, 12.4 - Wrap menu items with PermissionGuard
 * Only show accessible menu items based on user permissions
 */

export interface PermissionNavItem {
  href: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  /** Permission(s) required to view this item */
  permission?: string | string[]
  /** Whether all permissions are required (AND) or any (OR) */
  permissionMode?: 'all' | 'any'
  children?: PermissionNavItem[]
}

export interface PermissionSidebarProps {
  /** Navigation items with permission requirements */
  items: PermissionNavItem[]
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

/**
 * Navigation item component with permission guard
 * Requirements: 12.3, 12.4 - Conditionally render based on permissions
 */
function PermissionNavItemComponent({
  item,
  isActive,
  depth = 0,
}: {
  item: PermissionNavItem
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

  // Wrap the content with PermissionGuard if permission is specified
  const content = hasChildren ? (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]',
          'min-h-[44px]', // Touch-friendly height
          isChildActive && 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]',
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
            <PermissionNavItemComponent
              key={child.href}
              item={child}
              isActive={pathname === child.href}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  ) : (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]',
        'min-h-[44px]', // Touch-friendly height
        isActive
          ? 'bg-[var(--info-light)] text-[var(--accent-hover)] dark:bg-[var(--info-dark)] dark:text-[var(--info)]'
          : 'text-[var(--text-primary)] dark:text-[var(--text-muted)]',
        depth > 0 && 'pl-8'
      )}
    >
      <span className="flex items-center gap-3">
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span>{item.label}</span>
      </span>
      {item.badge && (
        <span className="rounded-full bg-[var(--info-light)] px-2 py-0.5 text-xs font-medium text-[var(--accent-hover)] dark:bg-[var(--info-dark)] dark:text-[var(--info)]">
          {item.badge}
        </span>
      )}
    </Link>
  )

  // If permission is specified, wrap with PermissionGuard
  if (item.permission) {
    return (
      <PermissionGuard 
        permission={item.permission} 
        mode={item.permissionMode || 'any'}
      >
        {content}
      </PermissionGuard>
    )
  }

  return content
}

function PermissionSidebarContent({
  items,
  brand,
  brandText,
  brandLogo,
  subtitle,
  footer,
}: PermissionSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        {brand}
        {brandText && (
          <span className="text-lg font-bold text-[var(--chart-blue)]">{brandText}</span>
        )}
        {subtitle && (
          <span className="ml-2 text-sm text-[var(--text-muted)]">{subtitle}</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {items.map((item) => (
            <PermissionNavItemComponent
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

export function PermissionSidebar(props: PermissionSidebarProps) {
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
              <PermissionSidebarContent {...props} />
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
          'w-64 border-r bg-[var(--bg-main)] dark:bg-[var(--text-primary)]',
          props.className
        )}
      >
        <PermissionSidebarContent {...props} />
      </aside>
    </>
  )
}

export default PermissionSidebar
