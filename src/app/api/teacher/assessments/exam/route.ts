/**
 * Teacher Assessments Exam API Route
 * Uses the exam-entry API logic
 */

import { GET as examEntryGET, POST as examEntryPOST } from '@/app/api/teacher/marks/exam-entry/route'

export { examEntryGET as GET, examEntryPOST as POST }
