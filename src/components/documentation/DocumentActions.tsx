'use client'

import React, { useState } from 'react'
import { Printer, Download, Loader2 } from 'lucide-react'

interface DocumentActionsProps {
  filename: string
  content: string
}

export default function DocumentActions({ filename, content }: DocumentActionsProps) {
  const [downloading, setDownloading] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      const title = filename.replace('.md', '').replace(/-/g, ' ').replace(/_/g, ' ')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - (margin * 2)
      let yPosition = margin

      // Add title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin, yPosition)
      yPosition += 15

      // Add a line separator
      doc.setLineWidth(0.5)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 10

      // Process content
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      // Simple markdown to text conversion
      const lines = content
        .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n') // Headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
        .replace(/\*(.+?)\*/g, '$1') // Italic
        .replace(/`(.+?)`/g, '$1') // Inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
        .split('\n')

      for (const line of lines) {
        if (!line.trim()) {
          yPosition += 5
          continue
        }

        // Check if we need a new page
        if (yPosition > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }

        // Handle different line types
        if (line.startsWith('# ')) {
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          const text = line.replace(/^#\s+/, '')
          doc.text(text, margin, yPosition)
          yPosition += 10
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
        } else if (line.startsWith('## ')) {
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          const text = line.replace(/^##\s+/, '')
          doc.text(text, margin, yPosition)
          yPosition += 8
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
        } else if (line.startsWith('### ')) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          const text = line.replace(/^###\s+/, '')
          doc.text(text, margin, yPosition)
          yPosition += 7
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^[-*]\s+/, '• ')
          const splitText = doc.splitTextToSize(text, maxWidth - 10)
          doc.text(splitText, margin + 5, yPosition)
          yPosition += splitText.length * 6
        } else {
          const splitText = doc.splitTextToSize(line, maxWidth)
          doc.text(splitText, margin, yPosition)
          yPosition += splitText.length * 6
        }
      }

      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(128)
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      doc.save(`${filename.replace('.md', '')}.pdf`)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handlePrint}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Print document"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </button>
      
      <button
        onClick={handleDownloadMarkdown}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Download as Markdown"
      >
        <Download className="w-4 h-4 mr-2" />
        MD
      </button>

      <button
        onClick={handleDownloadPDF}
        disabled={downloading}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download as PDF"
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </>
        )}
      </button>
    </div>
  )
}
