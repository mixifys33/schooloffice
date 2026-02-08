import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Analytics | DOS Dashboard',
  description: 'Academic analytics and insights',
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Analytics Dashboard</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Academic insights and performance analytics</p>
        </div>
        <Button>
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/portals/dos/analytics/performance">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--chart-blue)]" />
                <span>Performance Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Student and subject performance trends
              </p>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portals/dos/analytics/teachers">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-[var(--chart-green)]" />
                <span>Teacher Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Teacher performance and effectiveness
              </p>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portals/dos/analytics/trends">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-[var(--chart-purple)]" />
                <span>Trend Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Long-term academic trends and patterns
              </p>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Overall Performance</span>
                <span className="font-semibold text-[var(--chart-green)]">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Teacher Effectiveness</span>
                <span className="font-semibold text-[var(--chart-blue)]">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Student Engagement</span>
                <span className="font-semibold text-[var(--chart-purple)]">78%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                Set Performance Targets
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare Classes
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Trends
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}