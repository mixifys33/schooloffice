/**
 * Services Index - Optimized for build performance
 * Import only what you need instead of using barrel exports
 */   

// Core services - most commonly used
export { SchoolService } from './school.service'
export { AuthService } from './auth.service'
export { DashboardService } from './dashboard.service'

// Academic services
export { AcademicYearService } from './academic-year.service'
export { TermService } from './term.service'
export { ClassService } from './class.service'
export { SubjectService } from './subject.service'
export { TimetableService } from './timetable.service'

// User management
export { StudentService } from './student.service'
export { GuardianService } from './guardian.service'
export { StaffService } from './staff.service'
export { TeacherManagementService } from './teacher-management.service'

// Communication services
export { CommunicationService } from './communication.service'
export { EmailService } from './email.service'
export { SmsGatewayService } from './sms-gateway.service'
export { AnnouncementService } from './announcement.service'

// Finance services
export { FinanceService } from './finance.service'
export { FeeStructureService } from './fee-structure.service'
export { StudentAccountService } from './student-account.service'

// System services
export { AuditService } from './audit.service'
export { SecurityService } from './security.service'
export { PermissionService } from './permission.service'

// For other services, import directly from their files:
// import { SpecificService } from '@/services/specific.service'
