'use client';

import React from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Home, GraduationCap, Calendar, FileText, FolderOpen, BarChart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TeacherSidebar = () => {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Dashboard',
      url: '/teacher',
      icon: Home,
    },
    {
      title: 'My Classes',
      url: '/teacher/my-classes',
      icon: GraduationCap,
    },
    {
      title: 'Timetable',
      url: '/teacher/timetable',
      icon: Calendar,
    },
    {
      title: 'Assessments',
      url: '/teacher/assessments',
      icon: FileText,
    },
    {
      title: 'Learning Evidence',
      url: '/teacher/learning-evidence',
      icon: FolderOpen,
    },
    {
      title: 'Reports',
      url: '/teacher/reports',
      icon: BarChart,
    },
    {
      title: 'Profile & Workload',
      url: '/teacher/profile-workload',
      icon: User,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Teacher Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.url}
                    >
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export { TeacherSidebar };