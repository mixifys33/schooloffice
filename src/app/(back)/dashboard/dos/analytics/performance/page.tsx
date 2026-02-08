import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Target, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance Analytics | DOS Dashboard',
  description: 'Student and academic performance analytics',
};

export default function PerformanceAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Performance Analytics</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Student and academic performance insights</p>
        </div>
        <Button>
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-[var(--chart-green)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">85.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Improvement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-[var(--chart-blue)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">+12%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-[var(--chart-purple)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">156</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              At Risk Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">23</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Mathematics</span>
                <span className="font-semibold text-[var(--chart-green)]">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">English</span>
                <span className="font-semibold text-[var(--chart-blue)]">88%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Science</span>
                <span className="font-semibold text-[var(--chart-purple)]">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">History</span>
                <span className="font-semibold text-[var(--chart-yellow)]">78%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                Trend Analysis
              </h3>
              <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
                Performance trends over time
              </p>
              <Button>
                View Detailed Charts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}