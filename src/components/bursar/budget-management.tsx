'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2,
  Users,
  BookOpen,
  Zap,
  Car,
  Wrench,
  MoreHorizontal,
  PieChart,
  BarChart3,
  Download,
  Upload,
  Filter,
  Search,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { MultiFilter, FilterConfig, ActiveFilter } from '@/components/ui/multi-filter'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_UTILIZED' | 'CRITICAL';
  department: string;
  period: 'MONTHLY' | 'TERMLY' | 'ANNUALLY';
  startDate: string;
  endDate: string;
  lastUpdated: string;
  createdBy: string;
}

interface BudgetAlert {
  id: string;
  categoryId: string;
  categoryName: string;
  type: 'OVERSPEND' | 'UNDERSPEND' | 'THRESHOLD' | 'DEADLINE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  threshold: number;
  currentValue: number;
  createdAt: string;
  acknowledged: boolean;
}

interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  invoiceNumber?: string;
  approvedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
  categoriesOverBudget: number;
  categoriesUnderUtilized: number;
  monthlyTrend: Array<{
    month: string;
    budgeted: number;
    spent: number;
  }>;
  departmentBreakdown: Array<{
    department: string;
    budgeted: number;
    spent: number;
    percentage: number;
  }>;
}

export function BudgetManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    period: '',
    dateRange: 'current-term'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  useEffect(() => {
    fetchBudgetData();
  }, [filters]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, alertsRes, expensesRes, summaryRes] = await Promise.all([
        fetch(`/api/bursar/budget/categories?${new URLSearchParams(filters)}`),
        fetch('/api/bursar/budget/alerts'),
        fetch(`/api/bursar/budget/expenses?${new URLSearchParams(filters)}`),
        fetch('/api/bursar/budget/summary')
      ]);

      const [categoriesData, alertsData, expensesData, summaryData] = await Promise.all([
        categoriesRes.json(),
        alertsRes.json(),
        expensesRes.json(),
        summaryRes.json()
      ]);

      setBudgetCategories(categoriesData);
      setBudgetAlerts(alertsData);
      setExpenses(expensesData);
      setBudgetSummary(summaryData);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData: Partial<BudgetCategory>) => {
    try {
      const response = await fetch('/api/bursar/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        fetchBudgetData();
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Error creating budget category:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/bursar/budget/alerts/${alertId}/acknowledge`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchBudgetData();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'OVER_BUDGET': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      case 'UNDER_UTILIZED': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'CRITICAL': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'MEDIUM': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'HIGH': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'CRITICAL': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const budgetCategoryColumns = [
    {
      header: 'Category',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-[var(--text-muted)]">{row.original.description}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {row.original.department}
          </Badge>
        </div>
      )
    },
    {
      header: 'Budget vs Spent',
      accessorKey: 'budgetedAmount',
      cell: ({ row }: any) => (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Budgeted: KES {row.original.budgetedAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Spent: KES {row.original.spentAmount.toLocaleString()}</span>
          </div>
          <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                row.original.percentage > 100 ? 'bg-[var(--danger)]' : 
                row.original.percentage > 80 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
              }`}
              style={{ width: `${Math.min(row.original.percentage, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {row.original.percentage.toFixed(1)}% utilized
          </div>
        </div>
      )
    },
    {
      header: 'Remaining',
      accessorKey: 'remainingAmount',
      cell: ({ row }: any) => (
        <div className="text-right">
          <p className={`font-medium ${
            row.original.remainingAmount < 0 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-green)]'
          }`}>
            KES {Math.abs(row.original.remainingAmount).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {row.original.remainingAmount < 0 ? 'Over budget' : 'Remaining'}
          </p>
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
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status.replace('_', ' ')}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingCategory(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--chart-red)] hover:text-[var(--danger-dark)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const alertColumns = [
    {
      header: 'Alert',
      accessorKey: 'message',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.message}</p>
          <p className="text-sm text-[var(--text-muted)]">{row.original.categoryName}</p>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.type}</Badge>
      )
    },
    {
      header: 'Severity',
      accessorKey: 'severity',
      cell: ({ row }: any) => (
        <Badge className={getSeverityColor(row.original.severity)}>
          {row.original.severity}
        </Badge>
      )
    },
    {
      header: 'Threshold vs Current',
      accessorKey: 'threshold',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <p>Threshold: {row.original.threshold}%</p>
          <p className="text-[var(--text-secondary)]">Current: {row.original.currentValue}%</p>
        </div>
      )
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => (
        <span className="text-sm">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          {!row.original.acknowledged && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAcknowledgeAlert(row.original.id)}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const expenseColumns = [
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.description}</p>
          <p className="text-sm text-[var(--text-muted)]">{row.original.categoryName}</p>
          {row.original.vendor && (
            <p className="text-xs text-[var(--text-muted)]">Vendor: {row.original.vendor}</p>
          )}
        </div>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }: any) => (
        <span className="font-medium">KES {row.original.amount.toLocaleString()}</span>
      )
    },
    {
      header: 'Date',
      accessorKey: 'expenseDate',
      cell: ({ row }: any) => (
        <span className="text-sm">
          {new Date(row.original.expenseDate).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <Badge 
          variant={row.original.status === 'APPROVED' ? 'default' : 'secondary'}
          className={
            row.original.status === 'APPROVED' ? 'bg-[var(--success-light)] text-[var(--success-dark)]' :
            row.original.status === 'REJECTED' ? 'bg-[var(--danger-light)] text-[var(--danger-dark)]' :
            row.original.status === 'PAID' ? 'bg-[var(--info-light)] text-[var(--info-dark)]' : ''
          }
        >
          {row.original.status}
        </Badge>
      )
    },
    {
      header: 'Approved By',
      accessorKey: 'approvedBy',
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.approvedBy}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Budget Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Budget
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      {budgetSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-[var(--chart-blue)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Budget</p>
                <p className="text-2xl font-bold">KES {budgetSummary.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-[var(--chart-green)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Spent</p>
                <p className="text-2xl font-bold">KES {budgetSummary.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {budgetSummary.utilizationRate.toFixed(1)}% utilized
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-[var(--chart-yellow)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Remaining</p>
                <p className="text-2xl font-bold">KES {budgetSummary.totalRemaining.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-[var(--chart-red)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Over Budget</p>
                <p className="text-2xl font-bold">{budgetSummary.categoriesOverBudget}</p>
                <p className="text-sm text-[var(--text-muted)]">Categories</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Active Alerts */}
      {budgetAlerts.filter(alert => !alert.acknowledged).length > 0 && (
        <Card className="p-4 border-[var(--danger-light)] bg-[var(--danger-light)]">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-[var(--chart-red)]" />
            <h3 className="font-semibold text-[var(--danger-dark)]">Budget Alerts</h3>
          </div>
          <div className="space-y-2">
            {budgetAlerts.filter(alert => !alert.acknowledged).slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-2 bg-[var(--bg-main)] rounded">
                <div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{alert.categoryName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Budget Categories</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {budgetSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Budget vs Spending Trend</h3>
                <div className="h-80">
                  <Line 
                    data={{
                      labels: budgetSummary.monthlyTrend.map(item => item.month),
                      datasets: [
                        {
                          label: 'Budgeted',
                          data: budgetSummary.monthlyTrend.map(item => item.budgeted),
                          borderColor: 'var(--chart-blue)',
                          backgroundColor: 'rgba(var(--chart-blue-rgb), 0.1)',
                          tension: 0.4,
                        },
                        {
                          label: 'Spent',
                          data: budgetSummary.monthlyTrend.map(item => item.spent),
                          borderColor: 'var(--chart-red)',
                          backgroundColor: 'rgba(var(--chart-red-rgb), 0.1)',
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
                <h3 className="text-lg font-semibold mb-4">Department Budget Breakdown</h3>
                <div className="h-80 flex items-center justify-center">
                  <Doughnut 
                    data={{
                      labels: budgetSummary.departmentBreakdown.map(item => item.department),
                      datasets: [
                        {
                          data: budgetSummary.departmentBreakdown.map(item => item.percentage),
                          backgroundColor: [
                            'var(--chart-blue)',
                            'var(--chart-green)',
                            'var(--chart-yellow)',
                            'var(--chart-red)',
                            'var(--chart-purple)',
                            'var(--chart-cyan)',
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
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Budget Categories</h3>
              <div className="flex space-x-4">
                <SearchInput
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                <MultiFilter
                  filters={[
                    { key: 'department', label: 'Department', options: ['Academic', 'Administration', 'Facilities', 'Technology'] },
                    { key: 'status', label: 'Status', options: ['ON_TRACK', 'OVER_BUDGET', 'UNDER_UTILIZED', 'CRITICAL'] },
                    { key: 'period', label: 'Period', options: ['MONTHLY', 'TERMLY', 'ANNUALLY'] }
                  ]}
                  values={filters}
                  onChange={setFilters}
                />
              </div>
            </div>
            <DataTable
              columns={budgetCategoryColumns}
              data={budgetCategories}
              loading={loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Expense Records</h3>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Expense
              </Button>
            </div>
            <DataTable
              columns={expenseColumns}
              data={expenses}
              loading={loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Budget Alerts</h3>
              <Button variant="outline">
                Configure Thresholds
              </Button>
            </div>
            <DataTable
              columns={alertColumns}
              data={budgetAlerts}
              loading={loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Budget Performance by Category</h3>
              <div className="space-y-4">
                {budgetCategories.slice(0, 5).map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category.name}</span>
                      <span>{category.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          category.percentage > 100 ? 'bg-[var(--danger)]' : 
                          category.percentage > 80 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'
                        }`}
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{expense.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">KES {expense.amount.toLocaleString()}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          expense.status === 'APPROVED' ? 'border-[var(--success)] text-[var(--chart-green)]' :
                          expense.status === 'REJECTED' ? 'border-[var(--danger)] text-[var(--chart-red)]' :
                          'border-[var(--warning)] text-[var(--warning)]'
                        }`}
                      >
                        {expense.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}