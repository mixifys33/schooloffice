# DoS Portal - Component Structure

**Date**: 2026-02-13

## Component Hierarchy

```
DoS Portal
│
├─ DoS Layout (src/app/(portals)/dos/layout.tsx)
│  │
│  ├─ DoS Context Bar (src/components/dashboard/dos-context-bar.tsx)
│  │  ├─ Sidebar Toggle Button (mobile only)
│  │  ├─ DoS Name & School Name
│  │  ├─ Current Term Badge
│  │  ├─ Academic Year Badge
│  │  ├─ Academic Operations Status Badge
│  │  ├─ Data Entry Status Indicator
│  │  ├─ Alert Counters (Critical, Warnings, Pending)
│  │  ├─ Theme Toggle
│  │  └─ Logout Button
│  │
│  └─ Dashboard Layout (src/components/layout/dashboard-layout.tsx)
│     │
│     ├─ Sidebar (Desktop: always visible, Mobile: toggleable)
│     │  ├─ Brand Section
│     │  │  ├─ Logo/Text: "SchoolOffice"
│     │  │  └─ Subtitle: "Director of Studies"
│     │  │
│     │  ├─ Navigation (src/components/dos/dos-navigation.tsx)
│     │  │  ├─ Overview
│     │  │  ├─ Staff Assignments
│     │  │  ├─ Grading System
│     │  │  ├─ Timetable
│     │  │  ├─ Subjects (expandable)
│     │  │  │  ├─ Control Center
│     │  │  │  ├─ Performance
│     │  │  │  ├─ Interventions
│     │  │  │  ├─ Management
│     │  │  │  ├─ Analytics
│     │  │  │  └─ Configuration
│     │  │  ├─ Curriculum (expandable)
│     │  │  │  ├─ Overview
│     │  │  │  ├─ Timetable
│     │  │  │  └─ Approvals
│     │  │  ├─ Assessments (expandable)
│     │  │  │  ├─ Overview
│     │  │  │  ├─ CA Monitoring
│     │  │  │  ├─ Plans
│     │  │  │  └─ Performance
│     │  │  ├─ Exams (expandable)
│     │  │  │  ├─ Control Center
│     │  │  │  └─ Validation
│     │  │  ├─ Reports (expandable)
│     │  │  │  ├─ Generate
│     │  │  │  ├─ Review
│     │  │  │  └─ Templates
│     │  │  ├─ Scores
│     │  │  ├─ Analytics
│     │  │  └─ Settings
│     │  │
│     │  └─ Footer Section
│     │     ├─ "DoS Portal" (font-medium)
│     │     └─ "Academic Management" (text-xs, opacity-75)
│     │
│     ├─ Main Content Area
│     │  └─ {children} (page content)
│     │
│     └─ Bottom Navigation (Mobile only, < 1024px)
│        └─ Same navigation items as sidebar
```

---

## Component Flow

### Desktop (> 1024px)

```
┌─────────────────────────────────────────────────────────────┐
│ DoS Context Bar                                             │
│ [DoS Name] • [School] [Term 1] [2025/2026] [Status] [🌙] [↪]│
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Sidebar     │  Main Content                                │
│  (Fixed)     │  (Scrollable)                                │
│              │                                              │
│  ┌────────┐  │  ┌────────────────────────────────────────┐ │
│  │ Brand  │  │  │                                        │ │
│  └────────┘  │  │  Page Content                          │ │
│              │  │  (Dashboard, Grading, Timetable, etc.) │ │
│  Navigation  │  │                                        │ │
│  ├─ Overview │  │                                        │ │
│  ├─ Staff    │  │                                        │ │
│  ├─ Grading  │  │                                        │ │
│  ├─ ...      │  │                                        │ │
│              │  │                                        │ │
│  Footer      │  └────────────────────────────────────────┘ │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Tablet (640px - 1024px)

```
┌─────────────────────────────────────────────────────────────┐
│ DoS Context Bar                                             │
│ [☰] [DoS] • [School] [Term] [Status] [🌙] [↪]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Main Content (Full Width)                                  │
│  (Sidebar toggleable via hamburger menu)                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Page Content                                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Bottom Navigation                                           │
│ [Overview] [Staff] [Grading] [Timetable] [More...]         │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (< 640px)

```
┌──────────────────────────┐
│ DoS Context Bar          │
│ [☰] [DoS] [🌙] [↪]       │
├──────────────────────────┤
│                          │
│  Main Content            │
│  (Full Width)            │
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │  Page Content      │  │
│  │  (Compact)         │  │
│  │                    │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ Bottom Navigation        │
│ [📊] [👥] [⭐] [📅] [⋯]  │
└──────────────────────────┘
```

---

## State Management

### Layout State

