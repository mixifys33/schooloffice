import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Calendar, FileText, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Management | DOS Dashboard',
  description: 'Manage examinations and assessments',
};

export default function ExamManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Exam Management</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Create and manage examinations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Exam Schedule</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Plan and schedule examinations
            </p>
            <Button variant="outline" size="sm">
              View Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Question Papers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Manage exam question papers
            </p>
            <Button variant="outline" size="sm">
              Manage Papers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[var(--chart-purple)]" />
              <span>Invigilators</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Assign exam invigilators
            </p>
            <Button variant="outline" size="sm">
              Assign Staff
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Examination Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Exam Management System
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Comprehensive examination management and coordination
            </p>
            <Button>
              Start Managing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}