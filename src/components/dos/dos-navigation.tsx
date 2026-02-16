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
  Settings,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Award,
  ClipboardCheck,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * DoS Navigation Component - Redesigned
 * 
 * Professional navigation matching Class Teacher section:
 * - Clean, modern design
 * - Expandable sections with smooth animations
 * - Active state highlighting
 * - Mobile-responsive
 * - Consistent with other portal sections
 */

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
    href: '/dos',
    icon: LayoutDashboard,
  },
  {
    name: 'Staff Assignments',
    href: '/dos/assignments',
    icon: Users,
  },
  {
    name: 'Grading System',
    href: '/dos/grading',
    icon: Award,
  },
  {
    name: 'Timetable',
    href: '/dos/timetable',
    icon: Calendar,
  },
  {
    name: 'View All CA Marks',
    href: '/dos/assessments/monitoring',
    icon: ClipboardCheck,
  },
  {
    name: 'Subjects',
    href: '/dos/subjects',
    icon: BookOpen,
    children: [
      { name: 'Control Center', href: '/dos/subjects', icon: BarChart3 },
      { name: 'Performance', href: '/dos/subjects/performance', icon: TrendingUp },
      { name: 'Interventions', href: '/dos/subjects/interventions', icon: Shield },
      { name: 'Management', href: '/dos/subjects/management', icon: Settings },
      { name: 'Analytics', href: '/dos/subjects/analytics', icon: BarChart3 },
      { name: 'Configuration', href: '/dos/subjects/configuration', icon: Settings },
    ],
  },
  {
    name: 'Assessments',
    href: '/dos/assessments',
    icon: ClipboardCheck,
    children: [
      { name: 'Overview', href: '/dos/assessments', icon: LayoutDashboard },
      { name: 'CA Monitoring', href: '/dos/assessments/monitoring', icon: FileText },
      { name: 'Plans', href: '/dos/assessments/plans', icon: Calendar },
      { name: 'Performance', href: '/dos/assessments/performance', icon: BarChart3 },
    ],
  },
  {
    name: 'Exams',
    href: '/dos/exams',
    icon: FileText,
    children: [
      { name: 'Control Center', href: '/dos/exams', icon: BarChart3 },
      { name: 'Validation', href: '/dos/exams/validation', icon: Shield },
    ],
  },
  {
    name: 'Reports',
    href: '/dos/reports',
    icon: GraduationCap,
    children: [
      { name: 'Generate', href: '/dos/reports/generate', icon: FileText },
      { name: 'Review', href: '/dos/reports/review', icon: Shield },
      { name: 'Templates', href: '/dos/reports/templates', icon: Settings },
    ],
  },
  {
    name: 'Scores',
    href: '/dos/scores',
    icon: BarChart3,
  },
  {
    name: 'Analytics',
    href: '/dos/analytics',
    icon: TrendingUp,
  },
  {
    name: 'Settings',
    href: '/dos/settings',
    icon: Settings,
  },
];

interface DoSNavigationProps {
  onNavigate?: () => void;
}

export function DoSNavigation({ onNavigate }: DoSNavigationProps) {
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
    if (href === '/dos') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isExpanded = (name: string) => expandedItems.includes(name);

  return (
    <nav className="space-y-1 p-3">
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
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
                {expanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                          isActive(child.href)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{child.name}</span>
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
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
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