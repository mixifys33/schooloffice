'use client'

import React, { ReactNode } from 'react'
import {
  Home,
  Calendar,
  ClipboardList,
  BookOpen,
  User,
  MessageSquare,
  BarChart2,
  FileText,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TeacherContextBar } from '@/components/dashboard/teacher-context-bar'

/**
 * Teacher Portal Layout
 * Requirements: 1.1, 1.2, 1.3, 1.4, 14.1, 14.2, 14.3, 14.4, 9.4, 18.5
 * - Persistent Context Bar with teacher name, role, term, academic year (1.1, 1.2)
 * - Logout functionality (1.3)
 * - Error state when term/year cannot be determined (1.4)
 * - "My Classes" section at top
 * - "Today" section showing current timetable
 * - Quick action buttons: Take attendance, Enter marks
 * - Limited to classes, timetable, and pending tasks only
 */

interface TeacherLayoutProps {
  children: ReactNode
}

// Requirements: 14.4 - Limited navigation items for teachers
const navItems: NavItem[] = [
  { href: '/teacher', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/teacher/classes', label: 'My Classes', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/teacher/timetable', label: 'Timetable', icon: <Calendar className="h-5 w-5" /> },
  { href: '/teacher/attendance', label: 'Attendance', icon: <ClipboardList className="h-5 w-5" /> },
  { href: '/teacher/assignments', label: 'Assignments', icon: <FileText className="h-5 w-5" /> },
  { href: '/teacher/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/teacher/reports', label: 'Reports', icon: <BarChart2 className="h-5 w-5" /> },
  { href: '/teacher/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
]

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Requirements: 1.1, 1.2 - Persistent Context Bar that remains visible on all views */}
      <TeacherContextBar className="sticky top-0 z-30" />
      
      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Teacher Portal"
        useBottomNav={true}
        headerContent={
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        }
        sidebarFooter={
          <div className="text-sm text-gray-500">
            <p>Teacher Portal</p>
          </div>
        }
      >
        {children}
      </DashboardLayout>
    </div>
  )
}
