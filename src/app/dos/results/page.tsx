// src/app/dos/results/page.tsx
'use client';

import React from 'react';
import DosResultsManager from '@/components/dos/dos-results-manager';

const DosResultsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DosResultsManager />
    </div>
  );
};

export default DosResultsPage;