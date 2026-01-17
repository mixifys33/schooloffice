'use client'

import React, { ReactNode } from 'react'
import {
  Home,
  DollarSign,
  BookOpen,
  MessageSquare,
  User,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { Button } from '@/components/ui/button'
import { InlineContextDisplay } from '@/components/ui/context-header'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/**
 * Parent Portal Layout
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 9.4, 18.5
 * - Mobile-optimized layouts
 * - Tablet-adaptive layouts
 * - Desktop full dashboard
 * - Collapsible navigation for mobile
 * - Touch-friendly form controls
 * - Context display (school, role)
 */

interface ParentLayoutProps {
  children: ReactNode
}

const navItems: NavItem[] = [
  { href: '/parent', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/parent/fees', label: 'Fees', icon: <DollarSign className="h-5 w-5" /> },
  { href: '/parent/academics', label: 'Academics', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/parent/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
]

export default function ParentLayout({ children }: ParentLayoutProps) {
  return (
    <DashboardLayout
      navItems={navItems}
      brandText="SchoolOffice"
      subtitle="Parent Portal"
      useBottomNav={true}
      headerContent={
        <div className="flex items-center gap-4">
          {/* Context Display - Requirements: 9.4, 18.5 */}
          <InlineContextDisplay className="hidden md:flex" />
          <ThemeToggle />
          <Button variant="ghost" size="touch-icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      }
      sidebarFooter={
        <div className="text-sm text-gray-500">
          <p>Logged in as Parent</p>
        </div>
      }
    >
      {children}
    </DashboardLayout>
  )
}
