'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  UserCircle,
  ClipboardCheck,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  UserCheck,
  MessageSquare,
  Settings,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/dashboard/class-teacher',
    icon: LayoutDashboard,
  },
  {
    name: 'My Class',
    href: '/dashboard/class-teacher/my-class',
    icon: Users,
  },
  {
    name: 'Students',
    href: '/dashboard/class-teacher/students',
    icon: GraduationCap,
  },
  {
    name: 'Assessments',
    href: '/dashboard/class-teacher/assessments',
    icon: ClipboardCheck,
    children: [
      { name: 'Overview', href: '/dashboard/class-teacher/assessments', icon: LayoutDashboard },
      { name: 'CA Entry', href: '/dashboard/class-teacher/assessments/ca', icon: FileText },
      { name: 'Exam Entry', href: '/dashboard/class-teacher/assessments/exam', icon: BookOpen },
      { name: 'Reports', href: '/dashboard/class-teacher/assessments/report', icon: BarChart3 },
    ],
  },
  {
    name: 'Attendance',
    href: '/dashboard/class-teacher/attendance',
    icon: UserCheck,
  },
  {
    name: 'Assessments / Results',
    href: '/dashboard/class-teacher/assessments',
    icon: Edit3,
  },
  {
    name: 'Evidence',
    href: '/dashboard/class-teacher/evidence',
    icon: FolderOpen,
  },
  {
    name: 'Reports',
    href: '/dashboard/class-teacher/reports',
    icon: FileText,
  },
  {
    name: 'Performance',
    href: '/dashboard/class-teacher/performance',
    icon: TrendingUp,
  },
  {
    name: 'Timetable',
    href: '/dashboard/class-teacher/timetable',
    icon: Calendar,
  },
  {
    name: 'Settings',
    href: '/dashboard/class-teacher/settings',
    icon: Settings,
  },
];

interface ClassTeacherNavigationProps {
  onNavigate?: () => void;
}

export function ClassTeacherNavigation({ onNavigate }: ClassTeacherNavigationProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard/class-teacher') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isExpanded = (name: string) => expandedItems.includes(name);

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const active = isActive(item.href);
        const expanded = isExpanded(item.name);

        return (
          <div key={item.name}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                          isActive(child.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        <span>{child.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}