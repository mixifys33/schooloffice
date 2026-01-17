/**
 * Layout Components
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 12.3, 12.4
 * - Mobile-optimized layouts
 * - Tablet-adaptive layouts
 * - Desktop full dashboard
 * - Collapsible navigation for mobile
 * - Touch-friendly form controls
 * - Permission-based navigation visibility
 */

export {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveStack,
  type ResponsiveContainerProps,
  type ResponsiveGridProps,
  type ResponsiveStackProps,
} from './responsive-container'

export {
  Sidebar,
  BottomNav,
  type NavItem,
  type SidebarProps,
  type BottomNavProps,
} from './sidebar'

export {
  DashboardLayout,
  DashboardHeader,
  DashboardSection,
  type DashboardLayoutProps,
  type DashboardHeaderProps,
  type DashboardSectionProps,
} from './dashboard-layout'

export {
  PermissionSidebar,
  type PermissionNavItem,
  type PermissionSidebarProps,
} from './permission-sidebar'
