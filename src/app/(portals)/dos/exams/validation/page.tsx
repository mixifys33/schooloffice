import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Eye, Download } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Validation - DOS Portal',
  description: 'Validate and approve examination results'
};

export default function ExamValidationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Exam Validation</h1>
        <p className="text-muted-foreground">
          Review, validate, and approve examination results before publication
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--chart-yellow)]" />
                <span className="text-2xl font-bold">12</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Validated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">28</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">15</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Results Awaiting Validation</CardTitle>
            <CardDescription>
              Review and approve examination results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  exam: 'Mid-Term Mathematics', 
                  class: 'Form 4A', 
                  teacher: 'Mr. Johnson',
                  submitted: '2024-02-01',
                  students: 32,
                  status: 'pending'
                },
                { 
                  exam: 'End-Term English', 
                  class: 'Form 3B', 
                  teacher: 'Ms. Smith',
                  submitted: '2024-02-02',
                  students: 28,
                  status: 'review'
                },
                { 
                  exam: 'Chemistry Practical', 
                  class: 'Form 4C', 
                  teacher: 'Dr. Brown',
                  submitted: '2024-02-03',
                  students: 25,
                  status: 'validated'
                },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h3 className="font-medium">{item.exam}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.class}</span>
                      <span>•</span>
                      <span>{item.teacher}</span>
                      <span>•</span>
                      <span>{item.students} students</span>
                      <span>•</span>
                      <span>Submitted {item.submitted}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === 'validated' ? 'default' :
                      item.status === 'review' ? 'secondary' : 'outline'
                    }>
                      {item.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}