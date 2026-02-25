'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FileText, Search, Book, HelpCircle, ArrowLeft } from 'lucide-react'

export default function DocumentationsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const docs = [
    {
      category: 'Getting Started',
      icon: Book,
      items: [
        { title: 'Quick Start Guide', file: 'QUICK-START.md', description: 'Get up and running quickly' },
        { title: 'Development Setup', file: 'DEVELOPMENT-SETUP.md', description: 'Set up your development environment' },
        { title: 'Start Here', file: 'START-HERE.md', description: 'New to SchoolOffice? Start here' },
      ]
    },
    {
      category: 'User Guides',
      icon: HelpCircle,
      items: [
        { title: 'Teacher Guide', file: 'TEACHER-SYSTEM-REVIEW.md', description: 'Complete teacher portal guide' },
        { title: 'DOS Guide', file: 'DOS-QUICK-REFERENCE.md', description: 'Director of Studies features' },
        { title: 'Bursar Guide', file: 'BURSAR_SECTION_SUMMARY.md', description: 'Fee management and payments' },
        { title: 'Marks Entry', file: 'MARKS-ENTRY-SYSTEM-COMPLETE.md', description: 'How to enter student marks' },
        { title: 'Attendance', file: 'ATTENDANCE-QUICK-START.md', description: 'Taking attendance' },
        { title: 'Reports', file: 'REPORT-SYSTEM-QUICK-SUMMARY.md', description: 'Generating report cards' },
      ]
    },
    {
      category: 'Features',
      icon: FileText,
      items: [
        { title: 'Timetable Generation', file: 'DOS-TIMETABLE-USER-GUIDE.md', description: 'Auto-generate timetables' },
        { title: 'Grading System', file: 'GRADING-SYSTEM-COMPLETE-SUMMARY.md', description: 'Understanding grading' },
        { title: 'Communication', file: 'BURSAR_COMMUNICATIONS_COMPLETE_GUIDE.md', description: 'SMS and email features' },
      ]
    },
  ]

  const filteredDocs = docs.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive guides and documentation for SchoolOffice.academy
          </p>
          
          {/* Search */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No documentation found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredDocs.map((category) => (
              <div key={category.category}>
                <div className="flex items-center mb-6">
                  <category.icon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {category.category}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.items.map((item) => (
                    <a
                      key={item.file}
                      href={`https://github.com/yourusername/schooloffice/blob/main/documentations/${item.file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
          <HelpCircle className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Need More Help?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Can't find what you're looking for? Our AI assistant can help!
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/contact-admin"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
