/**
 * Exam-Only Performance Report Component
 * 
 * Displays exam-only reports showing exam scores with "CA pending" status notes
 * for exceptional cases with DoS override.
 * 
 * Requirements: 27.2, 27.6, 18.1, 18.2, 18.3
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
  AlertTriangle, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherColors } from '@/lib/teacher-ui-standards';

export interface ExamOnlyReportData {
  reportType: 'EXAM_ONLY';
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
    examScore: number;
    examMaxScore: number;
    examPercentage: number;
    caStatus: 'PENDING' | 'COMPLETE' | 'MISSING';
    dosOverride: boolean;
    overrideReason?: string;
    grade?: string;
    remarks?: string;
  }[];
  classStatistics: {
    totalStudents: number;
    averageExamScore: number;
    highestScore: number;
    lowestScore: number;
    studentsWithCA: number;
    studentsWithoutCA: number;
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
    dosApprovalRequired: boolean;
  };
}

interface ExamOnlyReportProps {
  classId: string;
  subjectId?: string;
  termId?: string;
  studentId?: string;
  onPrint?: (reportData: ExamOnlyReportData) => void;
  onExport?: (reportData: ExamOnlyReportData) => void;
}

export function ExamOnlyReport({
  classId,
  subjectId,
  termId,
  studentId,
  onPrint,
  onExport,
}: ExamOnlyReportProps) {
  const [reportData, setReportData] = useState<ExamOnlyReportData | null>(null);
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

      const response = await fetch(`/api/reports/exam-only?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch exam-only report');
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
                Exam-Only Performance Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Examination results for {reportData.class.name}
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
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.classStatistics.averageExamScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Exam Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reportData.classStatistics.highestScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Highest Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.classStatistics.studentsWithoutCA}
                </div>
                <div className="text-sm text-muted-foreground">CA Pending</div>
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

      {/* DoS Override Warning */}
      {reportData.reportStatus.dosApprovalRequired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">DoS Approval Required</div>
            <p className="text-sm">
              Some students have exam scores without CA entries. This requires Director of Studies approval.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Student Exam Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Exam Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead className="text-center">Exam Score</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">CA Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                      {student.dosOverride && (
                        <Badge variant="outline" className="ml-2 text-xs text-orange-600">
                          DoS Override
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{student.admissionNumber}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {student.examScore}/{student.examMaxScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        student.examPercentage >= 80 ? "text-green-600" :
                        student.examPercentage >= 60 ? "text-blue-600" :
                        student.examPercentage >= 40 ? "text-orange-600" :
                        "text-red-600"
                      )}>
                        {student.examPercentage.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {student.grade || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          student.caStatus === 'COMPLETE' ? 'default' :
                          student.caStatus === 'PENDING' ? 'secondary' :
                          'destructive'
                        }
                        className="text-xs"
                      >
                        {student.caStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs text-sm">
                        {student.remarks || 'No remarks'}
                        {student.dosOverride && student.overrideReason && (
                          <div className="text-xs text-orange-600 mt-1">
                            Override: {student.overrideReason}
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
