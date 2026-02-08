import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trend Analysis | DOS Dashboard',
  description: 'Academic trends and pattern analysis',
};

export default function TrendAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Trend Analysis</h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Long-term academic trends and patterns</p>
        </div>
        <Button>
          Export Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Upward Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-[var(--chart-green)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">8</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Declining Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-[var(--chart-red)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">3</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Stable Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[var(--chart-blue)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">12</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
              Volatility Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-[var(--chart-purple)]" />
              <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">2.4</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Mathematics</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                  <span className="font-semibold text-[var(--chart-green)]">+5.2%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Science</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                  <span className="font-semibold text-[var(--chart-green)]">+3.8%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">English</span>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-[var(--chart-blue)]" />
                  <span className="font-semibold text-[var(--chart-blue)]">+0.5%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">History</span>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />
                  <span className="font-semibold text-[var(--chart-red)]">-1.2%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                Pattern Analysis
              </h3>
              <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
                Seasonal and cyclical performance patterns
              </p>
              <Button>
                View Detailed Charts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trend Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20 rounded-lg">
              <TrendingUp className="h-8 w-8 text-[var(--chart-green)] mx-auto mb-2" />
              <h4 className="font-medium text-[var(--success-dark)] dark:text-[var(--success-light)]">Improving Areas</h4>
              <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">STEM subjects showing consistent growth</p>
            </div>
            <div className="text-center p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 rounded-lg">
              <Activity className="h-8 w-8 text-[var(--chart-blue)] mx-auto mb-2" />
              <h4 className="font-medium text-[var(--info-dark)] dark:text-[var(--info-light)]">Stable Performance</h4>
              <p className="text-sm text-[var(--accent-hover)] dark:text-[var(--info)]">Language arts maintaining steady progress</p>
            </div>
            <div className="text-center p-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20 rounded-lg">
              <TrendingDown className="h-8 w-8 text-[var(--chart-yellow)] mx-auto mb-2" />
              <h4 className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning-light)]">Attention Needed</h4>
              <p className="text-sm text-[var(--warning)] dark:text-[var(--warning)]">Social studies requires intervention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}