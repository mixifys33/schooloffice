'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Loader2, ArrowLeft, Calendar, FileCode } from 'lucide-react'
import Breadcrumbs from '@/components/documentation/Breadcrumbs'

interface DocFile {
  name: string
  title: string
}

export default function BrowseAllDocsPage() {
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch('/api/documentation')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch docs:', err)
        setLoading(false)
      })
  }, [])

  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group files by category (based on prefix)
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const prefix = file.name.split('-')[0] || 'Other'
    if (!acc[prefix]) {
      acc[prefix] = []
    }
    acc[prefix].push(file)
    return acc
  }, {} as Record<string, DocFile[]>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[
          { label: 'Documentation', href: '/documentations' },
          { label: 'Browse All' }
        ]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Browse All Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete list of all available documentation files
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search all documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredFiles.length} of {files.length} documents
            </div>

            {Object.keys(groupedFiles).length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">
                  No documentation found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedFiles).map(([category, categoryFiles]) => (
                  <div key={category}>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileCode className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      {category}
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryFiles.map((file) => (
                        <Link
                          key={file.name}
                          href={`/documentations/${file.name.replace('.md', '')}`}
                          className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                                {file.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <Link
            href="/documentations"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documentation Home
          </Link>
        </div>
      </div>
    </div>
  )
}
