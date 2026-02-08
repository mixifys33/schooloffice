'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Users, Target, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SubjectPerformancePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[var(--bg-surface)] rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Subject Performance Analytics</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Deep dive into subject performance trends and comparative analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Overall Performance</p>
              <p className="text-2xl font-bold text-[var(--chart-green)]">78.5%</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-sm text-[var(--chart-green)]">+5.2% from last term</span>
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-[var(--chart-green)]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">At-Risk Subjects</p>
              <p className="text-2xl font-bold text-[var(--chart-red)]">3</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />
                <span className="text-sm text-[var(--chart-red)]">Needs intervention</span>
              </div>
            </div>
            <Target className="h-8 w-8 text-[var(--chart-red)]" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Top Performers</p>
              <p className="text-2xl font-bold text-[var(--chart-blue)]">7</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-sm text-[var(--chart-blue)]">Above 85% average</span>
              </div>
            </div>
            <Users className="h-8 w-8 text-[var(--chart-blue)]" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Performance Trends</h2>
        <div className="text-center py-12 text-[var(--text-muted)]">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <p>Performance analytics charts and trends will be implemented here.</p>
          <p className="text-sm mt-2">This will include term-over-term comparisons, grade distribution, and predictive analytics.</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Subject Comparison</h2>
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Target className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <p>Comparative subject performance analysis will be displayed here.</p>
          <p className="text-sm mt-2">Including benchmarking against school standards and peer comparisons.</p>
        </div>
      </Card>
    </div>
  );
}