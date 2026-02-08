'use client'

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus, BookOpen, Users, BarChart3, ArrowRight } from 'lucide-react';

// Note: Metadata export removed since this is now a client component
// The metadata will be handled by the parent layout

export default function SubjectManagementPage() {
  const router = useRouter();

  const handleManageCore = () => {
    // Navigate to core subjects management
    router.push('/dashboard/dos/subjects/core');
  };

  const handleManageElectives = () => {
    // Navigate to elective subjects management
    router.push('/dashboard/dos/subjects/electives');
  };

  const handleViewAnalytics = () => {
    // Navigate to subject analytics
    router.push('/dashboard/dos/subjects/analytics');
  };

  const handleConfigureSubjects = () => {
    // Navigate to subject configuration
    router.push('/dashboard/dos/subjects/configuration');
  };

  const handleAddSubject = () => {
    // Navigate to add new subject
    router.push('/dashboard/dos/subjects/add');
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Subject Management</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Create, edit, and manage school subjects</p>
        </div>
        <div>
          <Button onClick={handleAddSubject}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleManageCore}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Core Subjects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Manage core curriculum subjects
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleManageCore();
              }}
              className="w-full group-hover:bg-[var(--accent-primary)] group-hover:text-[var(--accent-contrast)] group-hover:border-[var(--accent-primary)] transition-all duration-200"
            >
              Manage Core
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleManageElectives}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Elective Subjects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Manage elective and optional subjects
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleManageElectives();
              }}
              className="w-full group-hover:bg-[var(--accent-primary)] group-hover:text-[var(--accent-contrast)] group-hover:border-[var(--accent-primary)] transition-all duration-200"
            >
              Manage Electives
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleViewAnalytics}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-[var(--chart-purple)]" />
              <span>Subject Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              View subject performance metrics
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleViewAnalytics();
              }}
              className="w-full group-hover:bg-[var(--accent-primary)] group-hover:text-[var(--accent-contrast)] group-hover:border-[var(--accent-primary)] transition-all duration-200"
            >
              View Analytics
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleConfigureSubjects}>
        <CardHeader>
          <CardTitle>Subject Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4 group-hover:text-[var(--accent-primary)] transition-colors duration-200" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Subject Management System
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Configure subjects, assign teachers, and manage curriculum requirements
            </p>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleConfigureSubjects();
              }}
              className="group-hover:scale-105 transition-transform duration-200"
            >
              Configure Subjects
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}