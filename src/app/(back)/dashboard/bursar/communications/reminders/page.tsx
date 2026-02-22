'use client'

import { useState, useEffect } from 'react'
import { Send, Users, DollarSign, AlertTriangle, CheckCircle, Loader2, Phone, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Student {
  id: string
  name: string
  className: string
  balance: number
  daysOverdue: number
  parentName: string
  parentPhone: string
  parentEmail: string
  selected: boolean
}

interface FeeStructure {
  id: string
  name: string
  className: string
  classId: string
  termName: string
  totalAmount: number
  studentCount: number
  selected: boolean
}

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState('reminders')
  
  // Reminders state
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  
  // Notifications state
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loadingFees, setLoadingFees] = useState(true)
  
  // Common state
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [classFilter, setClassFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [messageType, setMessageType] = useState<'sms'>('sms')
  const [subject, setSubject] = useState('Payment Reminder')
  const [customMessage, setCustomMessage] = useState('Dear {parentName}, this is a reminder that {studentName} has an outstanding fee balance of {balance}. Please settle this amount. Thank you.')

  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchDefaulters()
    } else {
      fetchFeeStructures()
    }
  }, [activeTab])

  const fetchDefaulters = async () => {
    try {
      setLoadingStudents(true)
      const response = await fetch('/api/bursar/defaulters')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setStudents(data.defaulters.map((s: {
        id: string
        name: string
        className: string
        balance: number
        daysOverdue: number
        contactInfo: {
          parentName: string
          parentPhone: string
          parentEmail: string
        }
      }) => ({
        id: s.id,
        name: s.name,
        className: s.className,
        balance: s.balance,
        daysOverdue: s.daysOverdue,
        parentName: s.contactInfo.parentName,
        parentPhone: s.contactInfo.parentPhone,
        parentEmail: s.contactInfo.parentEmail,
        selected: false
      })))
    } catch (error) {
      console.error('Failed to load students:', error)
      setError('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchFeeStructures = async () => {
    try {
      setLoadingFees(true)
      const response = await fetch('/api/bursar/fee-structures')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      
      // Get student counts for each class
      const structuresWithCounts = await Promise.all(
        data.feeStructures.map(async (fs: {
          id: string
          name: string
          class: { id: string; name: string }
          term: { name: string }
          totalAmount: number
        }) => {
          const studentsResponse = await fetch(`/api/classes/${fs.class.id}/students`)
          const studentsData = await studentsResponse.json()
          return {
            id: fs.id,
            name: fs.name,
            className: fs.class.name,
            classId: fs.class.id,
            termName: fs.term.name,
            totalAmount: fs.totalAmount,
            studentCount: studentsData.students?.length || 0,
            selected: false
          }
        })
      )
      
      setFeeStructures(structuresWithCounts)
    } catch (error) {
      console.error('Failed to load fee structures:', error)
      setError('Failed to load fee structures')
    } finally {
      setLoadingFees(false)
    }
  }

  const filteredStudents = students.filter(s => {
    const matchesClass = classFilter === 'all' || s.className === classFilter
    const matchesSearch = !searchTerm || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.parentName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesClass && matchesSearch
  })

  const filteredFees = feeStructures.filter(f => {
    const matchesClass = classFilter === 'all' || f.className === classFilter
    const matchesSearch = !searchTerm || f.className.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesClass && matchesSearch
  })

  const toggleStudent = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
  }

  const toggleFee = (id: string) => {
    setFeeStructures(feeStructures.map(f => f.id === id ? { ...f, selected: !f.selected } : f))
  }

  const toggleAllStudents = () => {
    const allSelected = filteredStudents.every(s => s.selected)
    setStudents(students.map(s => {
      const isInFiltered = filteredStudents.some(fs => fs.id === s.id)
      return isInFiltered ? { ...s, selected: !allSelected } : s
    }))
  }

  const toggleAllFees = () => {
    const allSelected = filteredFees.every(f => f.selected)
    setFeeStructures(feeStructures.map(f => {
      const isInFiltered = filteredFees.some(ff => ff.id === f.id)
      return isInFiltered ? { ...f, selected: !allSelected } : f
    }))
  }

  const handleSendReminders = async () => {
    const selected = students.filter(s => s.selected)
    if (selected.length === 0) {
      setError('Please select at least one student')
      return
    }
    if (!customMessage) {
      setError('Please enter a message')
      return
    }
    if (!confirm(`Send ${messageType} reminders to ${selected.length} students?`)) return

    try {
      setSending(true)
      setError(null)
      const response = await fetch('/api/bursar/communications/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: selected, messageType, message: customMessage })
      })
      if (!response.ok) throw new Error('Failed to send')
      const result = await response.json()
      setSuccess(`Successfully sent ${result.sent} reminders!`)
      setStudents(students.map(s => ({ ...s, selected: false })))
    } catch (error) {
      console.error('Failed to send reminders:', error)
      setError('Failed to send reminders')
    } finally {
      setSending(false)
    }
  }

  const handleSendNotifications = async () => {
    const selected = feeStructures.filter(f => f.selected)
    if (selected.length === 0) {
      setError('Please select at least one class')
      return
    }
    if (!customMessage) {
      setError('Please enter a message')
      return
    }

    const totalRecipients = selected.reduce((sum, f) => sum + f.studentCount, 0)
    if (!confirm(`Send ${messageType} notifications to ${totalRecipients} parents across ${selected.length} classes?`)) return

    try {
      setSending(true)
      setError(null)
      const response = await fetch('/api/bursar/communications/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeStructureIds: selected.map(f => f.id),
          messageType,
          subject,
          message: customMessage
        })
      })
      if (!response.ok) throw new Error('Failed to send')
      const result = await response.json()
      setSuccess(`Successfully sent ${result.sent} notifications!`)
      setFeeStructures(feeStructures.map(f => ({ ...f, selected: false })))
    } catch (error) {
      console.error('Failed to send notifications:', error)
      setError('Failed to send notifications')
    } finally {
      setSending(false)
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { 
    style: 'currency', 
    currency: 'UGX', 
    minimumFractionDigits: 0 
  }).format(amount)

  const selectedStudentCount = students.filter(s => s.selected).length
  const totalBalance = students.filter(s => s.selected).reduce((sum, s) => sum + s.balance, 0)
  const selectedFeeCount = feeStructures.filter(f => f.selected).length
  const totalRecipients = feeStructures.filter(f => f.selected).reduce((sum, f) => sum + f.studentCount, 0)
  
  const uniqueClasses = Array.from(new Set([
    ...students.map(s => s.className),
    ...feeStructures.map(f => f.className)
  ]))

  const loading = activeTab === 'reminders' ? loadingStudents : loadingFees

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Fee Communications</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Communications</h1>
        <p className="text-gray-600">Send payment reminders and fee notifications</p>
      </div>

      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-900">{success}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-900">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reminders">Payment Reminders</TabsTrigger>
          <TabsTrigger value="notifications">Fee Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              title="Selected Students" 
              value={String(selectedStudentCount)} 
              subtitle={`of ${filteredStudents.length}`} 
              color="blue" 
              icon={<Users className="h-6 w-6" />} 
            />
            <StatCard 
              title="Total Balance" 
              value={formatCurrency(totalBalance)} 
              subtitle="Selected" 
              color="red" 
              icon={<DollarSign className="h-6 w-6" />} 
            />
            <StatCard 
              title="Total Defaulters" 
              value={String(students.length)} 
              subtitle="All students" 
              color="yellow" 
              icon={<AlertTriangle className="h-6 w-6" />} 
            />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Search</Label>
                  <Input 
                    placeholder="Student or parent name..." 
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Compose Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message Type</Label>
                <Select value={messageType} onValueChange={(v: 'sms') => setMessageType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  All parents have phone numbers registered
                </p>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  placeholder="Enter your message..." 
                  value={customMessage} 
                  onChange={(e) => setCustomMessage(e.target.value)} 
                  rows={4} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {'{parentName}'}, {'{studentName}'}, {'{balance}'}, {'{daysOverdue}'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Students ({filteredStudents.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAllStudents}>
                    {filteredStudents.every(s => s.selected) ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button size="sm" onClick={handleSendReminders} disabled={sending || selectedStudentCount === 0}>
                    {sending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />Send to {selectedStudentCount}</>
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
                          checked={filteredStudents.length > 0 && filteredStudents.every(s => s.selected)} 
                          onCheckedChange={toggleAllStudents} 
                        />
                      </th>
                      <th className="py-2 px-4 text-left text-sm">Student</th>
                      <th className="py-2 px-4 text-left text-sm">Class</th>
                      <th className="py-2 px-4 text-left text-sm">Balance</th>
                      <th className="py-2 px-4 text-left text-sm">Days Overdue</th>
                      <th className="py-2 px-4 text-left text-sm">Parent Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-b">
                        <td className="py-3 px-4">
                          <Checkbox 
                            checked={student.selected} 
                            onCheckedChange={() => toggleStudent(student.id)} 
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">{student.name}</td>
                        <td className="py-3 px-4 text-sm">{student.className}</td>
                        <td className="py-3 px-4 font-medium text-red-600">
                          {formatCurrency(student.balance)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={student.daysOverdue > 30 ? "destructive" : "default"}>
                            {student.daysOverdue} days
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs">
                            <div>{student.parentName}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {student.parentPhone}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              title="Selected Classes" 
              value={String(selectedFeeCount)} 
              subtitle={`of ${filteredFees.length}`} 
              color="blue" 
              icon={<Users className="h-6 w-6" />} 
            />
            <StatCard 
              title="Total Recipients" 
              value={String(totalRecipients)} 
              subtitle="Parents to notify" 
              color="green" 
              icon={<Bell className="h-6 w-6" />} 
            />
            <StatCard 
              title="Fee Structures" 
              value={String(feeStructures.length)} 
              subtitle="Available" 
              color="purple" 
              icon={<DollarSign className="h-6 w-6" />} 
            />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Search</Label>
                  <Input 
                    placeholder="Class name..." 
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Compose Notification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Message Type</Label>
                  <Select value={messageType} onValueChange={(v: 'sms') => setMessageType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    All parents have phone numbers registered
                  </p>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  value={customMessage} 
                  onChange={(e) => setCustomMessage(e.target.value)} 
                  rows={5} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {'{termName}'}, {'{className}'}, {'{amount}'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Select Classes ({filteredFees.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAllFees}>
                    {filteredFees.every(f => f.selected) ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button size="sm" onClick={handleSendNotifications} disabled={sending || selectedFeeCount === 0}>
                    {sending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />Send to {totalRecipients}</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredFees.map(fee => (
                  <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={fee.selected} 
                        onCheckedChange={() => toggleFee(fee.id)} 
                      />
                      <div>
                        <div className="font-medium">{fee.className}</div>
                        <div className="text-sm text-gray-600">
                          {fee.termName} • {fee.studentCount} students
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{formatCurrency(fee.totalAmount)}</div>
                      <div className="text-xs text-gray-500">Total Fees</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
