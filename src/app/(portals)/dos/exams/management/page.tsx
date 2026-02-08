import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Exam Management - DOS Portal',
  description: 'Manage examinations, schedules, and assessment periods'
};

export default function ExamManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Exam Management</h1>
        <p className="text-muted-foreground">
          Create and manage examinations, schedules, and assessment periods
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Exam Schedules
            </CardTitle>
            <CardDescription>
              Create and manage examination timetables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Question Papers
            </CardTitle>
            <CardDescription>
              Manage question papers and exam materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload Papers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invigilation
            </CardTitle>
            <CardDescription>
              Assign teachers and manage invigilation duties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Assign Duties
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}