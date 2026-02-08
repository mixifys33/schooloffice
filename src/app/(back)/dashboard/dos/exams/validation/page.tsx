import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, AlertTriangle, FileCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Validation | DOS Dashboard',
  description: 'Validate and verify exam results',
};

export default function ExamValidationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Exam Validation</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Validate and verify exam results</p>
        </div>
        <Button>
          Start Validation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Validated Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-green)] mb-2">156</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Results validated and approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span>Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-yellow)] mb-2">23</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Results requiring validation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Quality Checks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-blue)] mb-2">98%</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Quality assurance score
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validation Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Result Validation System
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Ensure accuracy and integrity of examination results
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                Review Queue
              </Button>
              <Button>
                Validation Rules
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}