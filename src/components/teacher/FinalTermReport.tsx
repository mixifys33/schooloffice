/**
 * Final Term Report Card Component
 * 
 * Displays complete final term report cards showing CA contribution (20), 
 * Exam contribution (80), and final score (100) for official reporting.
 * 
 * Requirements: 27.3, 27.4, 27.5, 27.7, 18.1, 18.2, 18.3
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
  BookOpen,
  Award,
  Target,
  BarChart3,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherColors } from '@/lib/teacher-ui-standards';

export interface FinalTermReportData {
  reportType: 'FINAL_TERM';
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
    gradeCalculation: {
      studentId: string;
      subjectId: string;
      termId: string;
      caEntries: any[];
      caPercentages: number[];
      averageCAPercentage: number;
      caContribution: number;
      examEntry?: any;
      examContribution: number;
      finalScore: number;
      hasCA: boolean;
      hasExam: boolean;
      isComplete: boolean;
      calculatedAt: Date;
      lastUpdated: Date;
    };
    finalGrade: {
      caContribution: number;
      examContribution: number;
      finalScore: number;
      grade?: string;
      position?: number;
    };
    competencyDescriptors: {
      competencyId?: string;
      overallComment: string;
      teacherRemarks: string;
    };
    approvalStatus: {
      caApproved: boolean;
      examApproved: boolean;
      finalApproved: boolean;
      approvedBy?: string;
      approvedAt?: Date;
    };
  }[];
  classStatistics: {
    totalStudents: number;
    completeReports: number;
    incompleteReports: number;
    averageFinalScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
    dosApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

interface FinalTermReportProps {
  classId: string;
  subjectId?: string;
  termId?: string;
  studentId?: string;
  onPrint?: (reportData: FinalTermReportData) => void;
  onExport?: (reportData: FinalTermReportData) => void;
}

export function FinalTermReport({
  classId,
  subjectId,
  termId,
  studentId,
  onPrint,
  onExport,
}: FinalTermReportProps) {
  const [reportData, setReportData] = useState<FinalTermReportData | null>(null);
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

      const response = await fetch(`/api/reports/final-term?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch final term report');
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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600';
      case 'B+':
      case 'B':
        return 'text-blue-600';
      case 'C+':
      case 'C':
        return 'text-orange-600';
      case 'D+':
      case 'D':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
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
                <Award className="h-5 w-5" />
                Final Term Report Card
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Official final term report for {reportData.class.name}
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
              <Badge 
                variant={reportData.reportStatus.dosApprovalStatus === 'APPROVED' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <Shield className="h-3 w-3" />
                {reportData.reportStatus.dosApprovalStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {reportData.classStatistics.totalStudents}
                </div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reportData.classStatistics.completeReports}
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.classStatistics.incompleteReports}
                </div>
                <div className="text-sm text-muted-foreground">Incomplete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.classStatistics.averageFinalScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Class Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {reportData.classStatistics.passRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {reportData.classStatistics.highestScore}
                </div>
                <div className="text-sm text-muted-foreground">Highest Score</div>
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
            {reportData.reportStatus.approvalRequired && (
              <div className="mt-2 text-sm font-medium text-orange-600">
                DoS approval required before printing official reports
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Final Grade Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Final Grade Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead className="text-center">CA Contribution</TableHead>
                  <TableHead className="text-center">Exam Contribution</TableHead>
                  <TableHead className="text-center">Final Score</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Position</TableHead>
                  <TableHead className="text-center">Status</TableHead>
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
                      <span className={cn(
                        "font-medium",
                        getScoreColor((student.finalGrade.caContribution / 20) * 100)
                      )}>
                        {student.finalGrade.caContribution.toFixed(1)}/20
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        getScoreColor((student.finalGrade.examContribution / 80) * 100)
                      )}>
                        {student.finalGrade.examContribution.toFixed(1)}/80
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-bold text-lg",
                        getScoreColor(student.finalGrade.finalScore)
                      )}>
                        {student.finalGrade.finalScore.toFixed(1)}/100
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {student.finalGrade.grade && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-bold",
                            getGradeColor(student.finalGrade.grade)
                          )}
                        >
                          {student.finalGrade.grade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {student.finalGrade.position && (
                        <Badge variant="secondary">
                          #{student.finalGrade.position}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={student.approvalStatus.finalApproved ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {student.approvalStatus.finalApproved ? 'Approved' : 'Pending'}
                        </Badge>
                        {!student.gradeCalculation.isComplete && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Incomplete
                          </Badge>
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

      {/* Detailed Student Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Detailed Student Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reportData.students.map((student) => (
              <div key={student.id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{student.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Admission No: {student.admissionNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    {student.finalGrade.grade && (
                      <div className={cn(
                        "text-3xl font-bold mb-1",
                        getGradeColor(student.finalGrade.grade)
                      )}>
                        {student.finalGrade.grade}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Final Score: {student.finalGrade.finalScore.toFixed(1)}/100
                    </div>
                    {student.finalGrade.position && (
                      <div className="text-sm text-muted-foreground">
                        Position: #{student.finalGrade.position}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grade Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Continuous Assessment
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {student.finalGrade.caContribution.toFixed(1)}/20
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.gradeCalculation.caEntries.length} CA entries
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Examination
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {student.finalGrade.examContribution.toFixed(1)}/80
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.gradeCalculation.hasExam ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Final Total
                    </div>
                    <div className={cn(
                      "text-2xl font-bold",
                      getScoreColor(student.finalGrade.finalScore)
                    )}>
                      {student.finalGrade.finalScore.toFixed(1)}/100
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((student.finalGrade.finalScore / 100) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Teacher Remarks and Competency */}
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium mb-2">Teacher Remarks</h5>
                    <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      {student.competencyDescriptors.teacherRemarks}
                    </p>
                  </div>
                  
                  {student.competencyDescriptors.overallComment !== 'No specific competency comments available' && (
                    <div>
                      <h5 className="font-medium mb-2">Competency Comments</h5>
                      <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
                        {student.competencyDescriptors.overallComment}
                      </p>
                    </div>
                  )}

                  {/* Approval Status */}
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">CA Status:</span>
                      <Badge 
                        variant={student.approvalStatus.caApproved ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {student.approvalStatus.caApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Exam Status:</span>
                      <Badge 
                        variant={student.approvalStatus.examApproved ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {student.approvalStatus.examApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                    {student.approvalStatus.approvedBy && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Approved by:</span>
                        <span className="text-sm font-medium">{student.approvalStatus.approvedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
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
              {reportData.reportStatus.dosApprovalStatus === 'APPROVED' && (
                <Badge variant="outline" className="text-blue-600">
                  <Shield className="h-3 w-3 mr-1" />
                  DoS Approved
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}