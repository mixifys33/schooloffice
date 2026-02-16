'use client'

/**
 * DoS Reports - Generate Page
 * Validates classes and generates report cards
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Users,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

interface ValidationCheck {
  curriculumApproved: boolean
  caComplete: boolean
  examsComplete: boolean
  scoresApproved: boolean
  scoresLocked: boolean
}

interface ClassValidation {
  classId: string
  className: string
  studentCount: number
  isReady: boolean
  blockers: string[]
  validationChecks: ValidationCheck
}

interface Term {
  id: string
  name: string
}

interface Template {
  id: string
  name: string
  type: string
}

export default function GenerateReportsPage() {
  const { data: session } = useSession()
  const [terms, setTerms] = useState<Term[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [validationData, setValidationData] = useState<ClassValidation[]>([])
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingClassId, setGeneratingClassId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch terms on mount
  useEffect(() => {
    fetchTerms()
    fetchTemplates()
  }, [])

  // Fetch validation when term selected
  useEffect(() => {
    if (selectedTerm) {
      fetchValidation()
    }
  }, [selectedTerm])

  const fetchTerms = async () => {
    try {
      const res = await fetch('/api/settings/terms')
      if (res.ok) {
        const data = await res.json()
        setTerms(data.terms || [])
        // Auto-select current term
        const currentTerm = data.terms?.find((t: Term) => t.isCurrent)
        if (currentTerm) setSelectedTerm(currentTerm.id)
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/dos/reports/templates?isActive=true')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
        // Auto-select default template
        const defaultTemplate = data.templates?.find((t: Template) => t.isDefault)
        if (defaultTemplate) setSelectedTemplate(defaultTemplate.id)
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const fetchValidation = async () => {
    if (!selectedTerm) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/dos/reports/generate/validation?termId=${selectedTerm}`)
      if (res.ok) {
        const data = await res.json()
        setValidationData(data.classes || [])
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to fetch validation status')
      }
    } catch (err) {
      setError('Failed to fetch validation status')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (ready: boolean) => {
    const classesToSelect = validationData
      .filter(c => c.isReady === ready)
      .map(c => c.classId)
    setSelectedClasses(new Set(classesToSelect))
  }

  const handleToggleClass = (classId: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(classId)) {
      newSelected.delete(classId)
    } else {
      newSelected.add(classId)
    }
    setSelectedClasses(newSelected)
  }

  const handleGenerate = async () => {
    if (selectedClasses.size === 0) {
      setError('Please select at least one class')
      return
    }

    if (!selectedTemplate) {
      setError('Please select a template')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      const res = await fetch('/api/dos/reports/generate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: Array.from(selectedClasses),
          termId: selectedTerm,
          templateId: selectedTemplate,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Generated ${data.totalSuccess} reports successfully!`)
        setSelectedClasses(new Set())
        // Refresh validation
        await fetchValidation()
      } else {
        setError(data.error || 'Failed to generate reports')
      }
    } catch (err) {
      setError('Failed to generate reports')
    } finally {
      setGenerating(false)
      setProgress(100)
    }
  }

  const handleGenerateSingleClass = async (classId: string) => {
    if (!selectedTemplate) {
      setError('Please select a template first')
      return
    }

    if (!selectedTerm) {
      setError('Please select a term first')
      return
    }

    setGeneratingClassId(classId)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/dos/reports/generate/class/${classId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termId: selectedTerm,
          templateId: selectedTemplate,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Generated ${data.successCount} reports for class successfully!`)
        // Refresh validation
        await fetchValidation()
      } else {
        if (data.blockers) {
          setError(`Cannot generate reports: ${data.blockers.join(', ')}`)
        } else {
          setError(data.error || 'Failed to generate reports')
        }
      }
    } catch (err) {
      setError('Failed to generate reports')
    } finally {
      setGeneratingClassId(null)
    }
  }

  const readyClasses = validationData.filter(c => c.isReady)
  const notReadyClasses = validationData.filter(c => !c.isReady)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Generate Report Cards</h1>
        <p className="text-muted-foreground mt-2">
          Validate classes and generate report cards for students
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Select term and template for report generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={fetchValidation} disabled={!selectedTerm || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Validation
          </Button>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Template Selection Warning */}
      {!selectedTemplate && validationData.length > 0 && (
        <Alert className="border-blue-500 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-600">
            Please select a template above to enable report generation buttons
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      {validationData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{validationData.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{readyClasses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">Not Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{notReadyClasses.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ready Classes */}
      {readyClasses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-600">Ready for Generation</CardTitle>
                <CardDescription>{readyClasses.length} classes ready</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={selectedClasses.size === 0 || generating || !selectedTemplate}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Selected ({selectedClasses.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readyClasses.map(classData => (
                <div
                  key={classData.classId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedClasses.has(classData.classId)}
                      onCheckedChange={() => handleToggleClass(classData.classId)}
                    />
                    <div>
                      <div className="font-medium">{classData.className}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {classData.studentCount} students
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                    {!selectedTemplate ? (
                      <div className="relative group">
                        <Button
                          size="sm"
                          disabled
                          className="cursor-not-allowed"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Generate
                        </Button>
                        <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                          Select a template first
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateSingleClass(classData.classId)}
                        disabled={generatingClassId === classData.classId}
                      >
                        {generatingClassId === classData.classId ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Ready Classes */}
      {notReadyClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Not Ready</CardTitle>
            <CardDescription>{notReadyClasses.length} classes have blockers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notReadyClasses.map(classData => (
                <div
                  key={classData.classId}
                  className="p-4 border rounded-lg bg-orange-50/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{classData.className}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {classData.studentCount} students
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Ready
                      </Badge>
                      {!selectedTemplate ? (
                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="cursor-not-allowed border-orange-300 text-orange-700"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Generate Anyway
                          </Button>
                          <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            Select a template first
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateSingleClass(classData.classId)}
                          disabled={generatingClassId === classData.classId}
                          className="border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          {generatingClassId === classData.classId ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3 mr-1" />
                              Generate Anyway
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Blockers */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-orange-700">Blockers:</div>
                    <ul className="space-y-1">
                      {classData.blockers.map((blocker, idx) => (
                        <li key={idx} className="text-sm text-orange-600 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && validationData.length === 0 && selectedTerm && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
            <p className="text-muted-foreground">
              No classes found for the selected term
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
