import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, BarChart3, LineChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trend Analysis - DOS Portal',
  description: 'Long-term academic trends and performance patterns'
};

export default function TrendAnalysisPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Trend Analysis</h1>
        <p className="text-muted-foreground">
          Long-term academic trends and performance patterns
        </p>
      </div>

      <div className="grid gap-6">
        <div className="flex gap-4">
          <Select defaultValue="academic-year">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic-year">Academic Year</SelectItem>
              <SelectItem value="last-3-years">Last 3 Years</SelectItem>
              <SelectItem value="last-5-years">Last 5 Years</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-metrics">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-metrics">All Metrics</SelectItem>
              <SelectItem value="performance">Performance Only</SelectItem>
              <SelectItem value="attendance">Attendance Only</SelectItem>
              <SelectItem value="enrollment">Enrollment Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">+8.3%</span>
              </div>
              <p className="text-xs text-muted-foreground">Over 3 years</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">+4.7%</span>
              </div>
              <p className="text-xs text-muted-foreground">Steady improvement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Enrollment Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">+12.1%</span>
              </div>
              <p className="text-xs text-muted-foreground">Growing enrollment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />
                <span className="text-2xl font-bold">-2.3%</span>
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Academic Performance Trends
              </CardTitle>
              <CardDescription>
                Performance trends over time by subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: 'Mathematics', trend: 'up', change: '+6.2%', current: 82.4 },
                  { subject: 'English', trend: 'up', change: '+4.8%', current: 78.9 },
                  { subject: 'Science', trend: 'up', change: '+3.1%', current: 76.3 },
                  { subject: 'History', trend: 'down', change: '-1.2%', current: 81.7 },
                  { subject: 'Geography', trend: 'up', change: '+2.7%', current: 74.2 },
                ].map((item) => (
                  <div key={item.subject} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.subject}</span>
                      {item.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.current}</span>
                      <Badge variant={item.trend === 'up' ? 'default' : 'destructive'}>
                        {item.change}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Seasonal Patterns
              </CardTitle>
              <CardDescription>
                Performance patterns by term
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { term: 'Term 1', average: 76.8, pattern: 'Strong start', color: 'bg-[var(--accent-primary)]' },
                  { term: 'Term 2', average: 79.2, pattern: 'Peak performance', color: 'bg-[var(--success)]' },
                  { term: 'Term 3', average: 74.5, pattern: 'End-year fatigue', color: 'bg-[var(--warning)]' },
                ].map((item) => (
                  <div key={item.term} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <div>
                        <span className="font-medium">{item.term}</span>
                        <p className="text-sm text-muted-foreground">{item.pattern}</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">{item.average}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historical Milestones
              </CardTitle>
              <CardDescription>
                Key achievements and improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2024-01', milestone: 'Highest ever pass rate achieved', value: '94.2%' },
                  { date: '2023-09', milestone: 'New curriculum implementation', value: 'Success' },
                  { date: '2023-05', milestone: 'Digital assessment rollout', value: '100%' },
                  { date: '2023-01', milestone: 'Teacher training program', value: 'Completed' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">{item.milestone}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">{item.date}</span>
                        <Badge variant="outline">{item.value}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Predictive Insights</CardTitle>
              <CardDescription>
                Projected trends and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-[var(--success-light)] border border-[var(--success-light)] rounded-lg">
                  <h4 className="font-medium text-[var(--success-dark)]">Positive Trend</h4>
                  <p className="text-sm text-[var(--chart-green)] mt-1">
                    Mathematics performance is projected to reach 85% by end of term
                  </p>
                </div>
                <div className="p-3 bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg">
                  <h4 className="font-medium text-[var(--warning-dark)]">Watch Area</h4>
                  <p className="text-sm text-[var(--warning)] mt-1">
                    Science scores showing slight decline - intervention recommended
                  </p>
                </div>
                <div className="p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
                  <h4 className="font-medium text-[var(--info-dark)]">Opportunity</h4>
                  <p className="text-sm text-[var(--accent-hover)] mt-1">
                    Attendance improvements correlate with better performance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}