'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Settings,
  Eye,
  Edit,
  Flag,
  UserCheck,
  Calendar,
  FileText,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoSContext } from '@/components/dos/dos-context-provider';

interface SubjectOverview {
  id: string;
  name: string;
  code: string;
  type: 'CORE' | 'OPTIONAL';
  level: 'PRIMARY' | 'SECONDARY' | 'BOTH';
  classesOffered: number;
  teachersAssigned: number;
  weeklyPeriodLoad: number;
  syllabusCoverage: number;
  expectedCoverage: number;
  averagePerformance: number;
  previousPerformance: number;
  riskStatus: 'GREEN' | 'AMBER' | 'RED';
  lastUpdated: string;
  performanceTrend: 'UP' | 'DOWN' | 'STABLE';
  teacherStability: 'STABLE' | 'UNSTABLE';
  assessmentCompletion: number;
  teacherChanges: number;
  unebRelevance: boolean;
  alerts: string[];
}

interface AcademicHealthIndicator {
  subjectId: string;
  subjectName: string;
  coverageHealth: {
    actual: number;
    expected: number;
    status: 'ON_TRACK' | 'BEHIND' | 'AHEAD';
    weeksRemaining: number;
  };
  performanceHealth: {
    current: number;
    previous: number;
    change: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  };
  teacherHealth: {
    stability: 'STABLE' | 'UNSTABLE';
    changes: number;
    overloaded: boolean;
  };
  assessmentHealth: {
    completion: number;
    missing: number;
    overdue: number;
  };
  criticalAlerts: string[];
  recommendations: string[];
}

