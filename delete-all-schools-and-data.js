/**
 * Delete all schools and their related information from the database
 * WARNING: This will permanently delete all school data!
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function deleteAllSchoolsAndData() {
  console.log('🚨 DANGER: DELETING ALL SCHOOLS AND RELATED DATA')
  console.log('===============================================')
  console.log('⚠️  WARNING: This action is IRREVERSIBLE!')
  console.log('⚠️  All schools, users, students, teachers, and related data will be PERMANENTLY DELETED!')
  console.log('')

  if (!MONGODB_URI) {
    console.error('❌ DATABASE_URL not found in .env file')
    return
  }

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db()
    
    // Step 1: Get all schools first
    console.log('\n🔍 STEP 1: Finding all schools...')
    
    const schoolsCollection = db.collection('School')
    const schools = await schoolsCollection.find({}).toArray()
    
    console.log(`Found ${schools.length} schools to delete:`)
    schools.forEach((school, index) => {
      console.log(`   ${index + 1}. ${school.name || 'Unnamed School'} (ID: ${school._id})`)
    })

    if (schools.length === 0) {
      console.log('✅ No schools found. Database is already clean.')
      return
    }

    const schoolIds = schools.map(school => school._id)
    console.log(`\n📋 School IDs to delete: ${schoolIds.length}`)

    // Step 2: Delete all collections related to schools
    console.log('\n🗑️  STEP 2: Deleting all school-related data...')
    
    const collectionsToClean = [
      // Core school data
      { name: 'School', field: '_id', description: 'Schools' },
      
      // Users and staff
      { name: 'User', field: 'schoolId', description: 'Users' },
      { name: 'users', field: 'schoolId', description: 'Users (alt)' },
      { name: 'Staff', field: 'schoolId', description: 'Staff members' },
      { name: 'staff', field: 'schoolId', description: 'Staff (alt)' },
      { name: 'Teacher', field: 'schoolId', description: 'Teachers' },
      { name: 'teachers', field: 'schoolId', description: 'Teachers (alt)' },
      
      // Students and guardians
      { name: 'Student', field: 'schoolId', description: 'Students' },
      { name: 'students', field: 'schoolId', description: 'Students (alt)' },
      { name: 'Guardian', field: 'schoolId', description: 'Guardians' },
      { name: 'guardians', field: 'schoolId', description: 'Guardians (alt)' },
      { name: 'StudentGuardian', field: 'schoolId', description: 'Student-Guardian relationships' },
      
      // Academic structure
      { name: 'AcademicYear', field: 'schoolId', description: 'Academic years' },
      { name: 'Term', field: 'schoolId', description: 'Terms' },
      { name: 'Class', field: 'schoolId', description: 'Classes' },
      { name: 'classes', field: 'schoolId', description: 'Classes (alt)' },
      { name: 'Subject', field: 'schoolId', description: 'Subjects' },
      { name: 'subjects', field: 'schoolId', description: 'Subjects (alt)' },
      { name: 'Stream', field: 'schoolId', description: 'Streams' },
      { name: 'streams', field: 'schoolId', description: 'Streams (alt)' },
      
      // Curriculum and assessments
      { name: 'CurriculumSubject', field: 'schoolId', description: 'Curriculum subjects' },
      { name: 'Combination', field: 'schoolId', description: 'Subject combinations' },
      { name: 'CombinationSubject', field: 'schoolId', description: 'Combination subjects' },
      { name: 'Exam', field: 'schoolId', description: 'Exams' },
      { name: 'exams', field: 'schoolId', description: 'Exams (alt)' },
      { name: 'Result', field: 'schoolId', description: 'Results' },
      { name: 'results', field: 'schoolId', description: 'Results (alt)' },
      { name: 'Mark', field: 'schoolId', description: 'Marks' },
      { name: 'marks', field: 'schoolId', description: 'Marks (alt)' },
      { name: 'ContinuousAssessment', field: 'schoolId', description: 'Continuous assessments' },
      { name: 'CAResult', field: 'schoolId', description: 'CA results' },
      { name: 'AssessmentPlan', field: 'schoolId', description: 'Assessment plans' },
      
      // Financial data
      { name: 'Payment', field: 'schoolId', description: 'Payments' },
      { name: 'payments', field: 'schoolId', description: 'Payments (alt)' },
      { name: 'Invoice', field: 'schoolId', description: 'Invoices' },
      { name: 'invoices', field: 'schoolId', description: 'Invoices (alt)' },
      { name: 'Receipt', field: 'schoolId', description: 'Receipts' },
      { name: 'receipts', field: 'schoolId', description: 'Receipts (alt)' },
      { name: 'FeeStructure', field: 'schoolId', description: 'Fee structures' },
      { name: 'FeeItem', field: 'schoolId', description: 'Fee items' },
      { name: 'StudentAccount', field: 'schoolId', description: 'Student accounts' },
      { name: 'Expense', field: 'schoolId', description: 'Expenses' },
      
      // Attendance and timetables
      { name: 'Attendance', field: 'schoolId', description: 'Attendance records' },
      { name: 'attendance', field: 'schoolId', description: 'Attendance (alt)' },
      { name: 'TimetableEntry', field: 'schoolId', description: 'Timetable entries' },
      { name: 'TimetableConfiguration', field: 'schoolId', description: 'Timetable configurations' },
      { name: 'DoSTimetable', field: 'schoolId', description: 'DoS timetables' },
      { name: 'Room', field: 'schoolId', description: 'Rooms' },
      { name: 'rooms', field: 'schoolId', description: 'Rooms (alt)' },
      
      // Communication and messaging
      { name: 'Message', field: 'schoolId', description: 'Messages' },
      { name: 'messages', field: 'schoolId', description: 'Messages (alt)' },
      { name: 'Announcement', field: 'schoolId', description: 'Announcements' },
      { name: 'announcements', field: 'schoolId', description: 'Announcements (alt)' },
      { name: 'SmsLog', field: 'schoolId', description: 'SMS logs' },
      { name: 'CommunicationLog', field: 'schoolId', description: 'Communication logs' },
      { name: 'BulkMessageJob', field: 'schoolId', description: 'Bulk message jobs' },
      
      // Reports and documents
      { name: 'StudentReport', field: 'schoolId', description: 'Student reports' },
      { name: 'ReportCardTemplate', field: 'schoolId', description: 'Report card templates' },
      { name: 'PublishedReportCard', field: 'schoolId', description: 'Published report cards' },
      { name: 'TeacherDocument', field: 'schoolId', description: 'Teacher documents' },
      { name: 'StudentDocument', field: 'schoolId', description: 'Student documents' },
      { name: 'GuardianDocument', field: 'schoolId', description: 'Guardian documents' },
      { name: 'StaffDocument', field: 'schoolId', description: 'Staff documents' },
      
      // Settings and configurations
      { name: 'SchoolSettings', field: 'schoolId', description: 'School settings' },
      { name: 'FinanceSettings', field: 'schoolId', description: 'Finance settings' },
      { name: 'GradingSystem', field: 'schoolId', description: 'Grading systems' },
      { name: 'SchoolAsset', field: 'schoolId', description: 'School assets' },
      { name: 'SchoolFlag', field: 'schoolId', description: 'School flags' },
      
      // Audit and logs
      { name: 'AuditLog', field: 'schoolId', description: 'Audit logs' },
      { name: 'AuthAuditLog', field: 'schoolId', description: 'Auth audit logs' },
      { name: 'FinanceAuditLog', field: 'schoolId', description: 'Finance audit logs' },
      { name: 'GuardianAuditLog', field: 'schoolId', description: 'Guardian audit logs' },
      { name: 'LoginAttempt', field: 'schoolId', description: 'Login attempts' },
      
      // Subscriptions and billing
      { name: 'SchoolSubscription', field: 'schoolId', description: 'School subscriptions' },
      { name: 'CreditTransaction', field: 'schoolId', description: 'Credit transactions' },
      { name: 'SMSCreditAllocation', field: 'schoolId', description: 'SMS credit allocations' },
      
      // Other related data
      { name: 'Assignment', field: 'schoolId', description: 'Assignments' },
      { name: 'AssignmentSubmission', field: 'schoolId', description: 'Assignment submissions' },
      { name: 'DisciplineCase', field: 'schoolId', description: 'Discipline cases' },
      { name: 'StudentPenalty', field: 'schoolId', description: 'Student penalties' },
      { name: 'TeacherAlert', field: 'schoolId', description: 'Teacher alerts' },
      { name: 'SchoolAlert', field: 'schoolId', description: 'School alerts' },
    ]

    let totalDeleted = 0

    for (const collectionInfo of collectionsToClean) {
      try {
        const collection = db.collection(collectionInfo.name)
        
        let deleteResult
        if (collectionInfo.field === '_id') {
          // For schools collection, delete by _id
          deleteResult = await collection.deleteMany({
            _id: { $in: schoolIds }
          })
        } else {
          // For other collections, delete by schoolId
          deleteResult = await collection.deleteMany({
            [collectionInfo.field]: { $in: schoolIds }
          })
        }

        if (deleteResult.deletedCount > 0) {
          console.log(`   ✅ ${collectionInfo.description}: ${deleteResult.deletedCount} records deleted`)
          totalDeleted += deleteResult.deletedCount
        } else {
          console.log(`   ➖ ${collectionInfo.description}: No records found`)
        }
      } catch (error) {
        console.log(`   ⚠️  ${collectionInfo.description}: Error - ${error.message}`)
      }
    }

    // Step 3: Clean up any remaining references
    console.log('\n🧹 STEP 3: Cleaning up remaining references...')
    
    // Delete any records that might reference deleted schools
    const referencingCollections = [
      'PasswordReset',
      'OTPVerification',
      'SecureLink',
      'TwoFactorConfirmation',
      'SystemLock',
      'DataExportRequest',
      'SupportRequest'
    ]

    for (const collectionName of referencingCollections) {
      try {
        const collection = db.collection(collectionName)
        const deleteResult = await collection.deleteMany({
          $or: [
            { schoolId: { $in: schoolIds } },
            { school: { $in: schoolIds } }
          ]
        })

        if (deleteResult.deletedCount > 0) {
          console.log(`   ✅ ${collectionName}: ${deleteResult.deletedCount} references cleaned`)
          totalDeleted += deleteResult.deletedCount
        }
      } catch (error) {
        console.log(`   ⚠️  ${collectionName}: Error - ${error.message}`)
      }
    }

    // Step 4: Verification
    console.log('\n✅ STEP 4: Verification...')
    
    const remainingSchools = await schoolsCollection.find({}).toArray()
    console.log(`Remaining schools: ${remainingSchools.length}`)
    
    if (remainingSchools.length === 0) {
      console.log('✅ All schools successfully deleted!')
    } else {
      console.log('⚠️  Some schools may still exist:')
      remainingSchools.forEach(school => {
        console.log(`   - ${school.name || 'Unnamed'} (${school._id})`)
      })
    }

    console.log('\n🎉 DELETION COMPLETE!')
    console.log('====================')
    console.log(`📊 Total records deleted: ${totalDeleted}`)
    console.log(`🏫 Schools deleted: ${schools.length}`)
    console.log('✅ Database has been cleaned of all school data')
    console.log('')
    console.log('💡 Next steps:')
    console.log('   1. Your database is now clean')
    console.log('   2. You can create new schools from scratch')
    console.log('   3. All user accounts, students, teachers, etc. have been removed')
    console.log('   4. You may need to create a new admin account to access the system')

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

// Safety confirmation
console.log('⚠️  FINAL WARNING: This will delete ALL schools and related data!')
console.log('⚠️  This action cannot be undone!')
console.log('')
console.log('If you are sure you want to proceed, the script will run in 5 seconds...')
console.log('Press Ctrl+C to cancel now!')

setTimeout(() => {
  deleteAllSchoolsAndData().catch(console.error)
}, 5000)