import { Metadata } from 'next';
import { TeacherPerformanceDashboard } from '@/components/dos/teacher-performance-dashboard';

export const metadata: Metadata = {
  title: 'Teacher Analytics - DOS Portal',
  description: 'Teacher performance and workload analysis'
};

export default function TeacherAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teacher Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive teacher performance and workload analysis
        </p>
      </div>
      
      <TeacherPerformanceDashboard />
    </div>
  );
}