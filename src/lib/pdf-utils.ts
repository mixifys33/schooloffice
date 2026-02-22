// PDF generation utilities using jsPDF and html2canvas
// Note: These libraries need to be installed: npm install jspdf html2canvas

/**
 * Generate PDF from HTML element
 */
export async function generatePDFFromElement(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape'
    format?: 'a4' | 'letter'
  }
): Promise<void> {
  try {
    // Dynamic import to avoid SSR issues
    const jsPDF = (await import('jspdf')).default
    const html2canvas = (await import('html2canvas')).default

    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    // Capture element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

/**
 * Generate PDF from HTML string
 */
export async function generatePDFFromHTML(
  html: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape'
    format?: 'a4' | 'letter'
  }
): Promise<void> {
  try {
    const jsPDF = (await import('jspdf')).default

    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    })

    // Create temporary container
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    document.body.appendChild(container)

    // Use html2canvas to capture
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    // Clean up
    document.body.removeChild(container)

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } catch (error) {
    console.error('Error generating PDF from HTML:', error)
    throw error
  }
}

/**
 * Check if PDF libraries are available
 */
export async function checkPDFLibraries(): Promise<boolean> {
  try {
    await import('jspdf')
    await import('html2canvas')
    return true
  } catch {
    return false
  }
}
