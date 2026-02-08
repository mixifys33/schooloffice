'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { 
  Download, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Calendar,
  Filter,
  Eye,
  Share,
  Printer,
  Mail
} from 'lucide-react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

interface FinancialReport {
  id: string;
  name: string;
  type: 'INCOME_STATEMENT' | 'CASH_FLOW' | 'BALANCE_SHEET' | 'FEE_COLLECTION' | 'BUDGET_VARIANCE' | 'CUSTOM';
  description: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERMLY' | 'ANNUALLY' | 'CUSTOM';
  startDate: string;
  endDate: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  generatedAt: string;
  generatedBy: string;
  fileUrl?: string;
  fileSize?: number;
  recipients?: string[];
  scheduledDelivery?: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  defaultPeriod: string;
  sections: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  customizable: boolean;
  automated: boolean;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  feeCollectionRate: number;
  outstandingFees: number;
  budgetVariance: number;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export function FinancialReports() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    reportType: '',
    period: 'current-term',
    status: '',
    dateRange: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [reportsRes, templatesRes, metricsRes] = await Promise.all([
        fetch(`/api/bursar/reports?${new URLSearchParams(filters)}`),
        fetch('/api/bursar/reports/templates'),
        fetch(`/api/bursar/reports/metrics?period=${filters.period}`)
      ]);

      const [reportsData, templatesData, metricsData] = await Promise.all([
        reportsRes.json(),
        templatesRes.json(),
        metricsRes.json()
      ]);

