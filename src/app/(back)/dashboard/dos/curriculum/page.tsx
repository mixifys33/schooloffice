'use client';

import { useState } from 'react';

export default function DoSCurriculumPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Curriculum Management</h1>
      <p className="text-[var(--text-secondary)] mt-2">DoS curriculum management interface</p>
    </div>
  );
}