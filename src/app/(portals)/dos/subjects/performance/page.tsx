'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Users, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  BookOpen,
  Award,
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoSContext } from '@/components/dos/dos-context-provider';

interface SubjectPerformance {
  id: string;
  name: string;
  code: string;
  type: 'CORE' | 'OPTIONAL';
  currentAverage: number;
  previousAverage: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  trendPercentage: number;
  classBreakdown: {
    classId: string;
    className: string;
    average: number;
    studentCount: number;
    teacherId: string;
    teacherName: string;
    assessmentCount: number;
  }[];
  teacherImpact: {
    teacherId: string;
    teacherName: string;
    classes: string[];
    averagePerformance: number;
    studentCount: number;
    workloadHours: number;
    effectivenessRating: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  termComparison: {
    term: string;
    average: number;
    assessmentCount: number;
  }[];
  topPerformers: {
    classId: string;
    className: string;
    average: number;
    improvement: number;
  }[];
  underPerformers: {
    classId: string;
    className: string;
    average: number;
    decline: number;
  }[];
  alerts: string[];
}

export default function SubjectPerformancePage() {
  const { data: session } = useSession();
  const { currentTerm, academicYear } = useDoSContext();
  const [performanceData, setPerformanceData] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'CORE' | 'OPTIONAL'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'trend'>('performance');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user?.schoolId && currentTerm) {
      fetchPerformanceData();
    }
  }, [session, currentTerm]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dos/subjects/performance?termId=${currentTerm?.id}`);
      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPerformanceData();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: string, size = 'h-4 w-4') => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp className={`${size} text-[var(--chart-green)]`} />;
      case 'DECLINING': return <TrendingDown className={`${size} text-[var(--chart-red)]`} />;
      default: return <BarChart3 className={`${size} text-[var(--text-secondary)]`} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'IMPROVING': return 'text-[var(--chart-green)]';
      case 'DECLINING': return 'text-[var(--chart-red)]';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  const getPerformanceColor = (average: number) => {
    if (average >= 80) return 'text-[var(--chart-green)]';
    if (average >= 60) return 'text-[var(--chart-yellow)]';
    return 'text-[var(--chart-red)]';
  };

  const getEffectivenessColor = (rating: string) => {
    switch (rating) {
      case 'HIGH': return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]';
      case 'MEDIUM': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-amber-200';
      case 'LOW': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
    }
  };

  const filteredData = performanceData.filter(subject => 
    filterType === 'ALL' || subject.type === filterType
  );

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'performance':
        return b.currentAverage - a.currentAverage;
      case 'trend':
        return b.trendPercentage - a.trendPercentage;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--bg-surface)] rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  const overallAverage = performanceData.reduce((sum, s) => sum + s.currentAverage, 0) / performanceData.length || 0;
  const improvingSubjects = performanceData.filter(s => s.trend === 'IMPROVING').length;
  const decliningSubjects = performanceData.filter(s => s.trend === 'DECLINING').length;
  const totalAlerts = performanceData.reduce((sum, s) => sum + s.alerts.length, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Subject Performance Analysis</h1>
          <p className="text-[var(--text-secondary)]">Deep performance tracking with trend analysis and teacher impact</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Overall Average</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(overallAverage)}`}>
                  {overallAverage.toFixed(1)}%
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Across all subjects</p>
              </div>
              <Target className="h-8 w-8 text-[var(--chart-blue)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Improving</p>
                <p className="text-2xl font-bold text-[var(--chart-green)]">{improvingSubjects}</p>
                <p className="text-xs text-[var(--chart-green)] mt-1">Positive trend</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--chart-green)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Declining</p>
                <p className="text-2xl font-bold text-[var(--chart-red)]">{decliningSubjects}</p>
                <p className="text-xs text-[var(--chart-red)] mt-1">Need attention</p>
              </div>
              <TrendingDown className="h-8 w-8 text-[var(--chart-red)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Performance Alerts</p>
                <p className="text-2xl font-bold text-[var(--chart-yellow)]">{totalAlerts}</p>
                <p className="text-xs text-[var(--chart-yellow)] mt-1">Require review</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[var(--chart-yellow)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                >
                  <option value="ALL">All Types</option>
                  <option value="CORE">Core Subjects</option>
                  <option value="OPTIONAL">Optional Subjects</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[var(--text-secondary)]">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                >
                  <option value="performance">Performance</option>
                  <option value="name">Name</option>
                  <option value="trend">Trend</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-[var(--text-secondary)]">
              {academicYear} - {currentTerm?.name}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Subject Performance Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[var(--border-default)]">
                  <th className="text-left py-4 px-4 font-semibold text-[var(--text-primary)]">Subject</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Current Average</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Previous Average</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Trend</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Classes</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Teachers</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Alerts</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((subject) => (
                  <tr 
                    key={subject.id} 
                    className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{subject.name}</p>
                          <p className="text-sm text-[var(--text-muted)]">{subject.code}</p>
                          <Badge variant={subject.type === 'CORE' ? 'default' : 'secondary'} className="mt-1">
                            {subject.type}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`text-xl font-bold ${getPerformanceColor(subject.currentAverage)}`}>
                          {subject.currentAverage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-lg font-medium text-[var(--text-secondary)]">
                        {subject.previousAverage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getTrendIcon(subject.trend, 'h-5 w-5')}
                        <span className={`font-semibold ${getTrendColor(subject.trend)}`}>
                          {subject.trendPercentage > 0 ? '+' : ''}{subject.trendPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="font-medium">{subject.classBreakdown.length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="font-medium">{subject.teacherImpact.length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {subject.alerts.length > 0 ? (
                        <Badge variant="destructive">
                          {subject.alerts.length} Alert{subject.alerts.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-[var(--chart-green)] mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed View for Selected Subject */}
      {selectedSubject && (
        <div className="space-y-6">
          {(() => {
            const subject = performanceData.find(s => s.id === selectedSubject);
            if (!subject) return null;

            return (
              <>
                {/* Class Performance Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>{subject.name} - Class Performance Breakdown</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subject.classBreakdown.map((classData) => (
                        <Card key={classData.classId} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-[var(--text-primary)]">{classData.className}</h4>
                              <span className={`text-lg font-bold ${getPerformanceColor(classData.average)}`}>
                                {classData.average.toFixed(1)}%
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                              <div className="flex items-center justify-between">
                                <span>Students:</span>
                                <span className="font-medium">{classData.studentCount}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Teacher:</span>
                                <span className="font-medium">{classData.teacherName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Assessments:</span>
                                <span className="font-medium">{classData.assessmentCount}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Teacher Impact Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>{subject.name} - Teacher Impact Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-default)]">
                            <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Teacher</th>
                            <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Classes</th>
                            <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Students</th>
                            <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Average Performance</th>
                            <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Workload</th>
                            <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Effectiveness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subject.teacherImpact.map((teacher) => (
                            <tr key={teacher.teacherId} className="border-b border-[var(--border-default)]">
                              <td className="py-3 px-4">
                                <p className="font-medium text-[var(--text-primary)]">{teacher.teacherName}</p>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex flex-wrap justify-center gap-1">
                                  {teacher.classes.map((className, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {className}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="font-medium">{teacher.studentCount}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`text-lg font-bold ${getPerformanceColor(teacher.averagePerformance)}`}>
                                  {teacher.averagePerformance.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                                  <span>{teacher.workloadHours}h/week</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge className={`${getEffectivenessColor(teacher.effectivenessRating)} border`}>
                                  {teacher.effectivenessRating}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Alerts */}
                {subject.alerts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-[var(--chart-red)]" />
                        <span>{subject.name} - Performance Alerts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {subject.alerts.map((alert, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-[var(--chart-red)] mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--danger-dark)]">{alert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}