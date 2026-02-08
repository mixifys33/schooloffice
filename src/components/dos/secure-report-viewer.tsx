'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  FileTextIcon,
  DownloadIcon,
  EyeIcon,
  StarIcon,
  GraduationCapIcon,
  BookOpenIcon,
  UserRound
} from 'lucide-react';
import { StudentReportCard, SubjectResult } from '@/types/dos-results';

interface SecureReportViewerProps {
  token?: string; // Optional if passed as prop instead of via URL params
}

const SecureReportViewer = ({ token: propToken }: SecureReportViewerProps) => {
  const params = useParams();
  const token = propToken || params.token as string;

  const [reportData, setReportData] = useState<StudentReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch report data from API
  useEffect(() => {
    if (!token) {
      setError('Invalid report token');
      setLoading(false);
      return;
    }

    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/${token}`);

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load report');
          return;
        }

        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError('An error occurred while loading the report');
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">Report Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error || 'The report you are trying to access is not available.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <GraduationCapIcon className="h-6 w-6" />
                  Academic Report Card
                </CardTitle>
                <p className="opacity-80">{reportData.schoolName || 'School Name'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Report ID: {token?.substring(0, 8)}</p>
                <p className="text-sm opacity-80">{reportData.termName || 'Term'}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <UserRound className="h-5 w-5" />
                  Student Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {reportData.studentName}</p>
                  <p><span className="font-medium">Admission #:</span> {reportData.admissionNumber}</p>
                  <p><span className="font-medium">Class:</span> {reportData.className}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5" />
                  Term Information
                </h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Term:</span> {reportData.termName}</p>
                  <p><span className="font-medium">Academic Year:</span> {reportData.academicYear}</p>
                  {reportData.position && reportData.totalStudents && (
                    <p><span className="font-medium">Position:</span> {reportData.position} of {reportData.totalStudents}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Subject Performance
              </h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">CA (20)</TableHead>
                    <TableHead className="text-center">Exam (80)</TableHead>
                    <TableHead className="text-center">Final (100)</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.subjectResults.map((subject: SubjectResult, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{subject.subjectName}</TableCell>
                      <TableCell className="text-center">{subject.caScore !== null ? subject.caScore : '-'}</TableCell>
                      <TableCell className="text-center">{subject.examScore !== null ? subject.examScore : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{subject.finalScore !== null ? subject.finalScore : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{subject.grade || '-'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Overall Average:</span>
                  <span className="text-xl font-bold">
                    {reportData.overallAverage !== null ? `${reportData.overallAverage}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold">Overall Grade:</span>
                  <span className="text-xl font-bold">{reportData.overallGrade || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Class Teacher Remarks</h3>
                <div className="p-4 bg-gray-50 rounded-lg min-h-[80px]">
                  {reportData.classTeacherRemarks || 'No remarks provided'}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">DoS Academic Comment</h3>
                <div className="p-4 bg-gray-50 rounded-lg min-h-[80px]">
                  {reportData.dosRemarks || 'Satisfactory performance'}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50 p-6 flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Generated by SchoolOffice</p>
              <p className="text-xs text-muted-foreground">Valid report secured by DoS authority</p>
            </div>
            <Button>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SecureReportViewer;