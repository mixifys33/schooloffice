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
  className,
}: DashboardLayoutProps) {
  const BrandElement = brandLogo ? (
    <img src={brandLogo} alt={brandText} className="h-40 w-auto" />
  ) : (
    <span className="text-lg font-bold text-blue-600">{brandText}</span>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        items={navItems}
        brandText={brandText}
        brandLogo={brandLogo}
        subtitle={subtitle}
        footer={sidebarFooter}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b bg-white dark:bg-gray-900">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile: Space for hamburger menu */}
            <div className="w-12 lg:hidden" />
            
            {/* Desktop: Brand (hidden on mobile since it's in sidebar) */}
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              {BrandElement}
              {subtitle && (
                <span className="text-sm text-gray-500">{subtitle}</span>
              )}
            </div>

            {/* Mobile: Centered brand */}
            <div className="flex items-center gap-2 lg:hidden">
              {BrandElement}
            </div>

            {/* Header content (user menu, notifications, etc.) */}
            <div className="flex items-center gap-4">
              {headerContent}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main
          className={cn(
            'min-h-[calc(100vh-4rem)]',
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
