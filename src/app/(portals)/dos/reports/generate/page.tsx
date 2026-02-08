import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, BarChart3, Users, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Generate Reports - DOS Portal',
  description: 'Generate academic and administrative reports'
};

export default function GenerateReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Generate Reports</h1>
        <p className="text-muted-foreground">
          Create comprehensive academic and administrative reports
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Academic Reports
            </CardTitle>
            <CardDescription>
              Generate student performance and curriculum reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student-performance">Student Performance</SelectItem>
                  <SelectItem value="class-summary">Class Summary</SelectItem>
                  <SelectItem value="subject-analysis">Subject Analysis</SelectItem>
                  <SelectItem value="attendance-report">Attendance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form-1a">Form 1A</SelectItem>
                  <SelectItem value="form-1b">Form 1B</SelectItem>
                  <SelectItem value="form-2a">Form 2A</SelectItem>
                  <SelectItem value="form-2b">Form 2B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term-select">Term</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term-1">Term 1</SelectItem>
                  <SelectItem value="term-2">Term 2</SelectItem>
                  <SelectItem value="term-3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full">
              Generate Academic Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Administrative Reports
            </CardTitle>
            <CardDescription>
              Generate staff and operational reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-report-type">Report Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher-workload">Teacher Workload</SelectItem>
                  <SelectItem value="timetable-analysis">Timetable Analysis</SelectItem>
                  <SelectItem value="resource-utilization">Resource Utilization</SelectItem>
                  <SelectItem value="exam-statistics">Exam Statistics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-term">Current Term</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="academic-year">Academic Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" variant="outline">
              Generate Admin Report
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick Reports
            </CardTitle>
            <CardDescription>
              Generate commonly used reports with one click
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>Daily Attendance</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>Weekly Summary</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>Performance Trends</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}