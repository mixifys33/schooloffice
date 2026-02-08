'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft,
  BookOpen,
  Users,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  FileText,
  Award,
  Settings,
  Edit,
  Flag,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDoSContext } from '@/components/dos/dos-context-provider';

interface SubjectProfile {
  id: string;
  name: string;
  code: string;
  level: string;
  type: 'CORE' | 'OPTIONAL';
  unebRelevance: boolean;
  description?: string;
}

interface SubjectDistribution {
  classId: string;
  className: string;
  stream?: string;
  assignedTeacher: {
    id: string;
    name: string;
    qualifications?: string;
  };
  weeklyPeriods: number;
  studentCount: number;
  averagePerformance: number;
}

interface SyllabusTracker {
  topicId: string;
  topicName: string;
  completionPercent: number;
  lastUpdated: string;
  teacherResponsible: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

interface PerformanceBreakdown {
  classId: string;
  className: string;
  averageScore: number;
  topPerformers: number;
  bottomPerformers: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  termComparison: {
    current: number;
    previous: number;
    change: number;
  };
}

interface TeacherImpact {
  teacherId: string;
  teacherName: string;
  classesTeaching: number;
  averagePerformance: number;
  workloadHours: number;
  performanceVsLoad: number;
  qualificationMatch: boolean;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { currentTerm } = useDoSContext();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  const [subjectProfile, setSubjectProfile] = useState<SubjectProfile | null>(null);
  const [distribution, setDistribution] = useState<SubjectDistribution[]>([]);
  const [syllabusTracker, setSyllabusTracker] = useState<SyllabusTracker[]>([]);
  const [performanceBreakdown, setPerformanceBreakdown] = useState<PerformanceBreakdown[]>([]);
  const [teacherImpact, setTeacherImpact] = useState<TeacherImpact[]>([]);

  useEffect(() => {
    if (params.id && session?.user?.schoolId && currentTerm) {
      fetchSubjectDetails();
    }
  }, [params.id, session, currentTerm]);

