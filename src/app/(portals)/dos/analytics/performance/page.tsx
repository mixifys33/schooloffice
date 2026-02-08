import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance Analytics - DOS Portal',
  description: 'Detailed academic performance analysis and trends'
};

export default function PerformanceAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-muted-foreground">
          Detailed analysis of academic performance across classes and subjects
        </p>
      </div>

      <div className="grid gap-6">
        <div className="flex gap-4">
          <Select defaultValue="current-term">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-term">Current Term</SelectItem>
              <SelectItem value="last-term">Last Term</SelectItem>
              <SelectItem value="academic-year">Academic Year</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-classes">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-classes">All Classes</SelectItem>
              <SelectItem value="form-1">Form 1</SelectItem>
              <SelectItem value="form-2">Form 2</SelectItem>
              <SelectItem value="form-3">Form 3</SelectItem>
              <SelectItem value="form-4">Form 4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">78.5</span>
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
              </div>
              <p className="text-xs text-muted-foreground">+5.2 from last term</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">92.3%</span>
                <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />
              </div>
              <p className="text-xs text-muted-foreground">+2.1% improvement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Excellence Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">34.7%</span>
                <Minus className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <p className="text-xs text-muted-foreground">No change</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">7.7%</span>
                <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />
              </div>
              <p className="text-xs text-muted-foreground">-2.1% improvement</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
              <CardDescription>
                Average scores by subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: 'Mathematics', score: 82.4, trend: 'up', change: '+3.2' },
                  { subject: 'English', score: 78.9, trend: 'up', change: '+1.8' },
                  { subject: 'Science', score: 76.3, trend: 'down', change: '-2.1' },
                  { subject: 'History', score: 81.7, trend: 'up', change: '+4.5' },
                  { subject: 'Geography', score: 74.2, trend: 'same', change: '0.0' },
                ].map((item) => (
                  <div key={item.subject} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.subject}</span>
                      {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />}
                      {item.trend === 'down' && <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />}
                      {item.trend === 'same' && <Minus className="h-4 w-4 text-[var(--text-secondary)]" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.score}</span>
                      <Badge variant={item.trend === 'up' ? 'default' : item.trend === 'down' ? 'destructive' : 'secondary'}>
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
              <CardTitle>Class Performance</CardTitle>
              <CardDescription>
                Average scores by class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { class: 'Form 4A', score: 84.2, students: 32, rank: 1 },
                  { class: 'Form 4B', score: 81.7, students: 28, rank: 2 },
                  { class: 'Form 3A', score: 79.3, students: 35, rank: 3 },
                  { class: 'Form 3B', score: 76.8, students: 30, rank: 4 },
                  { class: 'Form 2A', score: 74.5, students: 33, rank: 5 },
                ].map((item) => (
                  <div key={item.class} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{item.rank}</Badge>
                      <div>
                        <span className="font-medium">{item.class}</span>
                        <p className="text-sm text-muted-foreground">{item.students} students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Distribution
            </CardTitle>
            <CardDescription>
              Grade distribution across all students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {[
                { grade: 'A', count: 156, percentage: 12.5, color: 'bg-[var(--success)]' },
                { grade: 'B', count: 278, percentage: 22.3, color: 'bg-[var(--accent-primary)]' },
                { grade: 'C', count: 423, percentage: 33.9, color: 'bg-[var(--warning)]' },
                { grade: 'D', count: 294, percentage: 23.6, color: 'bg-[var(--warning)]' },
                { grade: 'F', count: 96, percentage: 7.7, color: 'bg-[var(--danger)]' },
              ].map((item) => (
                <div key={item.grade} className="text-center">
                  <div className={`${item.color} h-20 rounded-lg mb-2 flex items-end justify-center pb-2`}>
                    <span className="text-[var(--white-pure)] font-bold text-lg">{item.grade}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold">{item.count}</p>
                    <p className="text-sm text-muted-foreground">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}