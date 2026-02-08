import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Generate Reports | DOS Dashboard',
  description: 'Generate academic and administrative reports',
};

export default function GenerateReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Generate Reports</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Create academic and administrative reports</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Academic Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Student performance and academic progress
            </p>
            <Button variant="outline" size="sm">
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Attendance Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Student and staff attendance analysis
            </p>
            <Button variant="outline" size="sm">
              Generate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-[var(--chart-purple)]" />
              <span>Custom Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Build custom reports with filters
            </p>
            <Button variant="outline" size="sm">
              Create Custom
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Comprehensive Reporting
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Generate detailed reports for academic analysis and decision making
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                View Templates
              </Button>
              <Button>
                Start Generating
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}