/**
 * Teacher Students Reports Page
 * 
 * Integrated page for the Three-Tier Reporting System within the 
 * Teacher Marks Management System for regular teachers. Provides access 
 * to CA-Only, Exam-Only, and Final Term reports for assigned subjects.
 * 
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 11.2, 19.1, 19.2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton-loader';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  BarChart3, 
  Award,
  Users,
  BookOpen,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { teacherColors } from '@/lib/teacher-ui-standards';
import { ReportViewer } from '@/components/teacher/ReportViewer';

interface ClassData {
  id: string;
  name: string;
  level: string;
  enrollmentCount: number;
  teacherRole: 'CLASS_TEACHER' | 'SUBJECT_TEACHER';
  subjects: string[];
}

interface SubjectData {
  id: string;
  name: string;
  code: string;
  teacherCanAccess: boolean;
}

interface TermData {
  id: string;
  name: string;
  isActive: boolean;
}

export default function TeacherStudentsReportsPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [terms, setTerms] = useState<TermData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch classes and terms in parallel
      const [classesResponse, termsResponse] = await Promise.all([
        fetch('/api/teacher/classes'),
        fetch('/api/teacher/terms'),
      ]);

      if (!classesResponse.ok || !termsResponse.ok) {
        throw new Error('Failed to fetch initial data');
      }

      const [classesData, termsData] = await Promise.all([
        classesResponse.json(),
        termsResponse.json(),
      ]);

      setClasses(classesData.classes || []);
      setTerms(termsData.terms || []);

      // Set default term to active term
      const activeTerm = termsData.terms?.find((term: TermData) => term.isActive);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    if (!selectedClass) return;

    try {
      const response = await fetch(`/api/teacher/classes/${selectedClass}/subjects`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }

      const data = await response.json();
      // Filter subjects that the teacher can access
      const accessibleSubjects = data.subjects?.filter((subject: SubjectData) => 
        subject.teacherCanAccess
      ) || [];
      
      setSubjects(accessibleSubjects);
      
      // Reset subject selection when class changes
      setSelectedSubject('');
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjects([]);
    }
  };

  const handlePrintReport = (reportData: any) => {
    // Handle report printing logic
    console.log('Printing report:', reportData);
    window.print();
  };

  const handleExportReport = (reportData: any) => {
    // Handle report export logic
    console.log('Exporting report:', reportData);
    // Implement export functionality (PDF, Excel, etc.)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href="/dashboard/teacher/students"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Student Reports</h1>
          <p className="text-muted-foreground">
            Generate and view student performance reports for your assigned subjects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/teacher/students">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Marks
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={fetchInitialData}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {classItem.name} ({classItem.enrollmentCount} students)
                        <Badge variant="outline" className="ml-auto text-xs">
                          {classItem.teacherRole === 'CLASS_TEACHER' ? 'Class Teacher' : 'Subject Teacher'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selection - Required for regular teachers */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Subject {classes.find(c => c.id === selectedClass)?.teacherRole === 'SUBJECT_TEACHER' && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {subject.name} ({subject.code})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClass && subjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No subjects assigned for this class
                </p>
              )}
            </div>

            {/* Term Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {term.name}
                        {term.isActive && (
                          <Badge variant="default" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedClass && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Selected:</span>
                <Badge variant="outline">
                  {classes.find(c => c.id === selectedClass)?.name}
                </Badge>
                {selectedSubject && (
                  <Badge variant="outline">
                    {subjects.find(s => s.id === selectedSubject)?.name}
                  </Badge>
                )}
                <Badge variant="outline">
                  {terms.find(t => t.id === selectedTerm)?.name}
                </Badge>
              </div>
              
              {/* Show requirement for subject teachers */}
              {classes.find(c => c.id === selectedClass)?.teacherRole === 'SUBJECT_TEACHER' && !selectedSubject && (
                <div className="mt-2 text-sm text-orange-600">
                  Please select a subject to generate reports
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Viewer */}
      {selectedClass && selectedTerm && (
        // For subject teachers, require subject selection
        (classes.find(c => c.id === selectedClass)?.teacherRole === 'CLASS_TEACHER' || selectedSubject) ? (
          <ReportViewer
            classId={selectedClass}
            subjectId={selectedSubject || undefined}
            termId={selectedTerm}
            onPrint={handlePrintReport}
            onExport={handleExportReport}
            showReportTypeSelector={true}
            defaultReportType="FINAL_TERM"
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Subject Selection Required</h3>
                <p className="text-muted-foreground">
                  As a subject teacher, please select a subject to generate reports
                </p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select Class and Term</h3>
              <p className="text-muted-foreground">
                Choose a class and term to generate student performance reports
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}