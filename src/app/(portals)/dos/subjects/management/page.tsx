import { Metadata } from 'next';
import { SubjectManager } from '@/components/dos/subject-manager';

export const metadata: Metadata = {
  title: 'Subject Management - DOS Portal',
  description: 'Manage subjects and curriculum assignments'
};

export default function SubjectManagementPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subject Management</h1>
        <p className="text-muted-foreground">
          Manage subjects, curriculum assignments, and academic structure
        </p>
      </div>
      
      <SubjectManager />
    </div>
  );
}