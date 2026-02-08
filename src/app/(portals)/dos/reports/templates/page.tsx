import { Metadata } from 'next';
import { ReportCardTemplateEditor } from '@/components/dos/report-card-template-editor';

export const metadata: Metadata = {
  title: 'Report Templates - DOS Portal',
  description: 'Manage report card and document templates'
};

export default function ReportTemplatesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Report Templates</h1>
        <p className="text-muted-foreground">
          Design and manage report card templates and document formats
        </p>
      </div>
      
      <ReportCardTemplateEditor />
    </div>
  );
}