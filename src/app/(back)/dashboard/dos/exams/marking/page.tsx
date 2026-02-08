import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Marking | DOS Dashboard',
  description: 'Monitor and manage exam marking process',
};

export default function ExamMarkingPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Exam Marking</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Monitor marking progress and quality</p>
        </div>
        <Button>
          View Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">85%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-[var(--chart-blue)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">12%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">3%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-[var(--chart-purple)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">94%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marking Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Marking Management
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Track marking progress, assign markers, and ensure quality control
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                Assign Markers
              </Button>
              <Button>
                View Progress
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}