```typescript
const [sidebarOpen, setSidebarOpen] = useState(false);
```

### Navigation State

```typescript
const [expandedItems, setExpandedItems] = useState<string[]>([]);
```

### Context Bar State

```typescript
const [contextData, setContextData] = useState<DoSContextData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

---

## Props Flow

### DoS Layout → Dashboard Layout

```typescript
<DashboardLayout
  navItems={navItems}              // Navigation items array
  brandText="SchoolOffice"         // Brand name
  subtitle="Director of Studies"   // Portal subtitle
  useBottomNav={true}              // Enable mobile bottom nav
  hideHeader={true}                // Hide default header
  sidebarOpen={sidebarOpen}        // External sidebar state
  onSidebarOpenChange={setSidebarOpen} // State change callback
  sidebarFooter={<Footer />}       // Custom footer content
>
```

### DoS Layout → DoS Context Bar

```typescript
<DoSContextBar
  className="sticky top-0 z-30"    // Positioning
  onToggleSidebar={handleToggle}   // Sidebar toggle callback
/>
```

### Dashboard Layout → Sidebar

```typescript
<Sidebar
  items={navItems}                 // Navigation items
  brandText="SchoolOffice"         // Brand name
  brandLogo={undefined}            // Optional logo
  subtitle="Director of Studies"   // Subtitle
  footer={<Footer />}              // Footer content
  open={sidebarOpen}               // Open state
  onOpenChange={setSidebarOpen}    // State change callback
/>
```

### Dashboard Layout → DoS Navigation

```typescript
<DoSNavigation
  onNavigate={handleNavigate}      // Navigation callback
/>
```

---

## Event Flow

### Sidebar Toggle (Mobile)

```
User clicks hamburger menu
  ↓
DoSContextBar.onToggleSidebar()
  ↓
DoSLayout.handleToggleSidebar()
  ↓
setSidebarOpen(!sidebarOpen)
  ↓
DashboardLayout receives new sidebarOpen prop
  ↓
Sidebar opens/closes
```

### Navigation Click

```
User clicks navigation item
  ↓
DoSNavigation.handleNavigation()
  ↓
Next.js router navigates to href
  ↓
Sidebar closes (mobile only)
  ↓
Page content updates
```

### Expandable Section Toggle

```
User clicks expandable item
  ↓
DoSNavigation.toggleExpanded(name)
  ↓
setExpandedItems([...prev, name])
  ↓
Section expands with animation
  ↓
Child items become visible
```

---

## Styling Architecture

### Tailwind Classes Used

#### Layout

- `min-h-screen` - Full viewport height
- `bg-[var(--bg-surface)]` - Background color
- `dark:bg-[var(--text-primary)]` - Dark mode background

#### Sidebar

- `lg:pl-64` - Desktop padding for sidebar
- `sticky top-0 z-30` - Sticky positioning
- `overflow-y-auto` - Scrollable content

#### Navigation

- `space-y-1` - Vertical spacing
- `p-3` - Padding
- `rounded-lg` - Rounded corners
- `transition-colors` - Smooth color transitions

#### Active States

- `bg-primary` - Active background
- `text-primary-foreground` - Active text
- `font-medium` - Active font weight

#### Hover States

- `hover:bg-accent` - Hover background
- `hover:text-accent-foreground` - Hover text

#### Responsive

- `hidden lg:flex` - Desktop only
- `lg:hidden` - Mobile only
- `sm:inline` - Tablet and up

---

## Accessibility Features

### Keyboard Navigation

- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys for navigation (future enhancement)

### ARIA Labels

- `aria-label="Toggle sidebar"` on hamburger menu
- `role="navigation"` on nav element
- `aria-expanded` on expandable items (future enhancement)

### Focus States

- Visible focus rings on all interactive elements
- Focus trap in mobile sidebar (future enhancement)

### Screen Reader Support

- Semantic HTML structure
- Descriptive link text
- Status announcements (future enhancement)

---

## Performance Optimizations

### Component Level

- Minimal state (only sidebar and expanded items)
- Memoized navigation items
- CSS transitions instead of JavaScript animations

### Layout Level

- Sticky positioning for context bar
- Fixed sidebar on desktop
- Lazy loading for page content (Next.js default)

### Network Level

- Static navigation data (no API calls)
- Context bar data fetched once on mount
- Cached theme preference

---

## Future Enhancements

### Navigation

- [ ] Search functionality
- [ ] Keyboard shortcuts
- [ ] Breadcrumbs
- [ ] Favorites/pinning

### Layout

- [ ] Customizable sidebar width
- [ ] Collapsible sidebar on desktop
- [ ] Multiple theme options

### Context Bar

- [ ] Real-time updates
- [ ] Notification center
- [ ] Quick actions menu

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-13
