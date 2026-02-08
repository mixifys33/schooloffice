'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  ClipboardCheck, 
  GraduationCap, 
  AlertTriangle,
  Target,
  Shield,
  Calendar,
  Activity
} from 'lucide-react';

interface DoSDashboardData {
  curriculumStatus: {
    totalSubjects: number;
    approvedSubjects: number;
    pendingApproval: number;
    approvalRate: number;
  };
  assessmentStatus: {
    totalPlans: number;
    approvedPlans: number;
    overduePlans: number;
    averageCompletion: number;
  };
  examStatus: {
    totalExams: number;
    approvedExams: number;
    pastDueExams: number;
    averageCompletion: number;
  };
  finalScoresStatus: {
    totalScores: number;
    approvedScores: number;
    pendingApproval: number;
    passRate: number;
  };
  reportCardStatus: {
    totalReports: number;
    approvedReports: number;
    publishedReports: number;
    publicationRate: number;
  };
  recentActivity: Array<{
    action: string;
    resourceType: string;
    resourceName: string;
    timestamp: Date;
    userRole: string;
  }>;
  alerts: Array<{
    type: 'WARNING' | 'ERROR' | 'INFO';
    message: string;
    count?: number;
  }>;
}

export default function DoSDashboard() {
  const [dashboardData, setDashboardData] = useState<DoSDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    console.log('🚀 fetchDashboardData called');
    try {
      setLoading(true);
      console.log('🔍 Fetching DOS dashboard data...');
      
      const response = await fetch('/api/dos/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache', // Prevent caching issues
      });
      
      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Server returned non-JSON response:', contentType);
        const textResponse = await response.text();
        console.error('❌ Response body:', textResponse);
        throw new Error('Server returned non-JSON response (likely an error page)');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ DOS Dashboard data received:', data);
      console.log('🎯 About to call setDashboardData with:', data);
      
      // Force a re-render by setting to null first, then the data
      setDashboardData(null);
      setTimeout(() => {
        console.log('🎯 Setting dashboardData to:', data);
        setDashboardData(data);
        console.log('✅ setDashboardData called successfully');
      }, 100);
      
    } catch (error) {
      console.error('❌ Failed to fetch DoS dashboard data:', error);
      // Fallback to empty data structure with error message
      const fallbackData = {
        curriculumStatus: {
          totalSubjects: 0,
          approvedSubjects: 0,
          pendingApproval: 0,
          approvalRate: 0
        },
        assessmentStatus: {
          totalPlans: 0,
          approvedPlans: 0,
          overduePlans: 0,
          averageCompletion: 0
        },
        examStatus: {
          totalExams: 0,
          approvedExams: 0,
          pastDueExams: 0,
          averageCompletion: 0
        },
        finalScoresStatus: {
          totalScores: 0,
          approvedScores: 0,
          pendingApproval: 0,
          passRate: 0
        },
        reportCardStatus: {
          totalReports: 0,
          approvedReports: 0,
          publishedReports: 0,
          publicationRate: 0
        },
        recentActivity: [],
        alerts: [{
          type: 'ERROR' as const,
          message: `Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }]
      };
      console.log('📊 Setting fallback data:', fallbackData);
      setDashboardData(fallbackData);
    } finally {
      setTimeout(() => {
        setLoading(false);
        console.log('✅ fetchDashboardData completed, loading set to false');
      }, 200);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Academic Overview</h1>
            <p className="text-[var(--text-secondary)] mt-1">Loading academic data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-[var(--bg-main)] p-6 rounded-lg border">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-[var(--bg-surface)] rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-[var(--bg-main)] p-6 rounded-lg border">
                <div className="h-6 bg-[var(--bg-surface)] rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-[var(--bg-surface)] rounded"></div>
                  <div className="h-4 bg-[var(--bg-surface)] rounded w-5/6"></div>
                  <div className="h-4 bg-[var(--bg-surface)] rounded w-4/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Add null check for dashboardData
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
          <h2 className="text-lg font-semibold text-[var(--warning-dark)]">No Dashboard Data</h2>
          <p className="text-[var(--chart-yellow)]">Dashboard data is not available. Check the browser console for API call details.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Expected API data but dashboardData is: {JSON.stringify(dashboardData)}
          </p>
          <Button 
            onClick={fetchDashboardData} 
            className="mt-3"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Retry Loading Data'}
          </Button>
        </div>
      </div>
    );
  }

  console.log('🎯 Component using dashboardData:', dashboardData);
  const data = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Academic Overview</h1>
          <p className="text-[var(--text-secondary)] mt-1">Monitor curriculum compliance and academic integrity</p>
          {/* Debug info */}
          <details className="mt-2">
            <summary className="text-xs text-[var(--text-muted)] cursor-pointer">Debug Info (Click to expand)</summary>
            <div className="text-xs bg-[var(--bg-surface)] p-2 rounded mt-1 overflow-auto max-h-32">
              <p><strong>Dashboard Data:</strong></p>
              <pre>{JSON.stringify(data, null, 2)}</pre>
              <p className="mt-2"><strong>Loading State:</strong> {loading.toString()}</p>
              <p><strong>Data Null Check:</strong> {(data === null).toString()}</p>
              <p><strong>Data Type:</strong> {typeof data}</p>
            </div>
          </details>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-[var(--chart-yellow)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-[var(--warning-dark)]">Attention Required</h3>
              <div className="mt-1 space-y-1">
                {data.alerts.map((alert, index) => (
                  <p key={index} className="text-sm text-[var(--warning)]">
                    {alert.message} {alert.count && `(${alert.count})`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Curriculum Approval</CardTitle>
            <div className="p-2 rounded-lg border bg-[var(--info-light)] text-[var(--chart-blue)] border-[var(--info-light)]">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{data.curriculumStatus.approvalRate.toFixed(1)}%</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{data.curriculumStatus.approvedSubjects}/{data.curriculumStatus.totalSubjects} subjects approved</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Assessment Completion</CardTitle>
            <div className="p-2 rounded-lg border bg-[var(--success-light)] text-[var(--chart-green)] border-[var(--success-light)]">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{data.assessmentStatus.averageCompletion.toFixed(1)}%</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{data.assessmentStatus.approvedPlans}/{data.assessmentStatus.totalPlans} plans completed</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Exam Progress</CardTitle>
            <div className="p-2 rounded-lg border bg-[var(--warning-light)] text-[var(--chart-yellow)] border-[var(--warning-light)]">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{data.examStatus.averageCompletion.toFixed(1)}%</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{data.examStatus.approvedExams}/{data.examStatus.totalExams} exams approved</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Report Cards</CardTitle>
            <div className="p-2 rounded-lg border bg-[var(--info-light)] text-[var(--chart-purple)] border-[var(--info-light)]">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{data.reportCardStatus.publicationRate.toFixed(1)}%</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">{data.reportCardStatus.publishedReports}/{data.reportCardStatus.totalReports} published</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-[var(--chart-blue)]" />
                  Academic Status
                </CardTitle>
                <CardDescription>Current term academic integrity overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Curriculum Compliance</span>
                    <Badge variant="secondary" className="bg-[var(--success-light)] text-[var(--success-dark)]">
                      {data.curriculumStatus.approvalRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Assessment Integrity</span>
                    <Badge variant="secondary" className="bg-[var(--info-light)] text-[var(--info-dark)]">
                      {data.assessmentStatus.averageCompletion.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Pass Rate</span>
                    <Badge variant="secondary" className="bg-[var(--info-light)] text-[var(--info-dark)]">
                      {data.finalScoresStatus.passRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-[var(--chart-green)]" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest academic management actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--bg-surface)]">
                      <div className="w-2 h-2 bg-[var(--chart-blue)] rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">
                          {activity.action} {activity.resourceType}: {activity.resourceName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="curriculum" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subject Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--chart-blue)]">
                  {data.curriculumStatus.approvedSubjects}/{data.curriculumStatus.totalSubjects}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-1">Subjects approved</p>
                {data.curriculumStatus.pendingApproval > 0 && (
                  <p className="text-xs text-[var(--chart-yellow)] mt-2">
                    {data.curriculumStatus.pendingApproval} pending approval
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classes Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--chart-green)]">{data.assessmentStatus.totalPlans / 4}</div>
                <p className="text-sm text-[var(--text-muted)] mt-1">Active classes</p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {data.assessmentStatus.totalPlans} assessment plans total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Enrollment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[var(--chart-purple)]">{data.finalScoresStatus.totalScores}</div>
                <p className="text-sm text-[var(--text-muted)] mt-1">Total students</p>
                <p className="text-xs text-[var(--chart-green)] mt-2">
                  {data.finalScoresStatus.passRate}% pass rate
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Plans</CardTitle>
                <CardDescription>Continuous Assessment (20%) monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approved Plans</span>
                    <span className="font-semibold">{data.assessmentStatus.approvedPlans}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overdue Plans</span>
                    <Badge variant="destructive">{data.assessmentStatus.overduePlans}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <span className="font-semibold text-[var(--chart-green)]">
                      {data.assessmentStatus.averageCompletion.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teacher Performance</CardTitle>
                <CardDescription>Assessment submission tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On-time Submissions</span>
                    <Badge variant="secondary" className="bg-[var(--success-light)] text-[var(--success-dark)]">
                      {Math.round((data.assessmentStatus.approvedPlans / Math.max(data.assessmentStatus.totalPlans, 1)) * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Late Submissions</span>
                    <Badge variant="secondary" className="bg-[var(--warning-light)] text-[var(--warning-dark)]">
                      {Math.round((data.assessmentStatus.overduePlans / Math.max(data.assessmentStatus.totalPlans, 1)) * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-3">
                    Based on {data.assessmentStatus.totalPlans} assessment plans
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}