export default function DoSSubjectsPage() {
  const { data: session } = useSession();
  const { currentTerm, schoolStatus, academicYear } = useDoSContext();
  const [subjects, setSubjects] = useState<SubjectOverview[]>([]);
  const [healthIndicators, setHealthIndicators] = useState<AcademicHealthIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user?.schoolId && currentTerm) {
      fetchSubjectsData();
    }
  }, [session, currentTerm]);

  const fetchSubjectsData = async () => {
    try {
      setLoading(true);
      
      // Fetch comprehensive subjects data
      const [subjectsResponse, healthResponse] = await Promise.all([
        fetch(`/api/dos/subjects/overview?termId=${currentTerm?.id}&includeHealth=true`),
        fetch(`/api/dos/subjects/health-indicators?termId=${currentTerm?.id}`)
      ]);

      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData);
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthIndicators(healthData);
      }
    } catch (error) {
      console.error('Error fetching subjects data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubjectsData();
    setRefreshing(false);
  };

  const getRiskStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]';
      case 'AMBER': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-amber-200';
      case 'RED': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
    }
  };

  const getRiskStatusIcon = (status: string) => {
    switch (status) {
      case 'GREEN': return <CheckCircle className="h-4 w-4" />;
      case 'AMBER': return <AlertCircle className="h-4 w-4" />;
      case 'RED': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />;
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />;
      default: return <BarChart3 className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  const getCoverageStatus = (actual: number, expected: number) => {
    const ratio = actual / expected;
    if (ratio >= 0.95) return { status: 'ON_TRACK', color: 'text-[var(--chart-green)]' };
    if (ratio >= 0.8) return { status: 'BEHIND', color: 'text-[var(--chart-yellow)]' };
    return { status: 'CRITICAL', color: 'text-[var(--chart-red)]' };
  };

  const handleSubjectAction = async (subjectId: string, action: string) => {
    try {
      const response = await fetch(`/api/dos/subjects/${subjectId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, termId: currentTerm?.id })
      });
      
      if (response.ok) {
        await fetchSubjectsData(); // Refresh data
      }
    } catch (error) {
      console.error('Error performing subject action:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-[var(--bg-surface)] rounded"></div>
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

  const criticalSubjects = subjects.filter(s => s.riskStatus === 'RED');
  const warningSubjects = subjects.filter(s => s.riskStatus === 'AMBER');
  const healthySubjects = subjects.filter(s => s.riskStatus === 'GREEN');
  const totalAlerts = subjects.reduce((sum, s) => sum + s.alerts.length, 0);

  return (
    <div className="space-y-6">
      {/* Academic Context Bar - Fixed at top */}
      <div className="bg-[var(--bg-main)] border border-[var(--border-default)] rounded-lg p-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">DoS Subject Control Center</h1>
              <p className="text-sm text-[var(--text-secondary)]">Academic oversight and intervention dashboard</p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <span className="text-[var(--text-muted)]">Academic Year:</span>
                  <span className="ml-1 font-semibold">{academicYear || '2024/2025'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <span className="text-[var(--text-muted)]">Term:</span>
                  <span className="ml-1 font-semibold">{currentTerm?.name || 'Term 1'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <span className="text-[var(--text-muted)]">Level:</span>
                  <span className="ml-1 font-semibold">Primary & Secondary</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <span className="text-[var(--text-muted)]">System:</span>
                  <span className="ml-1 font-semibold">UNEB Aligned</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={`${schoolStatus === 'OPEN' ? 'bg-[var(--success-light)] text-[var(--success-dark)]' : 'bg-[var(--warning-light)] text-[var(--warning-dark)]'}`}>
              {schoolStatus || 'ACTIVE'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Subject Health Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Subjects</p>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Active this term</p>
                </div>
                <BookOpen className="h-8 w-8 text-[var(--chart-blue)]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Critical Risk</p>
                  <p className="text-2xl font-bold text-[var(--chart-red)]">{criticalSubjects.length}</p>
                  <p className="text-xs text-[var(--danger)] mt-1">Immediate action needed</p>
                </div>
                <XCircle className="h-8 w-8 text-[var(--chart-red)]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Need Attention</p>
                  <p className="text-2xl font-bold text-[var(--chart-yellow)]">{warningSubjects.length}</p>
                  <p className="text-xs text-[var(--chart-yellow)] mt-1">Monitor closely</p>
                </div>
                <AlertCircle className="h-8 w-8 text-[var(--chart-yellow)]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Healthy</p>
                  <p className="text-2xl font-bold text-[var(--chart-green)]">{healthySubjects.length}</p>
                  <p className="text-xs text-[var(--chart-green)] mt-1">On track</p>
                </div>
                <CheckCircle className="h-8 w-8 text-[var(--chart-green)]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Active Alerts</p>
                  <p className="text-2xl font-bold text-[var(--chart-yellow)]">{totalAlerts}</p>
                  <p className="text-xs text-[var(--chart-yellow)] mt-1">Require review</p>
                </div>
                <Zap className="h-8 w-8 text-[var(--chart-yellow)]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Overview Table - Command Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Subject Command Map</span>
                <Badge variant="outline" className="ml-2">
                  {subjects.length} Subjects
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[var(--border-default)]">
                    <th className="text-left py-4 px-4 font-semibold text-[var(--text-primary)]">Subject</th>
                    <th className="text-left py-4 px-4 font-semibold text-[var(--text-primary)]">Type</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Classes</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Teachers</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Weekly Load</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Coverage %</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Performance</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Risk Status</th>
                    <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">DoS Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const coverageStatus = getCoverageStatus(subject.syllabusCoverage, subject.expectedCoverage);
                    const performanceChange = subject.averagePerformance - subject.previousPerformance;
                    
                    return (
                      <tr 
                        key={subject.id} 
                        className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)] cursor-pointer transition-colors"
                        onClick={() => setSelectedSubject(subject.id)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-[var(--text-primary)]">{subject.name}</p>
                                {subject.unebRelevance && (
                                  <Badge variant="outline" className="text-xs">UNEB</Badge>
                                )}
                              </div>
                              <p className="text-sm text-[var(--text-muted)]">{subject.code}</p>
                              {subject.alerts.length > 0 && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <AlertTriangle className="h-3 w-3 text-[var(--danger)]" />
                                  <span className="text-xs text-[var(--chart-red)]">{subject.alerts.length} alert{subject.alerts.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                            {getTrendIcon(subject.performanceTrend)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Badge variant={subject.type === 'CORE' ? 'default' : 'secondary'}>
                              {subject.type}
                            </Badge>
                            <p className="text-xs text-[var(--text-muted)]">{subject.level}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-lg">{subject.classesOffered}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Users className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className={`font-semibold ${subject.teacherStability === 'UNSTABLE' ? 'text-[var(--chart-red)]' : 'text-[var(--text-primary)]'}`}>
                              {subject.teachersAssigned}
                            </span>
                            {subject.teacherChanges > 0 && (
                              <Badge variant="destructive" className="text-xs ml-1">
                                {subject.teacherChanges} changes
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="font-semibold">{subject.weeklyPeriodLoad}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-16 bg-[var(--bg-surface)] rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    coverageStatus.status === 'ON_TRACK' ? 'bg-[var(--success)]' :
                                    coverageStatus.status === 'BEHIND' ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                                  }`}
                                  style={{ width: `${Math.min(subject.syllabusCoverage, 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-semibold ${coverageStatus.color}`}>
                                {subject.syllabusCoverage}%
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                              Expected: {subject.expectedCoverage}%
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center space-x-1">
                              <Target className="h-4 w-4 text-[var(--text-muted)]" />
                              <span className="font-semibold text-lg">{subject.averagePerformance}%</span>
                            </div>
                            {performanceChange !== 0 && (
                              <div className={`text-xs flex items-center justify-center space-x-1 ${
                                performanceChange > 0 ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'
                              }`}>
                                {performanceChange > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                <span>{Math.abs(performanceChange).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge className={`${getRiskStatusColor(subject.riskStatus)} border font-semibold`}>
                            <div className="flex items-center space-x-1">
                              {getRiskStatusIcon(subject.riskStatus)}
                              <span>{subject.riskStatus}</span>
                            </div>
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to subject detail
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubjectAction(subject.id, 'assign_teacher');
                              }}
                              title="Assign Teacher"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubjectAction(subject.id, 'flag_review');
                              }}
                              title="Flag for Review"
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* DoS Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>DoS Powers & Interventions</span>
              <Badge variant="outline">Direct Control</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]"
                onClick={() => {/* Handle teacher assignment */}}
              >
                <UserCheck className="h-6 w-6" />
                <span className="text-sm font-medium">Assign Teachers</span>
                <span className="text-xs opacity-90">Override assignments</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center space-y-2 border-amber-300 hover:bg-[var(--warning-light)]"
                onClick={() => {/* Handle workload adjustment */}}
              >
                <Clock className="h-6 w-6 text-[var(--chart-yellow)]" />
                <span className="text-sm font-medium">Adjust Workload</span>
                <span className="text-xs text-[var(--chart-yellow)]">Modify period allocation</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center space-y-2 border-[var(--danger)] hover:bg-[var(--danger-light)]"
                onClick={() => {/* Handle academic review */}}
              >
                <Flag className="h-6 w-6 text-[var(--chart-red)]" />
                <span className="text-sm font-medium">Flag for Review</span>
                <span className="text-xs text-[var(--chart-red)]">Academic intervention</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center space-y-2 border-[var(--success)] hover:bg-[var(--success-light)]"
                onClick={() => {/* Handle recovery plan */}}
              >
                <Activity className="h-6 w-6 text-[var(--chart-green)]" />
                <span className="text-sm font-medium">Recovery Plan</span>
                <span className="text-xs text-[var(--chart-green)]">Syllabus catch-up</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Academic Health Alerts */}
        {healthIndicators.filter(h => h.criticalAlerts.length > 0).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-[var(--chart-red)]" />
                <span>Critical Academic Alerts</span>
                <Badge variant="destructive">
                  {healthIndicators.reduce((sum, h) => sum + h.criticalAlerts.length, 0)} Alerts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthIndicators.filter(h => h.criticalAlerts.length > 0).map((indicator) => (
                  <div key={indicator.subjectId} className="border border-[var(--danger-light)] rounded-lg p-4 bg-[var(--danger-light)]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-[var(--danger-dark)]">{indicator.subjectName}</h4>
                      <Badge variant="destructive">
                        {indicator.criticalAlerts.length} Critical Alert{indicator.criticalAlerts.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {indicator.criticalAlerts.map((alert, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 text-[var(--chart-red)] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[var(--danger-dark)]">{alert}</span>
                        </div>
                      ))}
                    </div>
                    {indicator.recommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--danger-light)]">
                        <p className="text-sm font-medium text-[var(--danger-dark)] mb-2">Recommended Actions:</p>
                        <ul className="space-y-1">
                          {indicator.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-[var(--chart-red)] flex items-start space-x-2">
                              <CheckCircle className="h-3 w-3 text-[var(--chart-red)] mt-1 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}