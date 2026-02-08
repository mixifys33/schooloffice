/**
 * CA-Only Performance Report Component
 * 
 * Displays CA-only reports showing all CA activities, scores, averages, 
 * and competency comments for mid-term monitoring and parent meetings.
 * 
 * Requirements: 27.1, 27.6, 18.1, 18.2, 18.3
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherColors } from '@/lib/teacher-ui-standards';

export interface CAOnlyReportData {
  reportType: 'CA_ONLY';
  generatedAt: Date;
  term: {
    id: string;
    name: string;
    academicYear: string;
  };
  class: {
    id: string;
    name: string;
    level: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  students: {
    id: string;
    name: string;
    admissionNumber: string;
    caEntries: {
      id: string;
      name: string;
      type: string;
      maxScore: number;
      rawScore: number;
      percentage: number;
      date: Date;
      competencyComment?: string;
      status: string;
    }[];
    caStatistics: {
      totalEntries: number;
      averagePercentage: number;
      caContribution: number;
      highestScore: number;
      lowestScore: number;
    };
    competencyProgress: {
      competencyId?: string;
      comments: string[];
      overallProgress: string;
    };
  }[];
  classStatistics: {
    totalStudents: number;
    averageCAContribution: number;
    studentsWithCA: number;
    studentsWithoutCA: number;
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
  };
}

interface CAOnlyReportProps {
  classId: string;
  subjectId?: string;
  termId?: string;
  studentId?: string;
  onPrint?: (reportData: CAOnlyReportData) => void;
  onExport?: (reportData: CAOnlyReportData) => void;
}

export function CAOnlyReport({
  classId,
  subjectId,
  termId,
  studentId,
  onPrint,
  onExport,
}: CAOnlyReportProps) {
  const [reportData, setReportData] = useState<CAOnlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [classId, subjectId, termId, studentId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        classId,
        ...(subjectId && { subjectId }),
        ...(termId && { termId }),
        ...(studentId && { studentId }),
      });

      const response = await fetch(`/api/reports/ca-only?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch CA-only report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (reportData && onPrint) {
      onPrint(reportData);
    } else {
      window.print();
    }
  };

  const handleExport = () => {
    if (reportData && onExport) {
      onExport(reportData);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={fetchReportData}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CA-Only Performance Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Continuous Assessment report for {reportData.class.name}
                {reportData.subject && ` - ${reportData.subject.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {reportData.term.name}
              </Badge>
              {reportData.subject && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {reportData.subject.code}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {reportData.classStatistics.totalStudents}
                </div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reportData.classStatistics.studentsWithCA}
                </div>
                <div className="text-sm text-muted-foreground">With CA Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.classStatistics.studentsWithoutCA}
                </div>
                <div className="text-sm text-muted-foreground">Missing CA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.classStatistics.averageCAContribution.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg CA Score</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!reportData.reportStatus.canPrint}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Status */}
      {!reportData.reportStatus.isComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Report Status: Incomplete</div>
            <ul className="list-disc list-inside space-y-1">
              {reportData.reportStatus.missingData.map((item, index) => (
                <li key={index} className="text-sm">{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Student CA Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student CA Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead className="text-center">CA Entries</TableHead>
                  <TableHead className="text-center">Average %</TableHead>
                  <TableHead className="text-center">CA Contribution</TableHead>
                  <TableHead className="text-center">Highest Score</TableHead>
                  <TableHead className="text-center">Lowest Score</TableHead>
                  <TableHead>Competency Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.admissionNumber}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {student.caStatistics.totalEntries}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        student.caStatistics.averagePercentage >= 80 ? "text-green-600" :
                        student.caStatistics.averagePercentage >= 60 ? "text-blue-600" :
                        student.caStatistics.averagePercentage >= 40 ? "text-orange-600" :
                        "text-red-600"
                      )}>
                        {student.caStatistics.averagePercentage.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {student.caStatistics.caContribution.toFixed(1)}/20
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {student.caStatistics.highestScore.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {student.caStatistics.lowestScore.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="text-sm font-medium mb-1">
                          {student.competencyProgress.overallProgress}
                        </div>
                        {student.competencyProgress.comments.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {student.competencyProgress.comments.slice(0, 2).join('; ')}
                            {student.competencyProgress.comments.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed CA Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed CA Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reportData.students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{student.name}</h4>
                  <Badge variant="outline">
                    {student.caEntries.length} CA Entries
                  </Badge>
                </div>
                
                {student.caEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CA Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Percentage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Comments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {student.caEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {entry.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {entry.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(entry.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.rawScore}/{entry.maxScore}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                "font-medium",
                                entry.percentage >= 80 ? "text-green-600" :
                                entry.percentage >= 60 ? "text-blue-600" :
                                entry.percentage >= 40 ? "text-orange-600" :
                                "text-red-600"
                              )}>
                                {entry.percentage.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={entry.status === 'APPROVED' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs text-sm text-muted-foreground">
                                {entry.competencyComment || 'No comments'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No CA entries found for this student</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Generated on {new Date(reportData.generatedAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-4">
              <span>Academic Year: {reportData.term.academicYear}</span>
              <span>Term: {reportData.term.name}</span>
              {reportData.reportStatus.canPrint && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready to Print
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}