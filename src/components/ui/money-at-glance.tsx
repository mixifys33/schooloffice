'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Users, DollarSign, Shield, Eye } from 'lucide-react'

interface MoneyAtGlanceData {
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  unpaidStudentsCount: number
  unpaidStudents: Array<{
    id: string
    name: string
    class: string
    balance: number
  }>
  lastUpdated: string
  lastEditedBy?: string
  paymentsToday: Array<{
    id: string
    amount: number
    receivedBy: string
    receivedAt: string
    studentName: string
  }>
  auditSummary: {
    totalTransactions: number
    lastAuditDate: string
    auditStatus: 'CLEAN' | 'ISSUES' | 'PENDING'
  }
}

interface MoneyAtGlanceProps {
  schoolId: string
  termId?: string
  className?: string
  showAuditInfo?: boolean
}

export function MoneyAtGlance({ 
  schoolId, 
  termId, 
  className = '',
  showAuditInfo = true 
}: MoneyAtGlanceProps) {
  const [data, setData] = useState<MoneyAtGlanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUnpaidList, setShowUnpaidList] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

  const fetchMoneyData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ schoolId })
      if (termId) params.append('termId', termId)
      
      const response = await fetch(`/api/finance/money-at-glance?${params}`)
      if (!response.ok) throw new Error('Failed to fetch money data')
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching money data:', err)
      setData({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        unpaidStudentsCount: 0,
        unpaidStudents: [],
        lastUpdated: new Date().toISOString(),
        lastEditedBy: 'System',
        paymentsToday: [],
        auditSummary: {
          totalTransactions: 0,
          lastAuditDate: new Date().toISOString(),
          auditStatus: 'PENDING'
        }
      })
    } finally {
      setLoading(false)
    }
  }, [schoolId, termId])

  useEffect(() => {
    fetchMoneyData()
    // Auto-refresh every 5 minutes (optimized for performance)
    const interval = setInterval(fetchMoneyData, 300000)
    return () => clearInterval(interval)
  }, [fetchMoneyData])

  const handleSendReminders = async () => {
    setSendingReminders(true)
    try {
      const response = await fetch('/api/sms/send-fee-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, termId })
      })
      
      if (response.ok) {
        alert('Fee reminders sent successfully!')
        fetchMoneyData() // Refresh data
      } else {
        throw new Error('Failed to send reminders')
      }
    } catch {
      alert('Failed to send reminders. Please try again.')
    } finally {
      setSendingReminders(false)
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-full"></div>
                <div className="h-10 bg-[var(--bg-surface)] rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={`p-6 border-2 border-[var(--danger)] ${className}`}>
        <div className="text-center text-[var(--chart-red)]">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">FINANCIAL DATA UNAVAILABLE</h3>
          <p className="mb-4">Cannot load money status. This is a critical system failure.</p>
          <Button onClick={fetchMoneyData} variant="outline">
            Retry Loading
          </Button>
        </div>
      </Card>
    )
  }

  const collectionRate = data.totalExpected > 0 
    ? (data.totalCollected / data.totalExpected) * 100 
    : 0

  const isHealthy = collectionRate >= 80 && data.totalOutstanding < (data.totalExpected * 0.2)

  return (
    <div className={className}>
      {/* RUTHLESS MONEY TRUTH - 5 SECOND RULE */}
      <Card className={`p-8 border-4 ${isHealthy ? 'border-[var(--success)]' : 'border-[var(--danger)]'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className={`h-8 w-8 ${isHealthy ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'}`} />
            <h2 className="text-2xl font-black text-[var(--text-primary)]">
              HOW MUCH ARE WE OWED?
            </h2>
          </div>
          {showAuditInfo && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Shield className="h-4 w-4" />
              <span className="font-medium">AUDIT-READY</span>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View Audit Trail
              </Button>
            </div>
          )}
        </div>
        
        {/* THE ANSWER IN 5 SECONDS */}
        <div className="grid grid-cols-4 gap-8 mb-8">
          {/* Expected - What Should Come In */}
          <div className="text-center p-4 bg-[var(--info-light)] rounded-lg">
            <div className="text-sm font-bold text-[var(--info-dark)] mb-2">EXPECTED FEES</div>
            <div className="text-3xl font-black text-[var(--info-dark)]">
              UGX {data.totalExpected.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--chart-blue)] mt-1">Total due this term</div>
          </div>

          {/* Collected - What Actually Came In */}
          <div className="text-center p-4 bg-[var(--success-light)] rounded-lg">
            <div className="text-sm font-bold text-[var(--success-dark)] mb-2">COLLECTED</div>
            <div className="text-3xl font-black text-[var(--success-dark)]">
              UGX {data.totalCollected.toLocaleString()}
            </div>
            <div className="text-sm font-bold text-[var(--chart-green)]">
              {collectionRate.toFixed(1)}% collected
            </div>
          </div>

          {/* Outstanding - The Problem */}
          <div className="text-center p-4 bg-[var(--danger-light)] rounded-lg">
            <div className="text-sm font-bold text-[var(--danger-dark)] mb-2">STILL OWED</div>
            <div className="text-3xl font-black text-[var(--danger-dark)]">
              UGX {data.totalOutstanding.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--chart-red)] mt-1">Missing money</div>
          </div>

          {/* Unpaid Students - The Action */}
          <div 
            className="text-center p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--warning-light)',
              color: 'var(--warning-dark)'
            }}
          >
            <div 
              className="text-sm font-bold mb-2"
              style={{ color: 'var(--warning-dark)' }}
            >
              UNPAID STUDENTS
            </div>
            <div 
              className="text-3xl font-black"
              style={{ color: 'var(--warning-dark)' }}
            >
              {data.unpaidStudentsCount}
            </div>
            <Button 
              size="sm" 
              className="mt-2 hover:opacity-90"
              style={{
                backgroundColor: 'var(--warning)',
                color: 'var(--bg-main)'
              }}
              onClick={() => setShowUnpaidList(!showUnpaidList)}
            >
              {showUnpaidList ? 'Hide' : 'Show'} Names
            </Button>
          </div>
        </div>

        {/* IMMEDIATE ACTIONS - NO THINKING REQUIRED */}
        <div className="flex justify-center gap-6 pt-6 border-t-2 border-[var(--border-default)]">
          <Button 
            size="lg"
            className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)] font-bold px-8"
          >
            <DollarSign className="h-5 w-5 mr-2" />
            RECORD PAYMENT NOW
          </Button>
          
          <Button 
            size="lg"
            variant="outline"
            disabled={data.unpaidStudentsCount === 0 || sendingReminders}
            onClick={handleSendReminders}
            className="font-bold px-8 border-2 hover:opacity-80"
            style={{
              borderColor: 'var(--warning)',
              color: 'var(--warning-dark)',
              backgroundColor: 'transparent'
            }}
          >
            {sendingReminders ? 'SENDING...' : `SEND REMINDERS (${data.unpaidStudentsCount})`}
          </Button>

          <Button 
            size="lg"
            variant="outline"
            className="border-2 border-[var(--accent-primary)] text-[var(--accent-hover)] hover:bg-[var(--info-light)] font-bold px-8"
          >
            <Shield className="h-5 w-5 mr-2" />
            AUDIT SUMMARY
          </Button>
        </div>

        {/* Last Updated - Trust Building */}
        <div className="text-center mt-4 text-sm text-[var(--text-muted)]">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchMoneyData}
            className="ml-2 text-xs"
          >
            Refresh Now
          </Button>
        </div>
      </Card>

      {/* UNPAID STUDENTS - NAMES AND SHAME */}
      {showUnpaidList && data.unpaidStudents.length > 0 && (
        <Card 
          className="mt-6 p-6 border-2"
          style={{ borderColor: 'var(--warning)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-xl font-bold flex items-center"
              style={{ color: 'var(--warning-dark)' }}
            >
              <Users className="h-6 w-6 mr-3" />
              STUDENTS WHO HAVE NOT PAID ({data.unpaidStudentsCount})
            </h3>
            <div className="flex gap-3">
              <Button 
                size="sm" 
                className="hover:opacity-90"
                style={{
                  backgroundColor: 'var(--warning)',
                  color: 'var(--bg-main)'
                }}
                onClick={handleSendReminders}
                disabled={sendingReminders}
              >
                {sendingReminders ? 'SENDING...' : 'SEND ALL REMINDERS'}
              </Button>
              <Button size="sm" variant="outline">
                EXPORT LIST
              </Button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.unpaidStudents.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--warning-light)',
                  borderColor: 'var(--warning)'
                }}
              >
                <div>
                  <div 
                    className="font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {student.name}
                  </div>
                  <div 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {student.class}
                  </div>
                </div>
                <div className="text-right">
                  <div 
                    className="font-black text-lg"
                    style={{ color: 'var(--danger-dark)' }}
                  >
                    UGX {student.balance.toLocaleString()}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 border hover:opacity-80"
                    style={{
                      borderColor: 'var(--warning)',
                      color: 'var(--warning-dark)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    SEND REMINDER
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}