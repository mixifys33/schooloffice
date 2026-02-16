/**
 * Inspection Report Viewer Component
 * Displays inspection reports for curriculum compliance demonstration
 * Requirements: 32.2, 32.3, 32.7
 */
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download,
  Calendar,
  User,
  TrendingUp,
  Shield
} from 'lucide-react'

interface InspectionReportViewerProps {
  schoolId: string
  termId: string
  onGenerateReport: (type: string) => Promise<any>
}

interface ComplianceStatus {
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT'
  compliancePercentage: number
  checks: Array<{
    checkType: string
    status: 'PASS' | 'FAIL' | 'WARNING'
    description: string
    details?: string
    recommendations?: string[]
  }>
}

interface GradingMethodologyReport {
  reportType: string
  schoolId: string
  termId: string
  generatedAt: string
  generatedBy: string
  summary: {
    totalSubjects: number
    totalStudents: number
    compliancePercentage: number
  }
  complianceIssues: Array<{
    type: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
}

interface AuditTrailReport {
  reportType: string
  schoolId: string
  dateFrom: string
  dateTo: string
  generatedAt: string
  generatedBy: string
  summary: {
    totalAuditEntries: number
    integrityStatus: 'INTACT' | 'COMPROMISED'
  }
}

export default function InspectionReportViewer({ 
  schoolId, 
  termId, 
  onGenerateReport 
}: InspectionReportViewerProps) {
  const [activeTab, setActiveTab] = useState('compliance')
  const [loading, setLoading] = useState(false)
  const [complianceReport, setComplianceReport] = useState<ComplianceStatus | null>(null)
  const [gradingReport, setGradingReport] = useState<GradingMethodologyReport | null>(null)
  const [auditReport, setAuditReport] = useState<AuditTrailReport | null>(null)

  const handleGenerateReport = async (reportType: string) => {
    setLoading(true)
    try {
      const report = await onGenerateReport(reportType)
      
      switch (reportType) {
        case 'compliance':
          setComplianceReport(report)
          break
        case 'grading-methodology':
          setGradingReport(report)
          break
        case 'audit-trail':
          setAuditReport(report)
          break
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'COMPLIANT':
      case 'INTACT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAIL':
      case 'NON_COMPLIANT':
      case 'COMPROMISED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'WARNING':
      case 'PARTIALLY_COMPLIANT':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'COMPLIANT':
      case 'INTACT':
        return 'bg-green-100 text-green-800'
      case 'FAIL':
      case 'NON_COMPLIANT':
      case 'COMPROMISED':
        return 'bg-red-100 text-red-800'
      case 'WARNING':
      case 'PARTIALLY_COMPLIANT':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inspection Reports</h2>
          <p className="text-gray-600">
            Generate compliance and audit reports for curriculum inspection readiness
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Inspection Ready</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compliance">Compliance Verification</TabsTrigger>
          <TabsTrigger value="grading">Grading Methodology</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span>Compliance Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  Verify grading methodology compliance with curriculum requirements
                </p>
                <Button 
                  onClick={() => handleGenerateReport('compliance')}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {complianceReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(complianceReport.overallStatus)}
                        <span className="font-medium">Overall Status</span>
                      </div>
                      <Badge className={`mt-2 ${getStatusColor(complianceReport.overallStatus)}`}>
                        {complianceReport.overallStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Compliance Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {complianceReport.compliancePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">Total Checks</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-600 mt-2">
                        {complianceReport.checks.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Compliance Checks</h4>
                    {complianceReport.checks.map((check, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(check.status)}
                            <span className="font-medium">{check.checkType.replace('_', ' ')}</span>
                          </div>
                          <Badge className={getStatusColor(check.status)}>
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{check.description}</p>
                        {check.details && (
                          <p className="text-sm text-gray-500 mb-2">{check.details}</p>
                        )}
                        {check.recommendations && check.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                              {check.recommendations.map((rec, recIndex) => (
                                <li key={recIndex}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Grading Methodology Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  Comprehensive report on grading methodology compliance
                </p>
                <Button 
                  onClick={() => handleGenerateReport('grading-methodology')}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {gradingReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Total Subjects</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {gradingReport.summary.totalSubjects}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Total Students</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mt-2">
                        {gradingReport.summary.totalStudents}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Compliance</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        {gradingReport.summary.compliancePercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {gradingReport.complianceIssues.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Compliance Issues</h4>
                      {gradingReport.complianceIssues.map((issue, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{issue.type.replace('_', ' ')}</span>
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-gray-600">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Generated: {new Date(gradingReport.generatedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Audit Trail Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600">
                  Complete audit trail for marks management activities
                </p>
                <Button 
                  onClick={() => handleGenerateReport('audit-trail')}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>

              {auditReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Total Audit Entries</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        {auditReport.summary.totalAuditEntries}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(auditReport.summary.integrityStatus)}
                        <span className="font-medium">Integrity Status</span>
                      </div>
                      <Badge className={`mt-2 ${getStatusColor(auditReport.summary.integrityStatus)}`}>
                        {auditReport.summary.integrityStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Period: {new Date(auditReport.dateFrom).toLocaleDateString()} - {new Date(auditReport.dateTo).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Generated: {new Date(auditReport.generatedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(complianceReport || gradingReport || auditReport) && (
        <div className="flex justify-end">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      )}
    </div>
  )
}