/**
 * Seed Role-Permission Mappings
 * Requirements: 19.1, 19.6
 * 
 * This script seeds the RolePermission table with the defined role-permission mappings.
 * Run with: npx ts-node prisma/seed-permissions.ts
 */
import { PrismaClient, Role, PermissionType } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Feature names used in the permission system
 */
const FEATURES = {
  // Core features
  STUDENTS: 'students',
  STAFF: 'staff',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  STREAMS: 'streams',
  
  // Academic features
  ATTENDANCE: 'attendance',
  MARKS: 'marks',
  RESULTS: 'results',
  REPORT_CARDS: 'report_cards',
  EXAMS: 'exams',
  TIMETABLE: 'timetable',
  
  // Financial features
  FEES: 'fees',
  PAYMENTS: 'payments',
  FEE_STRUCTURES: 'fee_structures',
  
  // Communication features
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  SMS: 'sms',
  
  // Administrative features
  SCHOOL_SETTINGS: 'school_settings',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  REPORTS: 'reports',
  
  // Discipline
  DISCIPLINE: 'discipline',
  
  // Documents
  DOCUMENTS: 'documents',
  
  // Super Admin only
  SCHOOLS: 'schools',
  SYSTEM_CONFIG: 'system_config',
  LICENSING: 'licensing',
  BILLING: 'billing',
} as const

interface Permission {
  feature: string
  type: PermissionType
}

/**
 * Role-Permission Mapping
 * Requirement 19.1: Define explicit role-to-permission mappings for each role type
 * Requirement 19.6: Support view, create, edit, delete, approve, export permission types
 */
