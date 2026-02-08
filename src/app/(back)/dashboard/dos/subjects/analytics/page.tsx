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
  totalTeachers: number;
  totalStudents: number;
  averageClassSize: number;
  popularElectives: Array<{
    name: string;
    enrollmentRate: number;
    students: number;
  }>;
  teacherWorkload: Array<{
    name: string;
    subjects: number;
    classes: number;
    students: number;
  }>;
}

export default function SubjectAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SubjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockAnalytics: SubjectAnalytics = {
      totalSubjects: 12,
      coreSubjects: 4,
      electiveSubjects: 8,
      totalTeachers: 25,
      totalStudents: 450,
      averageClassSize: 28,
      popularElectives: [
        { name: 'Computer Science', enrollmentRate: 85, students: 45 },
        { name: 'Physical Education', enrollmentRate: 90, students: 60 },
        { name: 'Art & Design', enrollmentRate: 70, students: 32 },
        { name: 'Music', enrollmentRate: 60, students: 28 }
      ],
      teacherWorkload: [
        { name: 'John Smith', subjects: 2, classes: 6, students: 150 },
        { name: 'Sarah Johnson', subjects: 1, classes: 4, students: 120 },
        { name: 'Mike Brown', subjects: 3, classes: 8, students: 180 },
        { name: 'Lisa Davis', subjects: 2, classes: 5, students: 140 }
      ]
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
            Back
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Subject Analytics</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">View subject performance metrics and insights</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-[var(--chart-blue)]" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalSubjects}</p>
                <p className="text-sm text-[var(--text-secondary)]">Total Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-[var(--chart-green)]" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalTeachers}</p>
                <p className="text-sm text-[var(--text-secondary)]">Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-[var(--chart-purple)]" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalStudents}</p>
                <p className="text-sm text-[var(--text-secondary)]">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-[var(--chart-orange)]" />
              <div>
                <p className="text-2xl font-bold">{analytics.averageClassSize}</p>
                <p className="text-sm text-[var(--text-secondary)]">Avg Class Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Electives */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Elective Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularElectives.map((subject, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{subject.students} students</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--chart-green)]">{subject.enrollmentRate}%</p>
                    <p className="text-xs text-[var(--text-secondary)]">enrollment</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Teacher Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Teacher Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.teacherWorkload.map((teacher, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium">{teacher.name}</p>
                  <div className="flex justify-between text-sm text-[var(--text-secondary)] mt-1">
                    <span>{teacher.subjects} subjects</span>
                    <span>{teacher.classes} classes</span>
                    <span>{teacher.students} students</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--chart-blue)] mb-2">
                {analytics.coreSubjects}
              </div>
              <p className="text-[var(--text-secondary)]">Core Subjects</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {Math.round((analytics.coreSubjects / analytics.totalSubjects) * 100)}% of total
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--chart-green)] mb-2">
                {analytics.electiveSubjects}
              </div>
              <p className="text-[var(--text-secondary)]">Elective Subjects</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {Math.round((analytics.electiveSubjects / analytics.totalSubjects) * 100)}% of total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}