      setReports(reportsData);
      setTemplates(templatesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (templateId: string, config: any) => {
    try {
      const response = await fetch('/api/bursar/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, config })
      });

      if (response.ok) {
        fetchReportData();
        setShowGenerateDialog(false);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const handleDownloadReport = (reportId: string) => {
    window.open(`/api/bursar/reports/${reportId}/download`, '_blank');
  };

  const handleShareReport = async (reportId: string, recipients: string[]) => {
    try {
      const response = await fetch(`/api/bursar/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients })
      });

      if (response.ok) {
        // Show success message
      }
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const reportColumns = [
    {
      header: 'Report',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-[var(--text-muted)]">{row.original.description}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {row.original.type.replace('_', ' ')}
          </Badge>
        </div>
      )
    },
    {
      header: 'Period',
      accessorKey: 'period',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <Badge variant="secondary">{row.original.period}</Badge>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {new Date(row.original.startDate).toLocaleDateString()} - 
            {new Date(row.original.endDate).toLocaleDateString()}
          </p>
        </div>
      )
    },
    {
      header: 'Generated',
      accessorKey: 'generatedAt',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <p>{new Date(row.original.generatedAt).toLocaleDateString()}</p>
          <p className="text-xs text-[var(--text-muted)]">by {row.original.generatedBy}</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <Badge 
          variant={row.original.status === 'READY' ? 'default' : 'secondary'}
          className={
            row.original.status === 'READY' ? 'bg-[var(--success-light)] text-[var(--success-dark)]' :
            row.original.status === 'GENERATING' ? 'bg-[var(--warning-light)] text-[var(--warning-dark)]' :
            'bg-[var(--danger-light)] text-[var(--danger-dark)]'
          }
        >
          {row.original.status}
        </Badge>
      )
    },
    {
      header: 'Size',
      accessorKey: 'fileSize',
      cell: ({ row }: any) => (
        <span className="text-sm">
          {row.original.fileSize ? `${(row.original.fileSize / 1024).toFixed(1)} KB` : '-'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadReport(row.original.id)}
            disabled={row.original.status !== 'READY'}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.original.status !== 'READY'}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.original.status !== 'READY'}
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Financial Reports</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Reports
          </Button>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Financial Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Generated Reports</TabsTrigger>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Financial Metrics */}
          {metrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-[var(--chart-green)]" />
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Total Revenue</p>
                      <p className="text-2xl font-bold">KES {metrics.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8 text-[var(--chart-red)]" />
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Total Expenses</p>
                      <p className="text-2xl font-bold">KES {metrics.totalExpenses.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-[var(--chart-blue)]" />
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Net Income</p>
                      <p className={`text-2xl font-bold ${
                        metrics.netIncome >= 0 ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'
                      }`}>
                        KES {metrics.netIncome.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-8 w-8 text-[var(--chart-purple)]" />
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Collection Rate</p>
                      <p className="text-2xl font-bold">{metrics.feeCollectionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses Trend</h3>
                  <div className="h-80">
                    <Line 
                      data={{
                        labels: metrics.monthlyTrends.map(item => item.month),
                        datasets: [
                          {
                            label: 'Revenue',
                            data: metrics.monthlyTrends.map(item => item.revenue),
                            borderColor: 'var(--success)',
                            backgroundColor: 'var(--success-light)',
                            tension: 0.4,
                          },
                          {
                            label: 'Expenses',
                            data: metrics.monthlyTrends.map(item => item.expenses),
                            borderColor: 'var(--danger)',
                            backgroundColor: 'var(--danger-light)',
                            tension: 0.4,
                          },
                          {
                            label: 'Net Income',
                            data: metrics.monthlyTrends.map(item => item.netIncome),
                            borderColor: 'var(--chart-blue)',
                            backgroundColor: 'rgba(var(--chart-blue-rgb), 0.1)',
                            tension: 0.4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return 'KES ' + Number(value).toLocaleString();
                              }
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue Sources</h3>
                  <div className="h-80 flex items-center justify-center">
                    <Doughnut 
                      data={{
                        labels: metrics.revenueBySource.map(item => item.source),
                        datasets: [
                          {
                            data: metrics.revenueBySource.map(item => item.percentage),
                            backgroundColor: [
                              'var(--chart-blue)',
                              'var(--chart-green)',
                              'var(--chart-yellow)',
                              'var(--chart-red)',
                              'var(--chart-purple)',
                            ],
                            borderWidth: 2,
                            borderColor: 'var(--white-pure)',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }}
                    />
                  </div>
                </Card>
              </div>

              {/* Expense Breakdown */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
                <div className="h-80">
                  <Bar 
                    data={{
                      labels: metrics.expensesByCategory.map(item => item.category),
                      datasets: [
                        {
                          label: 'Amount (KES)',
                          data: metrics.expensesByCategory.map(item => item.amount),
                          backgroundColor: 'rgba(var(--chart-red-rgb), 0.8)',
                          borderColor: 'var(--chart-red)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return 'KES ' + Number(value).toLocaleString();
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generated Reports</h3>
              <div className="flex space-x-4">
                <Select>
                  <option value="">All Types</option>
                  <option value="INCOME_STATEMENT">Income Statement</option>
                  <option value="CASH_FLOW">Cash Flow</option>
                  <option value="BALANCE_SHEET">Balance Sheet</option>
                  <option value="FEE_COLLECTION">Fee Collection</option>
                </Select>
                <Select>
                  <option value="">All Periods</option>
                  <option value="DAILY">Daily</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="TERMLY">Termly</option>
                  <option value="ANNUALLY">Annually</option>
                </Select>
              </div>
            </div>
            <DataTable
              columns={reportColumns}
              data={reports}
              loading={loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{template.description}</p>
                  </div>
                  <Badge variant="outline">{template.type}</Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Sections:</p>
                  {template.sections.slice(0, 3).map((section, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        section.required ? 'bg-[var(--danger)]' : 'bg-[var(--border-default)]'
                      }`}></div>
                      <span className="text-sm">{section.name}</span>
                    </div>
                  ))}
                  {template.sections.length > 3 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      +{template.sections.length - 3} more sections
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {template.customizable && (
                      <Badge variant="secondary" className="text-xs">Customizable</Badge>
                    )}
                    {template.automated && (
                      <Badge variant="secondary" className="text-xs">Automated</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Financial Health Score</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Liquidity Ratio</span>
                  <span className="text-sm">85%</span>
                </div>
                <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                  <div className="bg-[var(--success)] h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Collection Efficiency</span>
                  <span className="text-sm">92%</span>
                </div>
                <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                  <div className="bg-[var(--success)] h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Budget Adherence</span>
                  <span className="text-sm">78%</span>
                </div>
                <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                  <div className="bg-[var(--warning)] h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Average Collection Time</p>
                    <p className="text-xs text-[var(--text-secondary)]">Days to collect fees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">12</p>
                    <p className="text-xs text-[var(--chart-green)]">-2 days vs last term</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Bad Debt Ratio</p>
                    <p className="text-xs text-[var(--text-secondary)]">Uncollectable fees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">2.3%</p>
                    <p className="text-xs text-[var(--chart-red)]">+0.5% vs last term</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Operating Margin</p>
                    <p className="text-xs text-[var(--text-secondary)]">Profit margin</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">15.7%</p>
                    <p className="text-xs text-[var(--chart-green)]">+1.2% vs last term</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}