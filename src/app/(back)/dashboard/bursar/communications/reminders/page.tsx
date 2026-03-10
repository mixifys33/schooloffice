'use client'

import { useState, useEffect } from 'react'
import { Send, Users, DollarSign, AlertTriangle, CheckCircle, Loader2, Phone, Bell, Clock, Settings, Calendar, Play, Pause } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

interface Defaulter {
  id: string
  studentName: string
  className: string
  outstandingAmount: number
  daysPastDue: number
  guardianName: string
  guardianPhone: string
  selected: boolean
}

interface AutomationSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  time: string // HH:MM format
  minBalance: number
  lastRun?: string
  nextRun?: string
}

export default function BursarCommunicationsPage() {
  const [activeTab, setActiveTab] = useState('manual')
  
  // Manual reminders state
  const [defaulters, setDefaulters] = useState<Defaulter[]>([])
  const [loadingDefaulters, setLoadingDefaulters] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filters
  const [classFilter, setClassFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [minBalanceFilter, setMinBalanceFilter] = useState(0)
  
  // Message
  const [customMessage, setCustomMessage] = useState(
    '{studentName} ({className}) has outstanding fees of {balance}. Please pay now. Thank you.'
  )
  
  // Automation state
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    enabled: false,
    frequency: 'weekly',
    dayOfWeek: 5, // Friday
    time: '09:00',
    minBalance: 10000,
  })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (activeTab === 'manual') {
      fetchDefaulters()
    } else if (activeTab === 'automation') {
      fetchAutomationSettings()
    }
  }, [activeTab])

  const fetchDefaulters = async () => {
    try {
      setLoadingDefaulters(true)
      setError(null)
      
      const response = await fetch('/api/bursar/dashboard/top-defaulters?limit=1000')
      if (!response.ok) throw new Error('Failed to fetch defaulters')
      
      const data = await response.json()
      
      if (data.success && data.defaulters) {
        setDefaulters(data.defaulters.map((d: any) => ({
          id: d.id,
          studentName: d.studentName,
          className: d.className,
          outstandingAmount: d.outstandingAmount,
          daysPastDue: d.daysPastDue,
          guardianName: 'Guardian', // TODO: Get from API
          guardianPhone: '+256700000000', // TODO: Get from API
          selected: false
        })))
      }
    } catch (error) {
      console.error('Failed to load defaulters:', error)
      setError('Failed to load defaulters')
    } finally {
      setLoadingDefaulters(false)
    }
  }

  const fetchAutomationSettings = async () => {
    try {
      setLoadingSettings(true)
      const response = await fetch('/api/bursar/communications/automation-settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const data = await response.json()
      if (data.success && data.settings) {
        setAutomationSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load automation settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  const saveAutomationSettings = async () => {
    try {
      setSavingSettings(true)
      setError(null)
      
      const response = await fetch('/api/bursar/communications/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationSettings)
      })
      
      if (!response.ok) throw new Error('Failed to save settings')
      
      const data = await response.json()
      if (data.success) {
        setSuccess('Automation settings saved successfully!')
        if (data.settings) {
          setAutomationSettings(data.settings)
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setError('Failed to save automation settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const filteredDefaulters = defaulters.filter(d => {
    const matchesClass = classFilter === 'all' || d.className === classFilter
    const matchesSearch = !searchTerm || 
      d.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.guardianName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBalance = d.outstandingAmount >= minBalanceFilter
    return matchesClass && matchesSearch && matchesBalance
  })

  const toggleDefaulter = (id: string) => {
    setDefaulters(defaulters.map(d => d.id === id ? { ...d, selected: !d.selected } : d))
  }

  const toggleAll = () => {
    const allSelected = filteredDefaulters.every(d => d.selected)
    setDefaulters(defaulters.map(d => {
      const isInFiltered = filteredDefaulters.some(fd => fd.id === d.id)
      return isInFiltered ? { ...d, selected: !allSelected } : d
    }))
  }

  const handleSendReminders = async () => {
    const selected = defaulters.filter(d => d.selected)
    if (selected.length === 0) {
      setError('Please select at least one student')
      return
    }
    if (!customMessage) {
      setError('Please enter a message')
      return
    }
    if (!confirm(`Send SMS reminders to ${selected.length} guardians?`)) return

    try {
      setSending(true)
      setError(null)
      
      const response = await fetch('/api/bursar/communications/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaulters: selected,
          message: customMessage
        })
      })
      
      if (!response.ok) throw new Error('Failed to send reminders')
      
      const result = await response.json()
      setSuccess(`Successfully sent ${result.sent} reminders!`)
      setDefaulters(defaulters.map(d => ({ ...d, selected: false })))
      
      // Refresh defaulters list
      setTimeout(() => fetchDefaulters(), 2000)
    } catch (error) {
      console.error('Failed to send reminders:', error)
      setError('Failed to send reminders')
    } finally {
      setSending(false)
    }
  }

  const handleTestAutomation = async () => {
    if (!confirm('Run automation test? This will send reminders to all eligible defaulters.')) return
    
    try {
      setSending(true)
      setError(null)
      
      const response = await fetch('/api/bursar/communications/test-automation', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to run test')
      
      const result = await response.json()
      setSuccess(`Test completed! Sent ${result.sent} reminders to ${result.totalRecipients} recipients.`)
    } catch (error) {
      console.error('Failed to run test:', error)
      setError('Failed to run automation test')
    } finally {
      setSending(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Format with comma as thousand separator for clarity
    return `UGX ${amount.toLocaleString('en-US')}`
  }

  const selectedCount = defaulters.filter(d => d.selected).length
  const totalBalance = defaulters.filter(d => d.selected).reduce((sum, d) => sum + d.outstandingAmount, 0)
  const uniqueClasses = Array.from(new Set(defaulters.map(d => d.className)))

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Reminders & Communications</h1>
        <p className="text-gray-600">Send manual reminders or configure automatic fee reminders</p>
      </div>

      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-900">{success}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSuccess(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-900">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">
            <Send className="h-4 w-4 mr-2" />
            Manual Reminders
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Clock className="h-4 w-4 mr-2" />
            Automation Settings
          </TabsTrigger>
        </TabsList>

        {/* MANUAL REMINDERS TAB */}
        <TabsContent value="manual" className="space-y-6">
          {loadingDefaulters ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading defaulters...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard 
                  title="Selected" 
                  value={String(selectedCount)} 
                  subtitle={`of ${filteredDefaulters.length} defaulters`} 
                  color="blue" 
                  icon={<Users className="h-6 w-6" />} 
                />
                <StatCard 
                  title="Total Balance" 
                  value={formatCurrency(totalBalance)} 
                  subtitle="Selected students" 
                  color="red" 
                  icon={<DollarSign className="h-6 w-6" />} 
                />
                <StatCard 
                  title="All Defaulters" 
                  value={String(defaulters.length)} 
                  subtitle="With outstanding fees" 
                  color="yellow" 
                  icon={<AlertTriangle className="h-6 w-6" />} 
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Search</Label>
                      <Input 
                        placeholder="Student or guardian name..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Class</Label>
                      <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {uniqueClasses.map(cls => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Minimum Balance</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={minBalanceFilter} 
                        onChange={(e) => setMinBalanceFilter(Number(e.target.value))} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Message Template</CardTitle>
                  <CardDescription>
                    Customize the reminder message. Available variables: {'{guardianName}'}, {'{studentName}'}, {'{className}'}, {'{balance}'}, {'{daysPastDue}'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    placeholder="Enter your message..." 
                    value={customMessage} 
                    onChange={(e) => setCustomMessage(e.target.value)} 
                    rows={4} 
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Messages will be sent via SMS to guardians' registered phone numbers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Defaulters ({filteredDefaulters.length})</CardTitle>
                      <CardDescription>Select students to send reminders</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={toggleAll}>
                        {filteredDefaulters.every(d => d.selected) ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSendReminders} 
                        disabled={sending || selectedCount === 0}
                      >
                        {sending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />Send to {selectedCount}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-4 text-left">
                            <Checkbox 
                              checked={filteredDefaulters.length > 0 && filteredDefaulters.every(d => d.selected)} 
                              onCheckedChange={toggleAll} 
                            />
                          </th>
                          <th className="py-2 px-4 text-left text-sm font-medium">Student</th>
                          <th className="py-2 px-4 text-left text-sm font-medium">Class</th>
                          <th className="py-2 px-4 text-left text-sm font-medium">Balance</th>
                          <th className="py-2 px-4 text-left text-sm font-medium">Days Overdue</th>
                          <th className="py-2 px-4 text-left text-sm font-medium">Guardian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDefaulters.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">
                              No defaulters found matching your filters
                            </td>
                          </tr>
                        ) : (
                          filteredDefaulters.map(defaulter => (
                            <tr key={defaulter.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <Checkbox 
                                  checked={defaulter.selected} 
                                  onCheckedChange={() => toggleDefaulter(defaulter.id)} 
                                />
                              </td>
                              <td className="py-3 px-4 font-medium">{defaulter.studentName}</td>
                              <td className="py-3 px-4 text-sm">{defaulter.className}</td>
                              <td className="py-3 px-4 font-medium text-red-600">
                                {formatCurrency(defaulter.outstandingAmount)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={defaulter.daysPastDue > 30 ? "destructive" : "default"}>
                                  {defaulter.daysPastDue} days
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs">
                                  <div className="font-medium">{defaulter.guardianName}</div>
                                  <div className="flex items-center gap-1 mt-1 text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    {defaulter.guardianPhone}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AUTOMATION SETTINGS TAB */}
        <TabsContent value="automation" className="space-y-6">
          {loadingSettings ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading settings...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Automation Status</CardTitle>
                      <CardDescription>
                        {automationSettings.enabled 
                          ? 'Automatic reminders are currently enabled' 
                          : 'Automatic reminders are currently disabled'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={automationSettings.enabled ? "default" : "secondary"} className="text-sm">
                        {automationSettings.enabled ? (
                          <><Play className="h-3 w-3 mr-1" />Active</>
                        ) : (
                          <><Pause className="h-3 w-3 mr-1" />Inactive</>
                        )}
                      </Badge>
                      <Switch 
                        checked={automationSettings.enabled} 
                        onCheckedChange={(checked) => setAutomationSettings({...automationSettings, enabled: checked})}
                      />
                    </div>
                  </div>
                </CardHeader>
                {automationSettings.enabled && (
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Last Run:</span>
                        <span className="ml-2 font-medium">
                          {automationSettings.lastRun || 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Next Run:</span>
                        <span className="ml-2 font-medium">
                          {automationSettings.nextRun || 'Not scheduled'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schedule Configuration</CardTitle>
                  <CardDescription>
                    Configure when automatic reminders should be sent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Frequency</Label>
                      <Select 
                        value={automationSettings.frequency} 
                        onValueChange={(v: any) => setAutomationSettings({...automationSettings, frequency: v})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {automationSettings.frequency === 'weekly' && (
                      <div>
                        <Label>Day of Week</Label>
                        <Select 
                          value={String(automationSettings.dayOfWeek)} 
                          onValueChange={(v) => setAutomationSettings({...automationSettings, dayOfWeek: Number(v)})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                              <SelectItem key={day} value={String(day)}>
                                {getDayName(day)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {automationSettings.frequency === 'monthly' && (
                      <div>
                        <Label>Day of Month</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="31" 
                          value={automationSettings.dayOfMonth || 1} 
                          onChange={(e) => setAutomationSettings({...automationSettings, dayOfMonth: Number(e.target.value)})}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Time</Label>
                      <Input 
                        type="time" 
                        value={automationSettings.time} 
                        onChange={(e) => setAutomationSettings({...automationSettings, time: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reminder Criteria</CardTitle>
                  <CardDescription>
                    Set conditions for which students should receive automatic reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Minimum Outstanding Balance (UGX)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      step="1000"
                      value={automationSettings.minBalance} 
                      onChange={(e) => setAutomationSettings({...automationSettings, minBalance: Number(e.target.value)})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only send reminders to students with balances above this amount
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  onClick={saveAutomationSettings} 
                  disabled={savingSettings}
                  className="flex-1"
                >
                  {savingSettings ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Settings className="h-4 w-4 mr-2" />Save Settings</>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleTestAutomation} 
                  disabled={sending}
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" />Test Now</>
                  )}
                </Button>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How Automation Works</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>The system runs automatically based on your schedule</li>
                        <li>Only students meeting the criteria will receive reminders</li>
                        <li>Reminders are sent via SMS to registered guardian phone numbers</li>
                        <li>All sent messages are logged for tracking and compliance</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
