import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Eye, CheckCircle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Review Reports | DOS Dashboard',
  description: 'Review and approve generated reports',
};

export default function ReviewReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Review Reports</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Review and approve generated reports</p>
        </div>
        <Button>
          <Eye className="h-4 w-4 mr-2" />
          Review Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span>Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-yellow)] mb-2">12</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Reports awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Approved</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-green)] mb-2">45</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Reports approved this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Quality Score</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--chart-blue)] mb-2">96%</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Average report quality
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Review System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Quality Assurance
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Ensure accuracy and completeness of all generated reports
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                Review Guidelines
              </Button>
              <Button>
                Start Reviewing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}