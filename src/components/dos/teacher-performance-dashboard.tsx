'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award,
  Clock,
  Target,
  FileText,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';

interface TeacherPerformanceData {
  teacher: {
    id: string;
    name: string;
    email: string;
    subjects: string[];
    classes: string[];
  };
  metrics: {
    totalStudents: number;
    totalAssessments: number;
    averageClassPerformance: number;
    attendanceRate: number;
    gradingEfficiency: number;
    studentSatisfaction: number;
  };
  assessmentStats: {
    totalCreated: number;
    totalGraded: number;
    averageGradingTime: number;
    pendingGrading: number;
  };
  classPerformance: Array<{
    className: string;
    averageScore: number;
    passRate: number;
    totalStudents: number;
  }>;
  subjectPerformance: Array<{
    subjectName: string;
    averageScore: number;
    passRate: number;
    totalAssessments: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    averageScore: number;
    passRate: number;
    assessmentsCreated: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    status: string;
  }>;
}

interface TeacherPerformanceDashboardProps {
  teacherId?: string;
  showComparison?: boolean;
}

  const COLORS = ['var(--recharts-blue)', 'var(--recharts-green)', 'var(--recharts-yellow)', 'var(--recharts-orange)', 'var(--recharts-purple)'];

export function TeacherPerformanceDashboard({ 
  teacherId, 
  showComparison = false 
}: TeacherPerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<TeacherPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-term');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPerformanceData();
  }, [teacherId, selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(teacherId && { teacherId })
      });
      
      const response = await fetch(`/api/dos/teacher-performance?${params}`);
      const data = await response.json();
      setPerformanceData(data.performance);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-[var(--chart-green)]';
    if (score >= 80) return 'text-[var(--chart-blue)]';
    if (score >= 70) return 'text-[var(--chart-yellow)]';
    return 'text-[var(--chart-red)]';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-[var(--info-light)] text-[var(--info-dark)]">Good</Badge>;
    if (score >= 70) return <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)]">Average</Badge>;
    return <Badge className="bg-[var(--danger-light)] text-[var(--danger-dark)]">Needs Improvement</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-[var(--bg-surface)] rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <Card className="p-6">
        <p className="text-center text-[var(--text-muted)]">No performance data available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teacher Performance Dashboard</h2>
          {performanceData.teacher && (
            <p className="text-[var(--text-secondary)]">{performanceData.teacher.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="current-term">Current Term</option>
            <option value="last-term">Last Term</option>
            <option value="current-year">Current Year</option>
            <option value="last-year">Last Year</option>
          </select>
          <Button onClick={fetchPerformanceData}>Refresh</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total Students</p>
              <p className="text-2xl font-bold">{performanceData.metrics.totalStudents}</p>
            </div>
            <Users className="h-8 w-8 text-[var(--chart-blue)]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Assessments Created</p>
              <p className="text-2xl font-bold">{performanceData.metrics.totalAssessments}</p>
            </div>
            <FileText className="h-8 w-8 text-[var(--chart-green)]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Class Performance</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(performanceData.metrics.averageClassPerformance)}`}>
                {performanceData.metrics.averageClassPerformance.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-[var(--chart-purple)]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Grading Efficiency</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(performanceData.metrics.gradingEfficiency)}`}>
                {performanceData.metrics.gradingEfficiency.toFixed(1)}%
              </p>
            </div>
            <Clock className="h-8 w-8 text-[var(--chart-yellow)]" />
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Class Performance</span>
                  <div className="flex items-center gap-2">
                    <span className={getPerformanceColor(performanceData.metrics.averageClassPerformance)}>
                      {performanceData.metrics.averageClassPerformance.toFixed(1)}%
                    </span>
                    {getPerformanceBadge(performanceData.metrics.averageClassPerformance)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Attendance Rate</span>
                  <div className="flex items-center gap-2">
                    <span className={getPerformanceColor(performanceData.metrics.attendanceRate)}>
                      {performanceData.metrics.attendanceRate.toFixed(1)}%
                    </span>
                    {getPerformanceBadge(performanceData.metrics.attendanceRate)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Student Satisfaction</span>
                  <div className="flex items-center gap-2">
                    <span className={getPerformanceColor(performanceData.metrics.studentSatisfaction)}>
                      {performanceData.metrics.studentSatisfaction.toFixed(1)}%
                    </span>
                    {getPerformanceBadge(performanceData.metrics.studentSatisfaction)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Assessment Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Assessment Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Created</span>
                  <span className="font-semibold">{performanceData.assessmentStats.totalCreated}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Graded</span>
                  <span className="font-semibold">{performanceData.assessmentStats.totalGraded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Grading</span>
                  <span className="font-semibold text-[var(--chart-yellow)]">
                    {performanceData.assessmentStats.pendingGrading}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg. Grading Time</span>
                  <span className="font-semibold">
                    {performanceData.assessmentStats.averageGradingTime} hrs
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
            <div className="flex items-center justify-center h-64 bg-[var(--bg-surface)] rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)]">Chart visualization coming soon</p>
                <p className="text-sm text-[var(--text-muted)]">Install recharts package for full charts</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              {performanceData.monthlyTrends.map((trend, index) => (
                <div key={index} className="text-center p-2 bg-[var(--bg-surface)] rounded">
                  <div className="font-medium">{trend.month}</div>
                  <div className="text-[var(--chart-blue)]">{trend.averageScore}% avg</div>
                  <div className="text-[var(--chart-green)]">{trend.passRate}% pass</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Class Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Class Performance</h3>
              <div className="flex items-center justify-center h-64 bg-[var(--bg-surface)] rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)]">Chart visualization coming soon</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {performanceData.classPerformance.map((classData, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-[var(--bg-surface)] rounded">
                    <span className="font-medium">{classData.className}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-[var(--chart-blue)]">{classData.averageScore}% avg</span>
                      <span className="text-[var(--chart-green)]">{classData.passRate}% pass</span>
                      <span className="text-[var(--text-secondary)]">{classData.totalStudents} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Subject Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Subject Performance</h3>
              <div className="flex items-center justify-center h-64 bg-[var(--bg-surface)] rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)]">Chart visualization coming soon</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {performanceData.subjectPerformance.map((subjectData, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-[var(--bg-surface)] rounded">
                    <span className="font-medium">{subjectData.subjectName}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-[var(--chart-blue)]">{subjectData.averageScore}% avg</span>
                      <span className="text-[var(--chart-green)]">{subjectData.passRate}% pass</span>
                      <span className="text-[var(--text-secondary)]">{subjectData.totalAssessments} assessments</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assessment Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">By Subject</h4>
                <div className="flex items-center justify-center h-64 bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--text-muted)]">Chart visualization coming soon</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {performanceData.subjectPerformance.map((subject, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-[var(--bg-surface)] rounded">
                      <span className="font-medium">{subject.subjectName}</span>
                      <span className="text-[var(--chart-blue)]">{subject.totalAssessments} assessments</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Assessment Status</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[var(--success-light)] rounded">
                    <span>Completed & Graded</span>
                    <span className="font-semibold text-[var(--chart-green)]">
                      {performanceData.assessmentStats.totalGraded}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--warning-light)] rounded">
                    <span>Pending Grading</span>
                    <span className="font-semibold text-[var(--chart-yellow)]">
                      {performanceData.assessmentStats.pendingGrading}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--info-light)] rounded">
                    <span>Total Created</span>
                    <span className="font-semibold text-[var(--chart-blue)]">
                      {performanceData.assessmentStats.totalCreated}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            <div className="space-y-3">
              {performanceData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'completed' ? 'bg-[var(--success)]' :
                      activity.status === 'pending' ? 'bg-[var(--warning)]' : 'bg-[var(--text-muted)]'
                    }`} />
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}