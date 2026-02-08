import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, BarChart3, PieChart, Activity, Target } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - DOS Portal',
  description: 'Academic analytics and performance insights'
};

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive academic analytics and performance insights
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">78.5%</span>
              </div>
              <p className="text-xs text-muted-foreground">+5.2% from last term</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">1,247</span>
              </div>
              <p className="text-xs text-muted-foreground">Across all classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--chart-purple)]" />
                <span className="text-2xl font-bold">92.3%</span>
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
              <CardDescription>
                Detailed academic performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/portals/dos/analytics/performance">
                  <Button className="w-full justify-start" variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    View Performance Trends
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Analyze student performance across subjects, classes, and time periods
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teacher Analytics
              </CardTitle>
              <CardDescription>
                Teacher performance and workload analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/portals/dos/analytics/teachers">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    View Teacher Insights
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Monitor teacher effectiveness and workload distribution
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>
                Long-term academic trends and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/portals/dos/analytics/trends">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Trend Analysis
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Identify patterns and trends in academic performance
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Subject Distribution
              </CardTitle>
              <CardDescription>
                Subject-wise performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <PieChart className="h-4 w-4 mr-2" />
                  View Subject Analysis
                </Button>
                <p className="text-sm text-muted-foreground">
                  Compare performance across different subjects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}