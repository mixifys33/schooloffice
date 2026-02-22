// Utility functions for exporting data to various formats

interface ExportData {
  [key: string]: string | number | boolean | null
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: ExportData[], headers?: string[]): string {
  if (data.length === 0) return ''

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0])
  
  // Create header row
  const headerRow = csvHeaders.join(',')
  
  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header]
      // Handle values that contain commas, quotes, or newlines
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  }).join('\n')
  
  return `${headerRow}\n${dataRows}`
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Download Excel file (using CSV format with .xlsx extension)
 */
export function downloadExcel(data: ExportData[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers)
  downloadCSV(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB')
}

/**
 * Trigger browser print dialog
 */
export function triggerPrint(): void {
  window.print()
}

/**
 * Generate print-friendly HTML
 */
export function generatePrintHTML(content: string, title: string, styles?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
          ${styles || ''}
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `
}

/**
 * Open print preview in new window
 */
export function openPrintPreview(html: string): void {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}
