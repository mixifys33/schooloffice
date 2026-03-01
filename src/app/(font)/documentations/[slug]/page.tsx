'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Breadcrumbs from '@/components/documentation/Breadcrumbs'
import TableOfContents from '@/components/documentation/TableOfContents'
import DocumentActions from '@/components/documentation/DocumentActions'

export default function DocumentationViewPage({ params }: { params: { slug: string } }) {
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const fname = `${params.slug}.md`
        const response = await fetch(`/api/documentation?file=${fname}`)
        
        if (!response.ok) {
          throw new Error('Document not found')
        }

        const data = await response.json()
        setContent(data.content)
        setFilename(data.filename)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [params.slug])

  // Add IDs to headings for TOC navigation
  useEffect(() => {
    if (!content) return

    const timer = setTimeout(() => {
      const headings = document.querySelectorAll('article h1, article h2, article h3, article h4, article h5, article h6')
      headings.forEach((heading, index) => {
        heading.id = `heading-${index}`
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [content])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Breadcrumbs items={[
            { label: 'Documentation', href: '/documentations' },
            { label: 'Error' }
          ]} />
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const documentTitle = params.slug.replace(/-/g, ' ')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[
          { label: 'Documentation', href: '/documentations' },
          { label: documentTitle }
        ]} />

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {documentTitle}
          </h1>
          <DocumentActions filename={filename} content={content} />
        </div>

        <div className="flex gap-8">
          {/* Main Content */}
          <article className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="prose prose-blue dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </article>

          {/* Table of Contents - Hidden on mobile */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <TableOfContents content={content} />
          </aside>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between print:hidden">
          <Link
            href="/documentations"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documentation
          </Link>
          
          <Link
            href="/documentations/browse"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Browse All Docs
          </Link>
        </div>
      </div>
    </div>
  )
}
