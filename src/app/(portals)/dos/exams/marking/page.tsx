import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, FileCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Marking - DOS Portal',
  description: 'Monitor and manage exam marking progress'
};

export default function ExamMarkingPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Exam Marking</h1>
        <p className="text-muted-foreground">
          Monitor marking progress and manage result compilation
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">24</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                <span className="text-2xl font-bold">8</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--chart-red)]" />
                <span className="text-2xl font-bold">3</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Validated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">20</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Marking Progress by Subject</CardTitle>
            <CardDescription>
              Track marking completion across all subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { subject: 'Mathematics', teacher: 'Mr. Johnson', status: 'completed', progress: 100 },
                { subject: 'English', teacher: 'Ms. Smith', status: 'in-progress', progress: 75 },
                { subject: 'Science', teacher: 'Dr. Brown', status: 'pending', progress: 0 },
              ].map((item) => (
                <div key={item.subject} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.subject}</h3>
                    <p className="text-sm text-muted-foreground">{item.teacher}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'in-progress' ? 'secondary' : 'destructive'
                    }>
                      {item.status}
                    </Badge>
                    <span className="text-sm">{item.progress}%</span>
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