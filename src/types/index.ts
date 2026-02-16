/**
 * SchoolOffice Type Definitions - Optimized for build performance
 * Import specific types instead of using wildcard exports
 */

// Core enums - most commonly used
export { 
  Role,   
  StudentStatus as UserStatus, 
  StaffStatus as SchoolStatus,
  RecipientType,
  TargetType,
  MessageChannel,
  MessageStatus,
  AttendanceStatus,
  PaymentMethod
} from './enums'

// Essential entity types
export type { 
  User, 
  School, 
  Student, 
  Guardian,
  Staff,
  Class,
  Subject,
  Term,
  CreateTermInput,
  AcademicYear,
  CreateAcademicYearInput,
  TargetingParams,
  TargetingValidation,
  Recipient,
  TargetCriteria,
  Result,
  Mark,
  GradeRange,
  PublishedReportCard,
  PublishReportCardInput,
  ReportCardAccessResult,
  CreateSchoolInput,
  UpdateSchoolInput,
  FeatureFlags
} from './entities'

// Teacher types
export type { Teacher } from './teacher'

// Core service interfaces
export type { 
  ITargetingService
} from './services'

// For other types, import directly from their files:
// import type { SpecificType } from '@/types/specific-file'
