'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar, BottomNav, type NavItem } from './sidebar'
import { ResponsiveContainer } from './responsive-container'

/**
 * Responsive Dashboard Layout Component
 * Requirements: 34.1, 34.2, 34.3, 34.4
 * - Mobile-optimized layouts (34.1)
 * - Tablet-adaptive layouts (34.2)
 * - Desktop full dashboard (34.3)
 * - Collapsible navigation for mobile (34.4)
 */

export interface DashboardLayoutProps {
  children: React.ReactNode
  /** Navigation items for sidebar */
  navItems: NavItem[]
  /** Brand text */
  brandText?: string
  /** Brand logo image URL (takes precedence over brandText) */
  brandLogo?: string
  /** Subtitle text */
  subtitle?: string
  /** Header content (right side) */
  headerContent?: React.ReactNode
  /** Footer content for sidebar */
  sidebarFooter?: React.ReactNode
  /** Whether to use bottom navigation on mobile instead of hamburger menu */
  useBottomNav?: boolean
  /** Whether to hide the header (useful when using custom context bars) */
  hideHeader?: boolean
  /** Control sidebar open state externally */
  sidebarOpen?: boolean
  /** Callback when sidebar open state changes */
  onSidebarOpenChange?: (open: boolean) => void
  /** Additional class names for main content */
  className?: string
}

export function DashboardLayout({
  children,
  navItems,
  brandText = 'SchoolOffice',
  brandLogo,
  subtitle,
  headerContent,
  sidebarFooter,
  useBottomNav = false,
  hideHeader = false,
  sidebarOpen,
  onSidebarOpenChange,
  className,
}: DashboardLayoutProps) {
  const BrandElement = brandLogo ? (
    <img src={brandLogo} alt={brandText} className="h-40 w-auto" />
  ) : (
    <span 
      className="text-lg font-bold"
      style={{ color: 'var(--accent-primary)' }}
    >
      {brandText}
    </span>
  )

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Sidebar - pass a render prop for the mobile trigger */}
      <Sidebar
        items={navItems}
        brandText={brandText}
        brandLogo={brandLogo}
        subtitle={subtitle}
        footer={sidebarFooter}
        open={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
        renderMobileTrigger={(triggerButton) => (
          <>
            {/* Main content area */}
            <div className="lg:pl-64">
              {/* Header - conditionally rendered */}
              {!hideHeader && (
                <header 
                  className="sticky top-0 z-20 border-b"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-default)',
                  }}
                >
                  <div className="flex h-16 items-center gap-2 px-2 sm:px-4 lg:px-8">
                    {/* Mobile: Hamburger button - part of header flow */}
                    <div className="flex-shrink-0 lg:hidden">
                      {triggerButton}
                    </div>
                    
                    {/* Desktop: Brand (hidden on mobile since it's in sidebar) */}
                    <div className="hidden lg:flex lg:items-center lg:gap-2">
                      {BrandElement}
                      {subtitle && (
                        <span 
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {subtitle}
                        </span>
                      )}
                    </div>

                    {/* Mobile: Brand - compact and truncated */}
                    <div className="flex flex-1 items-center min-w-0 lg:hidden">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--accent-primary)' }}>
                        {typeof brandText === 'string' ? brandText : 'SchoolOffice'}
                      </div>
                    </div>

                    {/* Header content (user menu, notifications, etc.) - compact on mobile */}
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
                      {headerContent}
                    </div>
                  </div>
                </header>
              )}

              {/* Main content */}
              <main
                className={cn(
                  hideHeader ? 'min-h-screen' : 'min-h-[calc(100vh-4rem)]',
                  useBottomNav && 'pb-16 lg:pb-0', // Add padding for bottom nav
                  className
                )}
              >
                <ResponsiveContainer className="py-4 md:py-6">
                  {children}
                </ResponsiveContainer>
              </main>
            </div>

            {/* Bottom navigation for mobile (optional) */}
            {useBottomNav && <BottomNav items={navItems} />}
          </>
        )}
      />
    </div>
  )
}

/**
 * Dashboard Header Component
 * For use within dashboard pages
 */
export interface DashboardHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardHeader({
  title,
  description,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        'mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Dashboard Section Component
 * For organizing content within dashboard pages
 */
export interface DashboardSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function DashboardSection({
  title,
  description,
  children,
  actions,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
