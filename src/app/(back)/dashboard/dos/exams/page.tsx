/**
 * DoS Exam Management Page
 * 
 * Manages examinations and results (80% component).
 * Provides oversight of exam approval, marking progress, and moderation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Eye,
  Lock,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  Download
} from 'lucide-react';

interface ExamData {
  id: string;
  examName: string;
  examType: string;
  subjectName: string;
  className: string;
  maxScore: number;
  examDate: Date;
  dosApproved: boolean;
  isLocked: boolean;
  moderationApplied: boolean;
  moderationFactor: number | null;
  completionRate: number;
  totalResults: number;
  completedResults: number;
  scoredStudents: number;
  absentStudents: number;
  isPastDue: boolean;
}

interface ExamOverview {
  totalExams: number;
  approvedExams: number;
  lockedExams: number;
  pastDueExams: number;
  moderatedExams: number;
  averageCompletion: number;
}

interface MarkingProgress {
  teacherId: string;
  teacherName: string;
  totalResults: number;
  markedResults: number;
  markingRate: number;
  onTimeMarking: number;
  lateMarking: number;
  onTimeRate: number;
  subjectCount: number;
  classCount: number;
}

export default function DoSExamsPage() {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [markingProgress, setMarkingProgress] = useState<MarkingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchExamData();
  }, [selectedTerm, selectedClass]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedTerm) params.append('termId', selectedTerm);
      if (selectedClass !== 'all') params.append('classId', selectedClass);

      // Fetch exam completion report
      const reportResponse = await fetch(`/api/dos/exams/completion-report?${params}`);
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        setExams(reportData.exams);
        setOverview(reportData.summary);
      }

      // Fetch marking progress
      const progressResponse = await fetch(`/api/dos/exams/marking-progress?${params}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setMarkingProgress(progressData.teachers);
      }
    } catch (error) {
      console.error('Failed to fetch exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/dos/exams/${examId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'DoS approval via exam management interface'
        })
      });

      if (response.ok) {
        fetchExamData();
      } else {
        const error = await response.json();
        alert(`Failed to approve exam: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to approve exam:', error);
      alert('Failed to approve exam');
    }
  };

  const handleLockExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/dos/exams/${examId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'DoS lock via exam management interface'
        })
      });

      if (response.ok) {
        fetchExamData();
      } else {
        const error = await response.json();
        alert(`Failed to lock exam: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to lock exam:', error);
      alert('Failed to lock exam');
    }
  };

  const handleApplyModeration = async (examId: string, factor: number, reason: string) => {
    try {
      const response = await fetch(`/api/dos/exams/${examId}/moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderationFactor: factor,
          reason
        })
      });

      if (response.ok) {
        fetchExamData();
      } else {
        const error = await response.json();
        alert(`Failed to apply moderation: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to apply moderation:', error);
      alert('Failed to apply moderation');
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'approved' && exam.dosApproved) ||
                         (filterStatus === 'pending' && !exam.dosApproved) ||
                         (filterStatus === 'pastdue' && exam.isPastDue) ||
                         (filterStatus === 'locked' && exam.isLocked) ||
                         (filterStatus === 'moderated' && exam.moderationApplied);
    
    return matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--chart-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading exam data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Exam Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Examination (80%) oversight and result monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Exam</DialogTitle>
                <DialogDescription>
                  Create a new examination for a subject.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">Subject</Label>
                  <select id="subject" className="col-span-3 px-3 py-2 border rounded-md">
                    <option value="">Select Subject</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="examType" className="text-right">Type</Label>
                  <select id="examType" className="col-span-3 px-3 py-2 border rounded-md">
                    <option value="MID_TERM">Mid Term</option>
                    <option value="END_TERM">End of Term</option>
                    <option value="END_YEAR">End of Year</option>
                    <option value="MOCK">Mock</option>
                    <option value="PLACEMENT">Placement</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="examName" className="text-right">Name</Label>
                  <Input id="examName" className="col-span-3" placeholder="Exam name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxScore" className="text-right">Max Score</Label>
                  <Input id="maxScore" type="number" className="col-span-3" placeholder="100" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="examDate" className="text-right">Exam Date</Label>
                  <Input id="examDate" type="date" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">Duration (min)</Label>
                  <Input id="duration" type="number" className="col-span-3" placeholder="120" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Exam</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalExams}</div>
              <p className="text-xs text-muted-foreground">Exams created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-[var(--success)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-green)]">{overview.approvedExams}</div>
              <p className="text-xs text-muted-foreground">DoS approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked</CardTitle>
              <Lock className="h-4 w-4 text-[var(--accent-primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-blue)]">{overview.lockedExams}</div>
              <p className="text-xs text-muted-foreground">Results locked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Past Due</CardTitle>
              <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-red)]">{overview.pastDueExams}</div>
              <p className="text-xs text-muted-foreground">Incomplete marking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moderated</CardTitle>
              <Settings className="h-4 w-4 text-[var(--chart-purple)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-purple)]">{overview.moderatedExams}</div>
              <p className="text-xs text-muted-foreground">With moderation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.averageCompletion.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Average marking rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="exams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="marking">Marking Progress</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="pastdue">Past Due</option>
                    <option value="locked">Locked</option>
                    <option value="moderated">Moderated</option>
                  </select>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
                  >
                    <option value="all">All Classes</option>
                    <option value="class1">Class 1</option>
                    <option value="class2">Class 2</option>
                    <option value="class3">Class 3</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exams Table */}
          <Card>
            <CardHeader>
              <CardTitle>Examinations</CardTitle>
              <CardDescription>
                Monitor exam approval, marking progress, and result completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Exam</th>
                      <th className="text-left p-3 font-medium">Subject</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Results</th>
                      <th className="text-left p-3 font-medium">Completion</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((exam) => (
                      <tr key={exam.id} className="border-b hover:bg-[var(--bg-surface)]">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{exam.examName}</div>
                            <div className="text-sm text-[var(--text-muted)]">{exam.className}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{exam.subjectName}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{exam.examType}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{new Date(exam.examDate).toLocaleDateString()}</div>
                            {exam.isPastDue && (
                              <Badge variant="destructive" className="text-xs mt-1">
                                Past Due
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>Scored: {exam.scoredStudents}</div>
                            <div>Absent: {exam.absentStudents}</div>
                            <div className="text-[var(--text-muted)]">Total: {exam.totalResults}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-[var(--bg-surface)] rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    exam.completionRate >= 90 ? 'bg-[var(--success)]' :
                                    exam.completionRate >= 70 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                                  }`}
                                  style={{ width: `${exam.completionRate}%` }}
                                ></div>
                              </div>
                              <span>{exam.completionRate.toFixed(0)}%</span>
                            </div>
                            <div className="text-[var(--text-muted)] mt-1">
                              {exam.completedResults}/{exam.totalResults}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {exam.dosApproved ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-[var(--success)]" />
                                <span className="text-xs text-[var(--chart-green)]">Approved</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[var(--warning)]" />
                                <span className="text-xs text-[var(--chart-yellow)]">Pending</span>
                              </div>
                            )}
                            {exam.isLocked && (
                              <div className="flex items-center gap-1">
                                <Lock className="h-3 w-3 text-[var(--accent-primary)]" />
                                <span className="text-xs text-[var(--chart-blue)]">Locked</span>
                              </div>
                            )}
                            {exam.moderationApplied && (
                              <div className="flex items-center gap-1">
                                <Settings className="h-3 w-3 text-[var(--chart-purple)]" />
                                <span className="text-xs text-[var(--chart-purple)]">
                                  Moderated ({exam.moderationFactor}x)
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!exam.dosApproved && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleApproveExam(exam.id)}
                                className="text-[var(--chart-green)] hover:text-[var(--chart-green)]"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {exam.dosApproved && !exam.isLocked && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleLockExam(exam.id)}
                                className="text-[var(--chart-blue)] hover:text-[var(--accent-hover)]"
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            )}
                            {exam.dosApproved && !exam.moderationApplied && !exam.isLocked && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-[var(--chart-purple)] hover:text-[var(--chart-purple)]"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Apply Moderation</DialogTitle>
                                    <DialogDescription>
                                      Apply moderation factor to all exam results
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="factor" className="text-right">Factor</Label>
                                      <Input 
                                        id="factor" 
                                        type="number" 
                                        step="0.1" 
                                        min="0.1" 
                                        max="2.0" 
                                        className="col-span-3" 
                                        placeholder="1.1" 
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="reason" className="text-right">Reason</Label>
                                      <Input 
                                        id="reason" 
                                        className="col-span-3" 
                                        placeholder="Reason for moderation" 
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button 
                                      onClick={() => {
                                        const factor = parseFloat((document.getElementById('factor') as HTMLInputElement).value);
                                        const reason = (document.getElementById('reason') as HTMLInputElement).value;
                                        if (factor && reason) {
                                          handleApplyModeration(exam.id, factor, reason);
                                        }
                                      }}
                                    >
                                      Apply Moderation
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredExams.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">No exams found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marking Progress</CardTitle>
              <CardDescription>
                Monitor teacher marking behavior and completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Teacher</th>
                      <th className="text-left p-3 font-medium">Results</th>
                      <th className="text-left p-3 font-medium">Marking Rate</th>
                      <th className="text-left p-3 font-medium">On-Time Rate</th>
                      <th className="text-left p-3 font-medium">Coverage</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markingProgress.map((teacher) => (
                      <tr key={teacher.teacherId} className="border-b hover:bg-[var(--bg-surface)]">
                        <td className="p-3">
                          <div className="font-medium">{teacher.teacherName}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{teacher.markedResults}/{teacher.totalResults}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[var(--bg-surface)] rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  teacher.markingRate >= 90 ? 'bg-[var(--success)]' :
                                  teacher.markingRate >= 70 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                                }`}
                                style={{ width: `${teacher.markingRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{teacher.markingRate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{teacher.onTimeRate.toFixed(1)}%</div>
                            <div className="text-[var(--text-muted)]">
                              {teacher.onTimeMarking} on time, {teacher.lateMarking} late
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{teacher.subjectCount} subjects</div>
                            <div className="text-[var(--text-muted)]">{teacher.classCount} classes</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {teacher.markingRate >= 90 ? (
                            <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]">Excellent</Badge>
                          ) : teacher.markingRate >= 70 ? (
                            <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)]">Good</Badge>
                          ) : teacher.markingRate >= 50 ? (
                            <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)]">Needs Improvement</Badge>
                          ) : (
                            <Badge variant="destructive">Poor</Badge>
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

        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Overview</CardTitle>
              <CardDescription>
                Review and manage exam moderation applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">Focus on core operations first</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">Focus on core operations first</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Marking Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">Focus on core operations first</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}