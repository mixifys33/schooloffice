import { ReactNode } from 'react';
import { 
  Home, 
  GraduationCap, 
  Calendar, 
  ClipboardList, 
  BookOpen, 
  BarChart3, 
  FileText, 
  Settings,
  User,
  Users,
  TrendingUp,
  FolderOpen,
  Bell
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { TeacherHeaderContent } from '@/components/dashboard/teacher-header-content';
import { AIChatToggle } from '@/components/ai-assistant/ai-chat-toggle';

interface TeacherLayoutProps {
  children: ReactNode;
}

// Navigation items for teacher portal
const navItems = [
  { href: '/teacher', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/teacher/classes', label: 'My Classes', icon: <GraduationCap className="h-5 w-5" /> },
  { href: '/teacher/timetable', label: 'Timetable', icon: <Calendar className="h-5 w-5" /> },
  { href: '/teacher/assessments', label: 'Assessments / Results', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/teacher/assessments/ca-entry', label: 'CA Entry', icon: <FileText className="h-5 w-5" /> },
  { href: '/teacher/marks?examType=EXAM', label: 'Exam Entry', icon: <TrendingUp className="h-5 w-5" /> },
  { href: '/teacher/evidence', label: 'Learning Evidence', icon: <FolderOpen className="h-5 w-5" /> },
  { href: '/teacher/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/teacher/profile', label: 'Profile & Workload', icon: <User className="h-5 w-5" /> },
  { href: '/teacher/attendance', label: 'Attendance', icon: <ClipboardList className="h-5 w-5" /> },
  { href: '/teacher/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Teacher Portal"
        useBottomNav={true}
        headerContent={
          <div className="flex items-center gap-2 sm:gap-4">
            <TeacherHeaderContent />
            <AIChatToggle />
            <ThemeToggle />
          </div>
        }
        sidebarFooter={
          <div className="text-sm text-[var(--text-muted)]">
            <p>Teacher Portal</p>
          </div>
        }
      >
        {children}
      </DashboardLayout>
    </div>
  );
}