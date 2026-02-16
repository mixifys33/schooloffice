'use client'

import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Settings,
  GraduationCap,
  Award,
  ClipboardCheck,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DoSContextBar } from '@/components/dashboard/dos-context-bar';
import { DoSContextProvider } from '@/components/dos/dos-context-provider';

interface DoSLayoutProps {
  children: ReactNode;
}

/**
 * DoS Portal Layout - Academic Command Center
 * 
 * Professional layout matching Class Teacher and Admin sections:
 * - Uses DashboardLayout foundation for consistency
 * - Responsive design (mobile, tablet, desktop)
 * - Persistent context bar with term/academic year info
 * - Collapsible sidebar with organized navigation
 * - Bottom navigation for mobile devices
 */

// Navigation items for Director of Studies
const navItems = [
  { 
    href: '/dos', 
    label: 'Overview', 
    icon: <LayoutDashboard className="h-5 w-5" /> 
  },
  { 
    href: '/dos/assignments', 
    label: 'Staff Assignments', 
    icon: <Users className="h-5 w-5" /> 
  },
  { 
    href: '/dos/grading', 
    label: 'Grading System', 
    icon: <Award className="h-5 w-5" /> 
  },
  { 
    href: '/dos/timetable', 
    label: 'Timetable', 
    icon: <Calendar className="h-5 w-5" /> 
  },
  { 
    href: '/dos/assessments/monitoring', 
    label: 'View All CA Marks', 
    icon: <ClipboardCheck className="h-5 w-5" /> 
  },
  { 
    href: '/dos/subjects', 
    label: 'Subjects', 
    icon: <BookOpen className="h-5 w-5" /> 
  },
  { 
    href: '/dos/assessments', 
    label: 'Assessments', 
    icon: <ClipboardCheck className="h-5 w-5" /> 
  },
  { 
    href: '/dos/exams', 
    label: 'Exams', 
    icon: <FileText className="h-5 w-5" /> 
  },
  { 
    href: '/dos/reports', 
    label: 'Reports', 
    icon: <GraduationCap className="h-5 w-5" /> 
  },
  { 
    href: '/dos/reports/generate', 
    label: '  ↳ Generate', 
    icon: <FileText className="h-5 w-5" /> 
  },
  { 
    href: '/dos/reports/review', 
    label: '  ↳ Review', 
    icon: <Shield className="h-5 w-5" /> 
  },
  { 
    href: '/dos/reports/templates', 
    label: '  ↳ Templates', 
    icon: <Settings className="h-5 w-5" /> 
  },
  { 
    href: '/dos/scores', 
    label: 'Scores', 
    icon: <BarChart3 className="h-5 w-5" /> 
  },
  { 
    href: '/dos/analytics', 
    label: 'Analytics', 
    icon: <TrendingUp className="h-5 w-5" /> 
  },
  { 
    href: '/dos/settings', 
    label: 'Settings', 
    icon: <Settings className="h-5 w-5" /> 
  },
];

export default function DoSLayout({ children }: DoSLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <DoSContextProvider>
      <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
        {/* Persistent Context Bar with sidebar toggle */}
        <DoSContextBar 
          className="sticky top-0 z-30" 
          onToggleSidebar={handleToggleSidebar}
        />

        <DashboardLayout
          navItems={navItems}
          brandText="SchoolOffice"
          subtitle="Director of Studies"
          useBottomNav={true}
          hideHeader={true}
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
          sidebarFooter={
            <div className="text-sm text-[var(--text-muted)]">
              <p className="font-medium">DoS Portal</p>
              <p className="text-xs mt-1 opacity-75">Academic Management</p>
            </div>
          }
        >
          {children}
        </DashboardLayout>
      </div>
    </DoSContextProvider>
  );
}
