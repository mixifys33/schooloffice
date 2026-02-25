/**
 * Server-side Documentation Reader
 * Reads actual documentation files from the documentations/ folder
 * This file can only be imported in server-side code (API routes)
 */

import fs from 'fs'
import path from 'path'

export interface DocumentFile {
  name: string
  content: string
  category: string
}

/**
 * Read all documentation files from the documentations/ folder
 */
export function readDocumentationFiles(): DocumentFile[] {
  const docs: DocumentFile[] = []
  const docsPath = path.join(process.cwd(), 'documentations')

  try {
    if (!fs.existsSync(docsPath)) {
      console.warn('Documentation folder not found')
      return []
    }

    const files = fs.readdirSync(docsPath)
    
    for (const file of files) {
      // Only read markdown files
      if (!file.endsWith('.md')) continue
      
      const filePath = path.join(docsPath, file)
      const stats = fs.statSync(filePath)
      
      // Skip if it's a directory or too large (>500KB)
      if (stats.isDirectory() || stats.size > 500000) continue
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const category = categorizeDocument(file, content)
        
        docs.push({
          name: file,
          content: content.slice(0, 5000), // Limit to first 5000 chars
          category,
        })
      } catch (err) {
        console.error(`Error reading ${file}:`, err)
      }
    }
  } catch (error) {
    console.error('Error reading documentation folder:', error)
  }

  return docs
}

/**
 * Categorize document based on filename and content
 */
function categorizeDocument(filename: string, content: string): string {
  const lower = filename.toLowerCase()
  const contentLower = content.toLowerCase()

  if (lower.includes('quick-start') || lower.includes('start-here') || lower.includes('readme')) {
    return 'quickstart'
  }
  if (lower.includes('bursar') || contentLower.includes('fee') || contentLower.includes('payment')) {
    return 'bursar'
  }
  if (lower.includes('dos') || contentLower.includes('director of studies')) {
    return 'dos'
  }
  if (lower.includes('teacher') || lower.includes('marks') || lower.includes('ca-')) {
    return 'teacher'
  }
  if (lower.includes('attendance')) {
    return 'attendance'
  }
  if (lower.includes('timetable')) {
    return 'timetable'
  }
  if (lower.includes('report')) {
    return 'reports'
  }
  if (lower.includes('auth') || lower.includes('login') || lower.includes('forgot-password')) {
    return 'authentication'
  }
  if (lower.includes('fix') || lower.includes('error') || lower.includes('troubleshoot')) {
    return 'troubleshooting'
  }
  if (lower.includes('api') || lower.includes('implementation')) {
    return 'technical'
  }
  
  return 'general'
}

/**
 * Search documentation for relevant content
 */
export function searchDocumentation(query: string, docs: DocumentFile[]): string {
  const queryLower = query.toLowerCase()
  const keywords = queryLower.split(' ').filter(w => w.length > 3)
  
  const scored = docs.map(doc => {
    let score = 0
    const docLower = doc.content.toLowerCase()
    const nameLower = doc.name.toLowerCase()
    
    // Score based on keyword matches
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) score += 10
      const matches = (docLower.match(new RegExp(keyword, 'g')) || []).length
      score += matches
    }
    
    return { doc, score }
  })
  
  // Get top 3 most relevant docs
  const topDocs = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.doc)
  
  if (topDocs.length === 0) return ''
  
  return topDocs
    .map(doc => `\n--- ${doc.name} ---\n${doc.content}`)
    .join('\n\n')
}

/**
 * Get relevant documentation based on context
 */
export function getRelevantDocsFromFiles(context: string): string {
  const lowerContext = context.toLowerCase()
  
  // Read real documentation files
  const docs = readDocumentationFiles()
  
  if (docs.length === 0) {
    return ''
  }
  
  // Filter by category based on context
  let relevantDocs: DocumentFile[] = []
  
  if (lowerContext.includes('login') || lowerContext.includes('sign in') || lowerContext.includes('auth')) {
    relevantDocs = docs.filter(d => d.category === 'authentication')
  } else if (lowerContext.includes('mark') || lowerContext.includes('grade') || lowerContext.includes('score')) {
    relevantDocs = docs.filter(d => d.category === 'teacher')
  } else if (lowerContext.includes('dos') || lowerContext.includes('approv')) {
    relevantDocs = docs.filter(d => d.category === 'dos')
  } else if (lowerContext.includes('fee') || lowerContext.includes('payment') || lowerContext.includes('bursar')) {
    relevantDocs = docs.filter(d => d.category === 'bursar')
  } else if (lowerContext.includes('attendance')) {
    relevantDocs = docs.filter(d => d.category === 'attendance')
  } else if (lowerContext.includes('timetable') || lowerContext.includes('schedule')) {
    relevantDocs = docs.filter(d => d.category === 'timetable')
  } else if (lowerContext.includes('report')) {
    relevantDocs = docs.filter(d => d.category === 'reports')
  } else if (lowerContext.includes('error') || lowerContext.includes('issue') || lowerContext.includes('problem')) {
    relevantDocs = docs.filter(d => d.category === 'troubleshooting')
  } else if (lowerContext.includes('quick') || lowerContext.includes('start') || lowerContext.includes('help')) {
    relevantDocs = docs.filter(d => d.category === 'quickstart')
  }
  
  // If no category match, search by keywords
  if (relevantDocs.length === 0) {
    return searchDocumentation(lowerContext, docs)
  }
  
  // Return top 2 docs from category
  return relevantDocs
    .slice(0, 2)
    .map(doc => `\n--- ${doc.name} ---\n${doc.content}`)
    .join('\n\n')
}