  const fetchSubjectDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch subject profile
      const profileResponse = await fetch(`/api/dos/subjects/${params.id}/profile?termId=${currentTerm?.id}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setSubjectProfile(profileData);
      }

      // Fetch subject distribution
      const distributionResponse = await fetch(`/api/dos/subjects/${params.id}/distribution?termId=${currentTerm?.id}`);
      if (distributionResponse.ok) {
        const distributionData = await distributionResponse.json();
        setDistribution(distributionData);
      }

      // Fetch syllabus tracker
      const syllabusResponse = await fetch(`/api/dos/subjects/${params.id}/syllabus?termId=${currentTerm?.id}`);
      if (syllabusResponse.ok) {
        const syllabusData = await syllabusResponse.json();
        setSyllabusTracker(syllabusData);
      }

      // Fetch performance breakdown
      const performanceResponse = await fetch(`/api/dos/subjects/${params.id}/performance?termId=${currentTerm?.id}`);
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceBreakdown(performanceData);
      }

      // Fetch teacher impact
      const teacherResponse = await fetch(`/api/dos/subjects/${params.id}/teachers?termId=${currentTerm?.id}`);
      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json();
        setTeacherImpact(teacherData);
      }
    } catch (error) {
      console.error('Error fetching subject details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]';
      case 'IN_PROGRESS': return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]';
      case 'OVERDUE': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />;
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />;
      default: return <BarChart3 className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="h-32 bg-[var(--bg-surface)] rounded"></div>
          <div className="h-64 bg-[var(--bg-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  if (!subjectProfile) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-[var(--danger)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Subject Not Found</h3>
          <p className="text-[var(--text-secondary)] mb-4">The requested subject could not be found.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{subjectProfile.name}</h1>
            <p className="text-[var(--text-secondary)]">{subjectProfile.code} • {subjectProfile.level}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={subjectProfile.type === 'CORE' ? 'default' : 'secondary'}>
            {subjectProfile.type}
          </Badge>
          {subjectProfile.unebRelevance && (
            <Badge variant="outline" className="border-[var(--info-light)] text-[var(--info-dark)]">
              UNEB Aligned
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Classes</p>
                <p className="text-2xl font-bold">{distribution.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-[var(--chart-blue)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Teachers</p>
                <p className="text-2xl font-bold">{teacherImpact.length}</p>
              </div>
              <Users className="h-8 w-8 text-[var(--chart-green)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Students</p>
                <p className="text-2xl font-bold">
                  {distribution.reduce((sum, d) => sum + d.studentCount, 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-[var(--chart-purple)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Avg Performance</p>
                <p className="text-2xl font-bold">
                  {Math.round(distribution.reduce((sum, d) => sum + d.averagePerformance, 0) / distribution.length || 0)}%
                </p>
              </div>
              <Award className="h-8 w-8 text-[var(--chart-yellow)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">Subject Name</label>
                  <p className="text-[var(--text-primary)]">{subjectProfile.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">Subject Code</label>
                  <p className="text-[var(--text-primary)]">{subjectProfile.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">Education Level</label>
                  <p className="text-[var(--text-primary)]">{subjectProfile.level}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">Subject Type</label>
                  <Badge variant={subjectProfile.type === 'CORE' ? 'default' : 'secondary'}>
                    {subjectProfile.type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">UNEB Relevance</label>
                  <p className="text-[var(--text-primary)]">{subjectProfile.unebRelevance ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {subjectProfile.description && (
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">Description</label>
                  <p className="text-[var(--text-primary)]">{subjectProfile.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Class</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Teacher</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Weekly Periods</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Students</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribution.map((dist) => (
                      <tr key={dist.classId} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)]">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{dist.className}</p>
                            {dist.stream && (
                              <p className="text-sm text-[var(--text-muted)]">{dist.stream}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{dist.assignedTeacher.name}</p>
                            {dist.assignedTeacher.qualifications && (
                              <p className="text-sm text-[var(--text-muted)]">{dist.assignedTeacher.qualifications}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                            <span>{dist.weeklyPeriods}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Users className="h-4 w-4 text-[var(--text-muted)]" />
                            <span>{dist.studentCount}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Target className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="font-medium">{dist.averagePerformance}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Syllabus Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syllabusTracker.map((topic) => (
                  <div key={topic.topicId} className="border border-[var(--border-default)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-primary)]">{topic.topicName}</h4>
                      <Badge className={getStatusColor(topic.status)}>
                        {topic.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 mr-4">
                        <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              topic.completionPercent >= 80 ? 'bg-[var(--success)]' :
                              topic.completionPercent >= 60 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                            }`}
                            style={{ width: `${topic.completionPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{topic.completionPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                      <span>Teacher: {topic.teacherResponsible}</span>
                      <span>Updated: {new Date(topic.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Class</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Average</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Top Performers</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Bottom Performers</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Trend</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceBreakdown.map((perf) => (
                      <tr key={perf.classId} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)]">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{perf.className}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-medium">{perf.averageScore}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[var(--chart-green)] font-medium">{perf.topPerformers}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[var(--chart-red)] font-medium">{perf.bottomPerformers}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getTrendIcon(perf.trend)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${
                            perf.termComparison.change > 0 ? 'text-[var(--chart-green)]' : 
                            perf.termComparison.change < 0 ? 'text-[var(--chart-red)]' : 'text-[var(--text-secondary)]'
                          }`}>
                            {perf.termComparison.change > 0 ? '+' : ''}{perf.termComparison.change}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Teacher</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Classes</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Performance</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Workload</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Efficiency</th>
                      <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Qualified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherImpact.map((teacher) => (
                      <tr key={teacher.teacherId} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)]">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{teacher.teacherName}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span>{teacher.classesTeaching}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-medium">{teacher.averagePerformance}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span>{teacher.workloadHours}h</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${
                            teacher.performanceVsLoad > 1.2 ? 'text-[var(--chart-green)]' :
                            teacher.performanceVsLoad < 0.8 ? 'text-[var(--chart-red)]' : 'text-[var(--text-secondary)]'
                          }`}>
                            {teacher.performanceVsLoad.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {teacher.qualificationMatch ? (
                            <CheckCircle className="h-5 w-5 text-[var(--chart-green)] mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-[var(--chart-red)] mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DoS Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>DoS Actions for {subjectProfile.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-16 flex flex-col items-center justify-center space-y-2">
              <Edit className="h-5 w-5" />
              <span className="text-sm">Reassign Teacher</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm">Adjust Periods</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <Flag className="h-5 w-5" />
              <span className="text-sm">Academic Review</span>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm">Recovery Plan</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}