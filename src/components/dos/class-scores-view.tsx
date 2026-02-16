'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Calculator,
  RefreshCw,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ClassData {
  id: string;
  name: string;
  level: number;
}

interface TermData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

interface StudentScore {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  caScore: number | null;
  caMaxScore: number;
  examScore: number | null;
  examMaxScore: number;
  finalScore: number | null;
  grade: string | null;
  status: 'complete' | 'partial' | 'missing';
  dosApproved: boolean;
}

interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalStudents: number;
  completedStudents: number;
  averageCA: number;
  averageExam: number;
  averageFinal: number;
  passRate: number;
  dosApproved: boolean;
}

interface ClassScoresViewProps {
  classData: ClassData;
  termData: TermData;
  schoolId: string;
  userId: string;
}

export function ClassScoresView({
  classData,
  termData,
  schoolId,
  userId,
}: ClassScoresViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [subjectSummaries, setSubjectSummaries] = useState<SubjectSummary[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'partial' | 'missing'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScoresData();
  }, [classData.id, termData.id]);

  const fetchScoresData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `/api/dos/scores/classes/${classData.id}?termId=${termData.id}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStudentScores(data.studentScores || []);
      setSubjectSummaries(data.subjectSummaries || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproveSubject = async (subjectId: string) => {
    if (!confirm('Approve all scores for this subject? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/dos/scores/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          termId: termData.id,
          subjectId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve scores');
      }

      await fetchScoresData(true);
    } catch (err) {
      console.error('Error approving scores:', err);
      alert('Failed to approve scores. Please try again.');
    }
  };

  const handleExportScores = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon');
  };

  // Filter scores
  const filteredScores = studentScores.filter((score) => {
    const matchesSubject = selectedSubject === 'all' || score.subjectId === selectedSubject;
    const matchesSearch =
      score.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      score.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || score.status === statusFilter;

    return matchesSubject && matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalStudents: new Set(studentScores.map((s) => s.studentId)).size,
    totalSubjects: subjectSummaries.length,
    approvedSubjects: subjectSummaries.filter((s) => s.dosApproved).length,
    averageCompletion:
      subjectSummaries.length > 0
        ? (subjectSummaries.reduce((sum, s) => sum + (s.completedStudents / s.totalStudents) * 100, 0) /
            subjectSummaries.length)
        : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] dark:bg-[var(--bg-dark)]">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
          <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--bg-surface)] rounded animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-surface)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] dark:bg-[var(--bg-dark)]">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                {classData.name} Scores
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {termData.name} • CA 20% + Exam 80% = Final Score
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchScoresData(true)}
              disabled={refreshing}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportScores}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--info-light)] rounded-lg">
                  <Users className="h-5 w-5 text-[var(--chart-blue)]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">Total Students</p>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--success-light)] rounded-lg">
                  <BookOpen className="h-5 w-5 text-[var(--chart-green)]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">Subjects</p>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                    {stats.totalSubjects}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--warning-light)] rounded-lg">
                  <Calculator className="h-5 w-5 text-[var(--chart-yellow)]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">Completion</p>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                    {stats.averageCompletion.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--success-light)] rounded-lg">
                  <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">DoS Approved</p>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                    {stats.approvedSubjects}/{stats.totalSubjects}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Summaries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Subject Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subjectSummaries.map((subject) => (
                <div
                  key={subject.subjectId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base">{subject.subjectName}</h3>
                      <Badge variant="outline" className="text-xs">{subject.subjectCode}</Badge>
                      {subject.dosApproved && (
                        <Badge className="bg-[var(--success-light)] text-[var(--success-dark)] text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-[var(--text-muted)]">Completion:</span>
                        <span className="ml-1 font-medium">
                          {subject.completedStudents}/{subject.totalStudents}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Avg CA:</span>
                        <span className="ml-1 font-medium">{subject.averageCA.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Avg Exam:</span>
                        <span className="ml-1 font-medium">{subject.averageExam.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Pass Rate:</span>
                        <span className="ml-1 font-medium">{subject.passRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubject(subject.subjectId)}
                      className="flex-1 sm:flex-none"
                    >
                      View Details
                    </Button>
                    {!subject.dosApproved && subject.completedStudents === subject.totalStudents && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveSubject(subject.subjectId)}
                        className="flex-1 sm:flex-none bg-[var(--chart-green)] hover:bg-[var(--chart-green)]/90 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  placeholder="Search by student name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                >
                  <option value="all">All Subjects</option>
                  {subjectSummaries.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-md bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="complete">✓ Complete</option>
                  <option value="partial">⚠ Partial</option>
                  <option value="missing">✗ Missing</option>
                </select>

                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-md border border-[var(--border-default)]">
                  <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {filteredScores.length} records
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Scores Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Student Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredScores.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)]">No scores found matching your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Student</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Subject</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-[var(--text-secondary)]">CA (20%)</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Exam (80%)</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Final</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Grade</th>
                      <th className="text-center p-2 sm:p-3 font-medium text-[var(--text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScores.map((score, index) => (
                      <tr
                        key={`${score.studentId}-${score.subjectId}`}
                        className={cn(
                          'border-b border-[var(--border-default)]',
                          index % 2 === 0 && 'bg-[var(--bg-surface)]'
                        )}
                      >
                        <td className="p-2 sm:p-3">
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">{score.studentName}</div>
                            <div className="text-xs text-[var(--text-muted)]">{score.admissionNumber}</div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3">
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">{score.subjectName}</div>
                            <div className="text-xs text-[var(--text-muted)]">{score.subjectCode}</div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          {score.caScore !== null ? (
                            <span className="font-medium">{score.caScore.toFixed(1)}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          {score.examScore !== null ? (
                            <span className="font-medium">{score.examScore.toFixed(1)}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          {score.finalScore !== null ? (
                            <span className="font-bold text-[var(--text-primary)]">
                              {score.finalScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          {score.grade ? (
                            <Badge variant="outline">{score.grade}</Badge>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="p-2 sm:p-3 text-center">
                          {score.status === 'complete' && (
                            <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                          {score.status === 'partial' && (
                            <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Partial
                            </Badge>
                          )}
                          {score.status === 'missing' && (
                            <Badge className="bg-[var(--danger-light)] text-[var(--danger-dark)]">
                              <X className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
