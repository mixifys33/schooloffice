import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Star, TrendingUp, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Teacher Analytics | DOS Dashboard',
  description: 'Teacher performance and effectiveness analytics',
};

export default function TeacherAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Teacher Analytics</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Teacher performance and effectiveness insights</p>
        </div>
        <Button>
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Total Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-[var(--chart-blue)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">45</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">4.6</span>
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
              <Award className="h-5 w-5 text-[var(--chart-green)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">12</span>
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
              <TrendingUp className="h-5 w-5 text-[var(--chart-purple)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">+8%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Sarah Johnson</span>
                  <p className="text-sm text-[var(--text-secondary)]">Mathematics</p>
                </div>
                <span className="font-semibold text-[var(--chart-green)]">96%</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Michael Chen</span>
                  <p className="text-sm text-[var(--text-secondary)]">Science</p>
                </div>
                <span className="font-semibold text-[var(--chart-blue)]">94%</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Emily Davis</span>
                  <p className="text-sm text-[var(--text-secondary)]">English</p>
                </div>
                <span className="font-semibold text-[var(--chart-purple)]">92%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Student Satisfaction</span>
                <span className="font-semibold text-[var(--chart-green)]">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Class Performance</span>
                <span className="font-semibold text-[var(--chart-blue)]">88%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Professional Development</span>
                <span className="font-semibold text-[var(--chart-purple)]">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Attendance Rate</span>
                <span className="font-semibold text-[var(--chart-yellow)]">96%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}