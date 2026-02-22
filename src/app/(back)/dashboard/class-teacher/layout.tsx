import { ReactNode } from 'react';
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
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  { href: '/class-teacher/profile', label: 'Profile & Workload', icon: <User className="h-5 w-5" /> },
  { href: '/class-teacher/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/class-teacher/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function ClassTeacherLayout({ children }: ClassTeacherLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Class Teacher Portal"
        useBottomNav={true}
        headerContent={
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            <div className="hidden xs:block">
              <ThemeToggle />
            </div>
          </div>
        }
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