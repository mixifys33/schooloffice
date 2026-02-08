'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';

interface SubjectAnalytics {
  totalSubjects: number;
  coreSubjects: number;
  electiveSubjects: number;
  totalEnrollment: number;
  averageClassSize: number;
  teacherUtilization: number;
}

export default function SubjectAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SubjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockAnalytics: SubjectAnalytics = {
      totalSubjects: 15,
      coreSubjects: 8,
      electiveSubjects: 7,
      totalEnrollment: 450,
      averageClassSize: 30,
      teacherUtilization: 85
    };
    
    setTimeout(() => {
      setAnalytics(mockAnalytics);
      setLoading(false);
    }, 500);
  }, []);

  const handleBack = () => {
    router.push('/dashboard/dos/subjects/management');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subject Management
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subject Management
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Subject Analytics</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">View subject performance metrics and insights</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-[var(--chart-blue)]" />
                <span>Total Subjects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.totalSubjects}</div>
              <p className="text-sm text-[var(--text-secondary)]">Active subjects in curriculum</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-[var(--chart-green)]" />
                <span>Core Subjects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.coreSubjects}</div>
              <p className="text-sm text-[var(--text-secondary)]">Required curriculum subjects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--chart-purple)]" />
                <span>Elective Subjects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.electiveSubjects}</div>
              <p className="text-sm text-[var(--text-secondary)]">Optional subjects available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-[var(--chart-orange)]" />
                <span>Total Enrollment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.totalEnrollment}</div>
              <p className="text-sm text-[var(--text-secondary)]">Students enrolled across all subjects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-[var(--chart-red)]" />
                <span>Average Class Size</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.averageClassSize}</div>
              <p className="text-sm text-[var(--text-secondary)]">Students per class on average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[var(--chart-blue)]" />
                <span>Teacher Utilization</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[var(--text-primary)]">{analytics.teacherUtilization}%</div>
              <p className="text-sm text-[var(--text-secondary)]">Teacher capacity utilization</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}