'use client'

import { ReactNode, useState } from 'react';
import {
  Home,
  GraduationCap,
  Calendar,
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare,
  Settings,
  User,
  FolderOpen
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ClassTeacherContextBar } from '@/components/dashboard/class-teacher-context-bar';

interface ClassTeacherLayoutProps {
  children: ReactNode;
}

// Navigation items for class teacher
const navItems = [
  { href: '/class-teacher', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/class-teacher/class-details', label: 'My Class', icon: <GraduationCap className="h-5 w-5" /> },
  { href: '/class-teacher/students', label: 'Students', icon: <GraduationCap className="h-5 w-5" /> },
  { href: '/class-teacher/timetable', label: 'Timetable', icon: <Calendar className="h-5 w-5" /> },
  { href: '/class-teacher/assessments', label: 'Assessments / Results', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/class-teacher/performance', label: 'Performance', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/class-teacher/evidence', label: 'Learning Evidence', icon: <FolderOpen className="h-5 w-5" /> },
  { href: '/class-teacher/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/class-teacher/attendance', label: 'Attendance', icon: <ClipboardList className="h-5 w-5" /> },
  { href: '/class-teacher/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function ClassTeacherLayout({ children }: ClassTeacherLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
      {/* Persistent Context Bar with sidebar toggle */}
      <ClassTeacherContextBar 
        className="sticky top-0 z-30" 
        onToggleSidebar={handleToggleSidebar}
      />

      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Class Teacher Portal"
        useBottomNav={true}
        hideHeader={true}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
        sidebarFooter={
          <div className="text-sm text-[var(--text-muted)]">
            <p>Class Teacher Portal</p>
          </div>
        }
      >
        {children}
      </DashboardLayout>
    </div>
  );
}