const ROLE_PERMISSION_MAP: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    { feature: FEATURES.SCHOOLS, type: PermissionType.VIEW },
    { feature: FEATURES.SCHOOLS, type: PermissionType.CREATE },
    { feature: FEATURES.SCHOOLS, type: PermissionType.EDIT },
    { feature: FEATURES.SCHOOLS, type: PermissionType.DELETE },
    { feature: FEATURES.SYSTEM_CONFIG, type: PermissionType.VIEW },
    { feature: FEATURES.SYSTEM_CONFIG, type: PermissionType.EDIT },
    { feature: FEATURES.LICENSING, type: PermissionType.VIEW },
    { feature: FEATURES.LICENSING, type: PermissionType.EDIT },
    { feature: FEATURES.BILLING, type: PermissionType.VIEW },
    { feature: FEATURES.BILLING, type: PermissionType.EDIT },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.VIEW },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.EXPORT },
    { feature: FEATURES.USERS, type: PermissionType.VIEW },
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
  ],

  [Role.SCHOOL_ADMIN]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STUDENTS, type: PermissionType.CREATE },
    { feature: FEATURES.STUDENTS, type: PermissionType.EDIT },
    { feature: FEATURES.STUDENTS, type: PermissionType.DELETE },
    { feature: FEATURES.STUDENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.STAFF, type: PermissionType.CREATE },
    { feature: FEATURES.STAFF, type: PermissionType.EDIT },
    { feature: FEATURES.STAFF, type: PermissionType.DELETE },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.CREATE },
    { feature: FEATURES.CLASSES, type: PermissionType.EDIT },
    { feature: FEATURES.CLASSES, type: PermissionType.DELETE },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.CREATE },
    { feature: FEATURES.SUBJECTS, type: PermissionType.EDIT },
    { feature: FEATURES.SUBJECTS, type: PermissionType.DELETE },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.CREATE },
    { feature: FEATURES.STREAMS, type: PermissionType.EDIT },
    { feature: FEATURES.STREAMS, type: PermissionType.DELETE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.CREATE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EDIT },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EXPORT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.CREATE },
    { feature: FEATURES.MARKS, type: PermissionType.EDIT },
    { feature: FEATURES.MARKS, type: PermissionType.DELETE },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.CREATE },
    { feature: FEATURES.RESULTS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.APPROVE },
    { feature: FEATURES.RESULTS, type: PermissionType.EXPORT },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.CREATE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.APPROVE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EXPORT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.EXAMS, type: PermissionType.CREATE },
    { feature: FEATURES.EXAMS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.DELETE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.CREATE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.DELETE },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.CREATE },
    { feature: FEATURES.FEES, type: PermissionType.EDIT },
    { feature: FEATURES.FEES, type: PermissionType.DELETE },
    { feature: FEATURES.FEES, type: PermissionType.EXPORT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.VIEW },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.CREATE },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.EDIT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.DELETE },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.CREATE },
    { feature: FEATURES.MESSAGES, type: PermissionType.DELETE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.DELETE },
    { feature: FEATURES.SMS, type: PermissionType.VIEW },
    { feature: FEATURES.SMS, type: PermissionType.CREATE },
    { feature: FEATURES.SCHOOL_SETTINGS, type: PermissionType.VIEW },
    { feature: FEATURES.SCHOOL_SETTINGS, type: PermissionType.EDIT },
    { feature: FEATURES.USERS, type: PermissionType.VIEW },
    { feature: FEATURES.USERS, type: PermissionType.CREATE },
    { feature: FEATURES.USERS, type: PermissionType.EDIT },
    { feature: FEATURES.USERS, type: PermissionType.DELETE },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.CREATE },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.EDIT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.DELETE },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.DELETE },
  ],

  [Role.DEPUTY]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STUDENTS, type: PermissionType.EDIT },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.EDIT },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.EDIT },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.EDIT },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EXPORT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.APPROVE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.EXAMS, type: PermissionType.CREATE },
    { feature: FEATURES.EXAMS, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.CREATE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.DELETE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.EDIT },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
  ],

  [Role.TEACHER]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.CREATE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EDIT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.CREATE },
    { feature: FEATURES.MARKS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
  ],

  [Role.ACCOUNTANT]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.CREATE },
    { feature: FEATURES.FEES, type: PermissionType.EDIT },
    { feature: FEATURES.FEES, type: PermissionType.EXPORT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.VIEW },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.CREATE },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.EDIT },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
  ],

  [Role.STUDENT]: [
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
  ],

  [Role.PARENT]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.CREATE },
  ],

  [Role.DOS]: [
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.APPROVE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EDIT },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.APPROVE },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.EXAMS, type: PermissionType.CREATE },
    { feature: FEATURES.EXAMS, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.CREATE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.DELETE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.APPROVE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.EDIT },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
  ],
}


/**
 * Seed the RolePermission table with all role-permission mappings
 */
async function seedPermissions() {
  console.log('Starting permission seeding...')

  // Clear existing permissions
  await prisma.rolePermission.deleteMany({})
  console.log('Cleared existing permissions')

  // Prepare all permission records
  const permissionRecords: { role: Role; feature: string; type: PermissionType }[] = []

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const permission of permissions) {
      permissionRecords.push({
        role: role as Role,
        feature: permission.feature,
        type: permission.type,
      })
    }
  }

  console.log(`Seeding ${permissionRecords.length} permission records...`)

  // Insert permissions using createMany without skipDuplicates
  const result = await prisma.rolePermission.createMany({
    data: permissionRecords,
  })

  console.log(`Successfully seeded ${result.count} permission records`)

  // Log summary by role
  for (const role of Object.values(Role)) {
    const count = permissionRecords.filter((p) => p.role === role).length
    console.log(`  ${role}: ${count} permissions`)
  }
}

/**
 * Verify the seeded permissions
 */
async function verifyPermissions() {
  console.log('\nVerifying seeded permissions...')

  for (const role of Object.values(Role)) {
    const count = await prisma.rolePermission.count({
      where: { role },
    })
    const expected = ROLE_PERMISSION_MAP[role]?.length || 0
    const status = count === expected ? '✓' : '✗'
    console.log(`  ${status} ${role}: ${count}/${expected} permissions`)
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await seedPermissions()
    await verifyPermissions()
    console.log('\nPermission seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding permissions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
