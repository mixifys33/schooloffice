// src/app/reports/[token]/page.tsx
'use client';

import React from 'react';
import SecureReportViewer from '@/components/dos/secure-report-viewer';

interface PageProps {
  params: {
    token: string;
  };
}

const ReportPage = ({ params }: PageProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SecureReportViewer token={params.token} />
    </div>
  );
};

export default ReportPage;