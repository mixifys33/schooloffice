'use client'

import React, { ReactNode } from 'react'
import {
  Home,
  Calendar,
  BarChart3,
  DollarSign,
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
 * Student Portal Layout
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 9.4, 18.5
 * - Mobile-optimized layouts
 * - Tablet-adaptive layouts
 * - Desktop full dashboard
 * - Collapsible navigation for mobile
 * - Touch-friendly form controls
 * - Context display (school, role)
 */

interface StudentLayoutProps {
  children: ReactNode
}

const navItems: NavItem[] = [
  { href: '/student', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/student/timetable', label: 'Timetable', icon: <Calendar className="h-5 w-5" /> },
  { href: '/student/results', label: 'Results', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/student/fees', label: 'Fees', icon: <DollarSign className="h-5 w-5" /> },
]

export default function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <DashboardLayout
      navItems={navItems}
      brandText="SchoolOffice"
      subtitle="Student Portal"
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
          <p>Logged in as Student</p>
        </div>
      }
    >
      {children}
    </DashboardLayout>
  )
}
