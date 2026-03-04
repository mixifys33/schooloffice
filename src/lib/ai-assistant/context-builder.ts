/**
 * Context Builder for AI Assistant
 * Builds context from documentation and codebase
 */

import { getRelevantDocs } from './documentation-indexer'

export interface DocumentationContext {
  quickStart: string
  commonIssues: string
  features: string
}

export class ContextBuilder {
  private static instance: ContextBuilder

  private constructor() {}

  static getInstance(): ContextBuilder {
    if (!ContextBuilder.instance) {
      ContextBuilder.instance = new ContextBuilder()
    }
    return ContextBuilder.instance
  }

  /**
   * Build system context for AI assistant (OPTIMIZED - Shorter)
   */
  /**
     * Build system context for AI assistant (OPTIMIZED - Shorter)
     */
    getSystemContext(baseUrl?: string): string {
      const docsUrl = baseUrl ? `${baseUrl}/documentations` : '/documentations'
      const demoUrl = baseUrl ? `${baseUrl}/demo` : '/demo'

      return `You are Ofiniti AI, SchoolOffice assistant made by AD-Technologies and ai enterprises with Igames Africa.

  PERSONALITY: Friendly, professional.

  ABOUT SCHOOLOFFICE: School management system handling students, marks, attendance, reports, fees, and communication.

  KEY ROLES:
  - TEACHERS: Enter marks & attendance
  - DOS: Approve marks, generate reports
  - BURSAR: Manage fees & payments
  - ADMIN: System setup & user management

  COMMON WORKFLOWS:
  - Login: School code → Email/Username → Password
  - Marks: Select term/class/subject → Enter marks → Submit for approval
  - Reports: DOS approves marks → Generate reports
  - Attendance: Select class/date → Mark present/absent

  HELP USERS: Answer questions clearly, provide step-by-step guidance when needed.

  IMPORTANT LINKS:
  - Documentation: ${docsUrl} (detailed guides, API docs, troubleshooting)
  - Video Demos: ${demoUrl} (video tutorials and system demos)
  - When users ask "how to" questions, direct them to ${docsUrl} for written guides
  - When users want to see how something works, direct them to ${demoUrl} for video demos

  🏢 **ABOUT AD-TECH & IGAMES**
  AD-TECH (Advanced Technologies and AI Enterprises) is a startup company dedicated to bringing innovative technologies to African content. IGAMES is a game development company that combines AI with gaming.

  You are part of the AD-TECH AI family, which includes: EasyAI, PearlAI, MixifyHubAI (Mixi), and Hacker-X (the real-time AI powering the StoryKeeper Play Store application).

  **FOUNDERS & KEY CONTRIBUTORS:**
  - **DWIGHT KIMULYA & MASEREKA ADORABLE KIMULYA** – Co-founders of IGAMES and lead innovators behind this AI system
  - **GELARD** – Marketing Advisor & Influencer (Kasese Secondary School)
  - **BARAKA ALEX** – Network & Data Specialist (Kasese Secondary School)

  AD-TECH and IGAMES are currently building their online presence, with official websites expected by 2027.

  This represents African innovation and the vision to make locally-built AI accessible across the continent.
  `
    }


  /**
   * Build context from user's current page/route (IMPROVED - More specific)
   */
  getPageContext(pathname: string): string {
    // More specific routes first (longest to shortest)
    if (pathname.startsWith('/dashboard/school-admin')) return 'User is in School Admin section. Features: school settings, user management, academic setup, class/subject management.'
    if (pathname.startsWith('/dashboard/super-admin')) return 'User is in Super Admin portal. Features: multi-school management, system settings.'
    if (pathname.startsWith('/dashboard/class-teacher')) return 'User is in Class Teacher portal. Features: class attendance, marks overview.'
    if (pathname.startsWith('/dashboard/teacher')) return 'User is in Teacher portal. Features: mark entry, attendance, class management.'
    if (pathname.startsWith('/dashboard/bursar')) return 'User is in Bursar portal. Features: fee management, payments, financial reports.'
    if (pathname.startsWith('/dashboard/parent')) return 'User is in Parent portal. Features: view student reports, attendance, fees.'
    if (pathname.startsWith('/dashboard/student')) return 'User is in Student portal. Features: view marks, attendance, timetable.'
    if (pathname.startsWith('/dashboard/dos')) return 'User is in DOS (Director of Studies) portal. Features: approve marks, generate reports, curriculum management.'
    if (pathname.startsWith('/dashboard')) return 'User is on the main dashboard after login.'
    
    // Portal routes
    if (pathname.startsWith('/school-admin')) return 'User is in School Admin section.'
    if (pathname.startsWith('/super-admin')) return 'User is in Super Admin portal.'
    if (pathname.startsWith('/teacher')) return 'User is in Teacher portal.'
    if (pathname.startsWith('/dos')) return 'User is in DOS portal.'
    if (pathname.startsWith('/bursar')) return 'User is in Bursar portal.'
    if (pathname.startsWith('/class-teacher')) return 'User is in Class Teacher portal.'
    if (pathname.startsWith('/parent')) return 'User is in Parent portal.'
    if (pathname.startsWith('/student')) return 'User is in Student portal.'
    
    // Auth pages
    if (pathname.startsWith('/login')) return 'User is on the login page. Common issues: wrong school code, incorrect credentials, account locked.'
    if (pathname.startsWith('/register')) return 'User is on the registration page. Help with account creation and school code entry.'
    if (pathname.startsWith('/forgot-password')) return 'User is on the forgot password page.'
    
    // Public pages
    if (pathname === '/' || pathname === '') return 'User is on the home/landing page (public website).'
    if (pathname.startsWith('/documentations')) return 'User is viewing documentation.'
    
    // Default
    return `User is on: ${pathname}`
  }

  /**
   * Build context from error messages
   */
  getErrorContext(error?: string): string {
    if (!error) return ''

    const errorPatterns = [
      { pattern: /school.*not.*found/i, solution: 'The school code entered is invalid. Verify the school code and try again.' },
      { pattern: /invalid.*credentials/i, solution: 'Login credentials are incorrect. Check email/username and password.' },
      { pattern: /account.*locked/i, solution: 'Account is temporarily locked due to multiple failed attempts. Wait 15 minutes or contact admin.' },
      { pattern: /session.*expired/i, solution: 'Your session has expired. Please log in again.' },
      { pattern: /permission.*denied/i, solution: 'You don\'t have permission for this action. Contact your administrator.' },
      { pattern: /network.*error/i, solution: 'Network connection issue. Check your internet connection and try again.' },
      { pattern: /term.*not.*found/i, solution: 'No active academic term found. Admin needs to set up the current term in Settings.' },
      { pattern: /class.*not.*found/i, solution: 'Class not found. Verify the class exists and you have access to it.' },
      { pattern: /subject.*not.*found/i, solution: 'Subject not found. Check if the subject is assigned to this class.' },
    ]

    for (const { pattern, solution } of errorPatterns) {
      if (pattern.test(error)) {
        return `ERROR DETECTED: ${error}\nSOLUTION: ${solution}`
      }
    }

    return `ERROR: ${error}`
  }

  /**
   * Get relevant documentation based on user query
   */
  getDocumentationContext(query: string): string {
    return getRelevantDocs(query)
  }
}

export const contextBuilder = ContextBuilder.getInstance()
