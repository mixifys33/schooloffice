'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  ReportParams,
  UsageReport,
  DeliveryReport,
  CostReport,
  ScheduledReportConfig,
  MessageChannel
} from '@/types/communication-hub'

/**
 * Reports Tab Component
 * Requirements: 8.1-8.8, 10.16, 10.17
 * - Report generation forms
 * - Date range selectors
 * - Visual charts for trends
 * - Export buttons (CSV/PDF)
 * - Scheduled reports management
 */

interface ReportsTabProps {
  onGenerateUsageReport: (params: ReportParams) => Promise<UsageReport>
  onGenerateDeliveryReport: (params: ReportParams) => Promise<DeliveryReport>
  onGenerateCostReport: (params: ReportParams) => Promise<CostReport>
}

type ReportType = 'usage' | 'delivery' | 'cost'

function ReportForm({ 
  onGenerate, 
  loading 
}: { 
  onGenerate: (type: ReportType, params: ReportParams) => void
  loading: boolean
}) {
  const [reportType, setReportType] = useState<ReportType>('usage')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [schoolId, setSchoolId] = useState('')

  const handleGenerate = () => {
    onGenerate(reportType, {
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      schoolId: schoolId || undefined
    })
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-[var(--text-secondary)]">Generate Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]">
              <option value="usage">Usage Report</option>
              <option value="delivery">Delivery Report</option>
              <option value="cost">Cost Report</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-700 border-slate-600" />
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-700 border-slate-600" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={loading} className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]">
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


function UsageReportView({ report, onExport }: { report: UsageReport; onExport: (format: 'csv' | 'pdf') => void }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--text-secondary)]">Usage Report</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onExport('csv')} className="bg-slate-700 border-slate-600">Export CSV</Button>
            <Button size="sm" variant="outline" onClick={() => onExport('pdf')} className="bg-slate-700 border-slate-600">Export PDF</Button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">{report.summary.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Total Messages</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--chart-blue)]">{(report.summary.byChannel[MessageChannel.SMS] || 0).toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">SMS</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--success)]">{(report.summary.byChannel[MessageChannel.WHATSAPP] || 0).toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">WhatsApp</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--chart-purple)]">{(report.summary.byChannel[MessageChannel.EMAIL] || 0).toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Email</p>
          </div>
        </div>

        {/* Simple Bar Chart */}
        {report.trends && report.trends.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Usage Trend</h4>
            <div className="flex items-end space-x-1 h-32">
              {report.trends.map((t, i) => {
                const maxCount = Math.max(...report.trends.map(x => x.count))
                const height = maxCount > 0 ? (t.count / maxCount) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[var(--chart-blue)] rounded-t" style={{ height: `${height}%` }} title={`${t.count} messages`} />
                    <span className="text-xs text-[var(--text-muted)] mt-1 truncate w-full text-center">{new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* School Breakdown */}
        {report.summary.bySchool && report.summary.bySchool.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">By School</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">School</th>
                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">SMS</th>
                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">WhatsApp</th>
                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Email</th>
                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-muted)]">
                  {report.summary.bySchool.map((s, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="py-2 px-3">{s.schoolName}</td>
                      <td className="py-2 px-3 text-right">{s.sms.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{s.whatsapp.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{s.email.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-medium">{s.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


function DeliveryReportView({ report, onExport }: { report: DeliveryReport; onExport: (format: 'csv' | 'pdf') => void }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--text-secondary)]">Delivery Report</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onExport('csv')} className="bg-slate-700 border-slate-600">Export CSV</Button>
            <Button size="sm" variant="outline" onClick={() => onExport('pdf')} className="bg-slate-700 border-slate-600">Export PDF</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">{report.overall.sent.toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Sent</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--success)]">{report.overall.delivered.toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Delivered</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--danger)]">{report.overall.failed.toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Failed</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className={`text-2xl font-semibold ${report.overall.successRate >= 95 ? 'text-[var(--success)]' : report.overall.successRate >= 85 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
              {report.overall.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--text-muted)]">Success Rate</p>
          </div>
        </div>

        {/* By Channel */}
        <div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">By Channel</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(report.byChannel).map(([channel, stats]) => (
              <div key={channel} className="bg-slate-700/30 rounded-lg p-4">
                <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{channel}</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sent:</span><span className="text-[var(--text-secondary)]">{stats.sent.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Delivered:</span><span className="text-[var(--success)]">{stats.delivered.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Failed:</span><span className="text-[var(--danger)]">{stats.failed.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Rate:</span><span className={stats.successRate >= 95 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>{stats.successRate.toFixed(1)}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CostReportView({ report, onExport }: { report: CostReport; onExport: (format: 'csv' | 'pdf') => void }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--text-secondary)]">Cost Report</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onExport('csv')} className="bg-slate-700 border-slate-600">Export CSV</Button>
            <Button size="sm" variant="outline" onClick={() => onExport('pdf')} className="bg-slate-700 border-slate-600">Export PDF</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">${report.totalCost.toFixed(2)}</div>
            <p className="text-xs text-[var(--text-muted)]">Total Cost</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">{report.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-[var(--text-muted)]">Total Messages</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">${report.averageCostPerMessage.toFixed(4)}</div>
            <p className="text-xs text-[var(--text-muted)]">Avg Cost/Message</p>
          </div>
        </div>

        {report.byChannel && (
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Cost by Channel</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(report.byChannel).map(([channel, data]) => (
                <div key={channel} className="bg-slate-700/30 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{channel}</h5>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cost:</span><span className="text-[var(--text-secondary)]">${data.cost.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Messages:</span><span className="text-[var(--text-secondary)]">{data.count.toLocaleString()}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


function ScheduledReportsPanel() {
  const [reports, setReports] = useState<ScheduledReportConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'usage' as 'usage' | 'delivery' | 'cost',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recipients: ''
  })

  React.useEffect(() => {
    fetch('/api/admin/communication-hub/reports/scheduled')
      .then(r => r.ok ? r.json() : [])
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    const response = await fetch('/api/admin/communication-hub/reports/scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean)
      })
    })
    if (response.ok) {
      const newReport = await response.json()
      setReports([...reports, newReport])
      setShowForm(false)
      setFormData({ name: '', reportType: 'usage', frequency: 'weekly', recipients: '' })
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/communication-hub/reports/scheduled/${id}`, { method: 'DELETE' })
    setReports(reports.filter(r => r.id !== id))
  }

  if (loading) return <SkeletonLoader variant="list" count={3} />

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--text-secondary)]">Scheduled Reports</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]">
            {showForm ? 'Cancel' : 'Schedule New'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Report Name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-slate-700 border-slate-600" />
              <select value={formData.reportType} onChange={(e) => setFormData(p => ({ ...p, reportType: e.target.value as 'usage' | 'delivery' | 'cost' }))} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]">
                <option value="usage">Usage</option>
                <option value="delivery">Delivery</option>
                <option value="cost">Cost</option>
              </select>
              <select value={formData.frequency} onChange={(e) => setFormData(p => ({ ...p, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <Input placeholder="Recipients (comma-separated)" value={formData.recipients} onChange={(e) => setFormData(p => ({ ...p, recipients: e.target.value }))} className="bg-slate-700 border-slate-600" />
            </div>
            <Button onClick={handleCreate} disabled={!formData.name} className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)]">Create Schedule</Button>
          </div>
        )}

        {reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{r.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.reportType} • {r.frequency} • {r.recipients.length} recipient(s)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.isActive ? 'bg-[var(--success-dark)]/50 text-[var(--success)]' : 'bg-slate-700 text-[var(--text-muted)]'}`}>
                    {r.isActive ? 'Active' : 'Paused'}
                  </span>
                  <button onClick={() => handleDelete(r.id)} className="text-[var(--danger)] hover:text-[var(--danger)] text-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm text-center py-4">No scheduled reports</p>
        )}
      </CardContent>
    </Card>
  )
}


export default function ReportsTab({ onGenerateUsageReport, onGenerateDeliveryReport, onGenerateCostReport }: ReportsTabProps) {
  const [loading, setLoading] = useState(false)
  const [currentReport, setCurrentReport] = useState<{ type: ReportType; data: UsageReport | DeliveryReport | CostReport } | null>(null)
  const [view, setView] = useState<'generate' | 'scheduled'>('generate')

  const handleGenerate = async (type: ReportType, params: ReportParams) => {
    setLoading(true)
    try {
      let data
      switch (type) {
        case 'usage':
          data = await onGenerateUsageReport(params)
          break
        case 'delivery':
          data = await onGenerateDeliveryReport(params)
          break
        case 'cost':
          data = await onGenerateCostReport(params)
          break
      }
      setCurrentReport({ type, data })
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!currentReport) return
    try {
      const response = await fetch(`/api/admin/communication-hub/reports/export?type=${currentReport.type}&format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentReport.data)
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentReport.type}-report.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Reports & Analytics</h2>
          <p className="text-sm text-[var(--text-muted)]">Generate and schedule messaging reports</p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button onClick={() => setView('generate')} className={`px-3 py-1 text-sm rounded ${view === 'generate' ? 'bg-slate-700 text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Generate</button>
          <button onClick={() => setView('scheduled')} className={`px-3 py-1 text-sm rounded ${view === 'scheduled' ? 'bg-slate-700 text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Scheduled</button>
        </div>
      </div>

      {view === 'generate' && (
        <>
          <ReportForm onGenerate={handleGenerate} loading={loading} />
          {currentReport && (
            <>
              {currentReport.type === 'usage' && <UsageReportView report={currentReport.data as UsageReport} onExport={handleExport} />}
              {currentReport.type === 'delivery' && <DeliveryReportView report={currentReport.data as DeliveryReport} onExport={handleExport} />}
              {currentReport.type === 'cost' && <CostReportView report={currentReport.data as CostReport} onExport={handleExport} />}
            </>
          )}
        </>
      )}

      {view === 'scheduled' && <ScheduledReportsPanel />}
    </div>
  )
}
