import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus, FileText, Edit } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Report Templates | DOS Dashboard',
  description: 'Manage report templates and formats',
};

export default function ReportTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Report Templates</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage report templates and formats</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileTemplate className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Academic Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Templates for academic reports
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileTemplate className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Performance Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Templates for performance analysis
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileTemplate className="h-5 w-5 text-[var(--chart-purple)]" />
              <span>Custom Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              User-defined report templates
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Template Designer
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Create and customize report templates for consistent formatting
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                Import Template
              </Button>
              <Button>
                Create New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}