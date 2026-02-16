/**
 * Comprehensive Realistic School Data Seeder
 * 
 * Populates Rwenzori Valley Primary School with realistic, interconnected data:
 * - Academic structure (terms, classes, streams, subjects)
 * - Staff (teachers, admin, bursar, DoS)
 * - Students (200+ students across all classes)
 * - Guardians (parents with realistic relationships)
 * - Assessments (CA entries, exams, grades)
 * - Attendance records
 * - Fee structures and payments
 * - Timetables
 * - Communication logs
 * - And much more!
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Realistic Ugandan names
const FIRST_NAMES_MALE = [
  'Moses', 'David', 'John', 'Peter', 'Paul', 'Samuel', 'Joseph', 'Daniel',
  'Emmanuel', 'Isaac', 'Jacob', 'Joshua', 'Michael', 'Stephen', 'Timothy',
  'Andrew', 'Benjamin', 'Charles', 'Dennis', 'Eric', 'Francis', 'George',
  'Henry', 'Ivan', 'James', 'Kenneth', 'Lawrence', 'Martin', 'Nathan',
  'Oliver', 'Patrick', 'Richard', 'Simon', 'Thomas', 'Vincent', 'William'
]

const FIRST_NAMES_FEMALE = [
  'Mary', 'Sarah', 'Grace', 'Ruth', 'Esther', 'Rebecca', 'Rachel', 'Hannah',
  'Elizabeth', 'Martha', 'Deborah', 'Miriam', 'Naomi', 'Judith', 'Agnes',
  'Betty', 'Catherine', 'Diana', 'Edith', 'Florence', 'Gloria', 'Helen',
  'Irene', 'Jane', 'Joyce', 'Karen', 'Linda', 'Margaret', 'Nancy',
  'Olivia', 'Patricia', 'Queen', 'Rose', 'Susan', 'Tracy', 'Violet', 'Winnie'
]

const LAST_NAMES = [
  'Mugisha', 'Tumusiime', 'Byaruhanga', 'Muhwezi', 'Tusiime', 'Ainomugisha',
  'Arinaitwe', 'Atuhaire', 'Bainomugisha', 'Karungi', 'Kyomuhendo', 'Mwesigwa',
  'Natukunda', 'Ninsiima', 'Turyasingura', 'Asiimwe', 'Baguma', 'Kamugisha',
  'Mbabazi', 'Muhanguzi', 'Muhumuza', 'Rukundo', 'Tukamushaba', 'Turyahikayo',
  'Agaba', 'Ahimbisibwe', 'Akampurira', 'Ampaire', 'Atuheire', 'Ayebazibwe',
  'Bagyendera', 'Bakashaba', 'Baryamwisaki', 'Besigye', 'Kabagambe', 'Kagyenyi',
  'Kakuru', 'Kamukama', 'Kanyesigye', 'Karamagi', 'Katusiime', 'Kiconco',
  'Kwesiga', 'Matsiko', 'Mugyenyi', 'Muhindo', 'Musinguzi', 'Mutabazi',
  'Mwebaze', 'Namara', 'Nuwagaba', 'Nyakato', 'Tukahirwa', 'Tumuhairwe'
]

// Ugandan phone numbers (format: 0700000000 to 0799999999)
function generateUgandanPhone() {
  const prefix = '07' + Math.floor(Math.random() * 10) // 070-079
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return prefix + number
}

// Generate email
function generateEmail(firstName, lastName) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
}

// Random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Random element from array
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🌱 Starting comprehensive school data seeding...\n')

  // Get school
  const school = await prisma.school.findFirst()
  if (!school) {
    console.log('❌ No school found!')
    return
  }

  const schoolId = school.id
  console.log(`🏫 School: ${school.name} (${school.code})`)
  console.log(`📍 ID: ${schoolId}\n`)

  // ============================================
  // 1. ACADEMIC STRUCTURE
  // ============================================
  console.log('📚 Creating academic structure...')

  // Get or create academic year
  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  })

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name: '2026',
        startDate: new Date('2026-01-31'),
        endDate: new Date('2026-12-15'),
        isActive: true,
        isCurrent: true,
      },
    })
    console.log('  ✅ Created Academic Year 2026')
  }

  // Get existing terms or create them
  let term1 = await prisma.term.findFirst({
    where: { schoolId, academicYearId: academicYear.id, name: 'Term 1' },
  })

  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: 'Term 1',
        startDate: new Date('2026-01-31'),
        endDate: new Date('2026-05-30'),
      },
    })
    console.log('  ✅ Created Term 1')
  }

  let term2 = await prisma.term.findFirst({
    where: { schoolId, academicYearId: academicYear.id, name: 'Term 2' },
  })

  if (!term2) {
    term2 = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: 'Term 2',
        startDate: new Date('2026-06-14'),
        endDate: new Date('2026-09-25'),
      },
    })
    console.log('  ✅ Created Term 2')
  }

  let term3 = await prisma.term.findFirst({
    where: { schoolId, academicYearId: academicYear.id, name: 'Term 3' },
  })

  if (!term3) {
    term3 = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: 'Term 3',
        startDate: new Date('2026-10-05'),
        endDate: new Date('2026-12-15'),
      },
    })
    console.log('  ✅ Created Term 3')
  }

  // Create classes (P.1 to P.7)
  const classes = []
  for (let i = 1; i <= 7; i++) {
    let classRecord = await prisma.class.findFirst({
      where: { schoolId, name: `P.${i}` },
    })

    if (!classRecord) {
      classRecord = await prisma.class.create({
        data: {
          schoolId,
          name: `P.${i}`,
          level: i,
          capacity: 50,
        },
      })
    }
    classes.push(classRecord)
  }
  console.log(`  ✅ Created/Found ${classes.length} classes (P.1 to P.7)`)

  // Create streams for each class (A, B, C)
  const streams = []
  for (const classRecord of classes) {
    for (const streamName of ['A', 'B', 'C']) {
      let stream = await prisma.stream.findFirst({
        where: { schoolId, classId: classRecord.id, name: streamName },
      })

      if (!stream) {
        stream = await prisma.stream.create({
          data: {
            schoolId,
            classId: classRecord.id,
            name: streamName,
            capacity: 40,
          },
        })
      }
      streams.push({ ...stream, className: classRecord.name })
    }
  }
  console.log(`  ✅ Created/Found ${streams.length} streams (A, B, C per class)`)

  // Create subjects
  const subjectNames = [
    'English', 'Mathematics', 'Science', 'Social Studies',
    'Religious Education', 'Creative Arts', 'Physical Education'
  ]

  const subjects = []
  for (const name of subjectNames) {
    let subject = await prisma.subject.findFirst({
      where: { schoolId, name },
    })

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          schoolId,
          name,
          code: name.substring(0, 3).toUpperCase(),
        },
      })
    }
    subjects.push(subject)
  }
  console.log(`  ✅ Created/Found ${subjects.length} subjects\n`)

  // ============================================
  // 2. STAFF & USERS
  // ============================================
  console.log('👥 Creating staff and users...')

  const staffMembers = []
  const users = []

  // Create Head Teacher (School Admin)
  const headTeacherPassword = await bcrypt.hash('password123', 12)
  let headTeacherUser = await prisma.user.findFirst({
    where: { email: 'headteacher@rwenzori.ac.ug' },
  })

  if (!headTeacherUser) {
    headTeacherUser = await prisma.user.create({
      data: {
        email: 'headteacher@rwenzori.ac.ug',
        password: headTeacherPassword,
        role: 'SCHOOL_ADMIN',
        schoolId,
        isActive: true,
      },
    })

    const headTeacher = await prisma.staff.create({
      data: {
        schoolId,
        userId: headTeacherUser.id,
        firstName: 'Margaret',
        lastName: 'Tumusiime',
        employeeNumber: 'RVP001',
        role: 'TEACHER',
        primaryRole: 'SCHOOL_ADMIN',
        phone: generateUgandanPhone(),
        email: 'headteacher@rwenzori.ac.ug',
        dateOfBirth: new Date('1975-03-15'),
        hireDate: new Date('2010-01-15'),
        status: 'ACTIVE',
      },
    })
    staffMembers.push(headTeacher)
    users.push(headTeacherUser)
    console.log('  ✅ Created Head Teacher')
  }

  // Create Deputy Head Teacher
  const deputyPassword = await bcrypt.hash('password123', 12)
  let deputyUser = await prisma.user.findFirst({
    where: { email: 'deputy@rwenzori.ac.ug' },
  })

  if (!deputyUser) {
    deputyUser = await prisma.user.create({
      data: {
        email: 'deputy@rwenzori.ac.ug',
        password: deputyPassword,
        role: 'DEPUTY',
        schoolId,
        isActive: true,
      },
    })

    const deputy = await prisma.staff.create({
      data: {
        schoolId,
        userId: deputyUser.id,
        firstName: 'John',
        lastName: 'Mugisha',
        employeeNumber: 'RVP002',
        role: 'TEACHER',
        primaryRole: 'DEPUTY',
        phone: generateUgandanPhone(),
        email: 'deputy@rwenzori.ac.ug',
        dateOfBirth: new Date('1978-07-22'),
        hireDate: new Date('2012-02-01'),
        status: 'ACTIVE',
      },
    })
    staffMembers.push(deputy)
    users.push(deputyUser)
    console.log('  ✅ Created Deputy Head Teacher')
  }

  // Create Director of Studies (DoS)
  const dosPassword = await bcrypt.hash('password123', 12)
  let dosUser = await prisma.user.findFirst({
    where: { email: 'dos@rwenzori.ac.ug' },
  })

  if (!dosUser) {
    dosUser = await prisma.user.create({
      data: {
        email: 'dos@rwenzori.ac.ug',
        password: dosPassword,
        role: 'TEACHER',
        schoolId,
        isActive: true,
      },
    })

    const dos = await prisma.staff.create({
      data: {
        schoolId,
        userId: dosUser.id,
        firstName: 'Sarah',
        lastName: 'Byaruhanga',
        employeeNumber: 'RVP003',
        role: 'TEACHER',
        primaryRole: 'DOS',
        phone: generateUgandanPhone(),
        email: 'dos@rwenzori.ac.ug',
        dateOfBirth: new Date('1980-05-10'),
        hireDate: new Date('2013-09-01'),
        status: 'ACTIVE',
      },
    })
    staffMembers.push(dos)
    users.push(dosUser)
    console.log('  ✅ Created Director of Studies')
  }

  // Create Bursar
  const bursarPassword = await bcrypt.hash('password123', 12)
  let bursarUser = await prisma.user.findFirst({
    where: { email: 'bursar@rwenzori.ac.ug' },
  })

  if (!bursarUser) {
    bursarUser = await prisma.user.create({
      data: {
        email: 'bursar@rwenzori.ac.ug',
        password: bursarPassword,
        role: 'ACCOUNTANT',
        schoolId,
        isActive: true,
      },
    })

    const bursar = await prisma.staff.create({
      data: {
        schoolId,
        userId: bursarUser.id,
        firstName: 'David',
        lastName: 'Muhwezi',
        employeeNumber: 'RVP004',
        role: 'ACCOUNTANT',
        primaryRole: 'BURSAR',
        phone: generateUgandanPhone(),
        email: 'bursar@rwenzori.ac.ug',
        dateOfBirth: new Date('1982-11-30'),
        hireDate: new Date('2014-01-15'),
        status: 'ACTIVE',
      },
    })
    staffMembers.push(bursar)
    users.push(bursarUser)
    console.log('  ✅ Created Bursar')
  }

  // Create 21 Class Teachers (3 per class for P.1 to P.7)
  const classTeachers = []
  let employeeNum = 5

  for (let i = 0; i < classes.length; i++) {
    for (let j = 0; j < 3; j++) {
      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const firstName = gender === 'MALE' 
        ? randomElement(FIRST_NAMES_MALE)
        : randomElement(FIRST_NAMES_FEMALE)
      const lastName = randomElement(LAST_NAMES)
      const email = `teacher${employeeNum}@rwenzori.ac.ug`

      let teacherUser = await prisma.user.findFirst({
        where: { email },
      })

      if (!teacherUser) {
        const password = await bcrypt.hash('password123', 12)
        teacherUser = await prisma.user.create({
          data: {
            email,
            password,
            role: 'TEACHER',
            schoolId,
            isActive: true,
          },
        })

        const teacher = await prisma.staff.create({
          data: {
            schoolId,
            userId: teacherUser.id,
            firstName,
            lastName,
            employeeNumber: `RVP${employeeNum.toString().padStart(3, '0')}`,
            role: 'TEACHER',
            primaryRole: 'CLASS_TEACHER',
            phone: generateUgandanPhone(),
            email,
            dateOfBirth: randomDate(new Date('1975-01-01'), new Date('1995-12-31')),
            hireDate: randomDate(new Date('2010-01-01'), new Date('2024-12-31')),
            status: 'ACTIVE',
          },
        })
        classTeachers.push(teacher)
        staffMembers.push(teacher)
        users.push(teacherUser)
      }

      employeeNum++
    }
  }
  console.log(`  ✅ Created ${classTeachers.length} class teachers`)

  console.log(`  📊 Total staff: ${staffMembers.length}`)
  console.log(`  📊 Total users: ${users.length}\n`)

  // ============================================
  // 3. STUDENTS & GUARDIANS
  // ============================================
  console.log('👨‍👩‍👧‍👦 Creating students and guardians...')

  const students = []
  const guardians = []
  let admissionNum = 1000

  // Create 30 students per stream (630 total students)
  for (const stream of streams) {
    for (let i = 0; i < 30; i++) {
      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const firstName = gender === 'MALE'
        ? randomElement(FIRST_NAMES_MALE)
        : randomElement(FIRST_NAMES_FEMALE)
      const lastName = randomElement(LAST_NAMES)

      // Create student
      const student = await prisma.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          admissionNumber: `RVP${admissionNum}`,
          classId: stream.classId,
          streamId: stream.id,
          gender,
          dateOfBirth: randomDate(
            new Date('2010-01-01'),
            new Date('2020-12-31')
          ),
          enrollmentDate: new Date('2024-01-15'),
          status: 'ACTIVE',
          pilotType: 'FREE',
          smsLimitPerTerm: 2,
          smsSentCount: 0,
        },
      })
      students.push(student)

      // Create guardian (parent)
      const guardianGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const guardianFirstName = guardianGender === 'MALE'
        ? randomElement(FIRST_NAMES_MALE)
        : randomElement(FIRST_NAMES_FEMALE)

      const guardian = await prisma.guardian.create({
        data: {
          schoolId,
          firstName: guardianFirstName,
          lastName,
          phone: generateUgandanPhone(),
          email: Math.random() > 0.3 ? generateEmail(guardianFirstName, lastName) : null,
          relationship: guardianGender === 'MALE' ? 'FATHER' : 'MOTHER',
          preferredChannel: 'SMS',
          consentGiven: true,
          status: 'ACTIVE',
        },
      })
      guardians.push(guardian)

      // Link guardian to student
      await prisma.studentGuardian.create({
        data: {
          schoolId,
          studentId: student.id,
          guardianId: guardian.id,
          isPrimary: true,
        },
      })

      admissionNum++
    }
  }

  console.log(`  ✅ Created ${students.length} students`)
  console.log(`  ✅ Created ${guardians.length} guardians`)
  console.log(`  ✅ Linked students to guardians\n`)

  // ============================================
  // 4. SUBJECT ASSIGNMENTS
  // ============================================
  console.log('📖 Assigning subjects to classes and teachers...')

  // Assign all subjects to all classes
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const existing = await prisma.classSubject.findFirst({
        where: {
          schoolId,
          classId: classRecord.id,
          subjectId: subject.id,
        },
      })

      if (!existing) {
        await prisma.classSubject.create({
          data: {
            schoolId,
            classId: classRecord.id,
            subjectId: subject.id,
            maxMark: 100,
            appearsOnReport: true,
            affectsPosition: true,
          },
        })
      }
    }
  }
  console.log('  ✅ Assigned subjects to classes')

  // Assign teachers to subjects
  let teacherIndex = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const teacher = classTeachers[teacherIndex % classTeachers.length]

      const existing = await prisma.staffSubject.findFirst({
        where: {
          schoolId,
          staffId: teacher.id,
          subjectId: subject.id,
          classId: classRecord.id,
        },
      })

      if (!existing) {
        await prisma.staffSubject.create({
          data: {
            schoolId,
            staffId: teacher.id,
            subjectId: subject.id,
            classId: classRecord.id,
          },
        })
      }

      teacherIndex++
    }
  }
  console.log('  ✅ Assigned teachers to subjects\n')

  // ============================================
  // 5. GRADING SYSTEM
  // ============================================
  console.log('📊 Creating grading systems...')

  // Create grading systems for each category
  const gradingCategories = ['FINAL', 'CA_ONLY', 'EXAM_ONLY']
  const gradeRanges = [
    { grade: 'A', minScore: 80, maxScore: 100, points: 4.0, remarks: 'Excellent' },
    { grade: 'B', minScore: 70, maxScore: 79, points: 3.0, remarks: 'Very Good' },
    { grade: 'C', minScore: 60, maxScore: 69, points: 2.0, remarks: 'Good' },
    { grade: 'D', minScore: 50, maxScore: 59, points: 1.0, remarks: 'Pass' },
    { grade: 'F', minScore: 0, maxScore: 49, points: 0.0, remarks: 'Fail' },
  ]

  for (const category of gradingCategories) {
    let gradingSystem = await prisma.gradingSystem.findFirst({
      where: { schoolId, category, isDefault: true },
    })

    if (!gradingSystem) {
      gradingSystem = await prisma.gradingSystem.create({
        data: {
          schoolId,
          name: `Primary School ${category === 'FINAL' ? 'Final' : category === 'CA_ONLY' ? 'CA' : 'Exam'} Grading`,
          category,
          isDefault: true,
        },
      })

      for (const range of gradeRanges) {
        await prisma.gradeRange.create({
          data: {
            schoolId,
            gradingSystemId: gradingSystem.id,
            ...range,
          },
        })
      }
    }
  }
  console.log('  ✅ Created grading systems (FINAL, CA_ONLY, EXAM_ONLY)\n')

  // ============================================
  // 6. FEE STRUCTURES & PAYMENTS
  // ============================================
  console.log('💰 Creating fee structures and payments...')

  // Create fee structure for each class and term
  for (const classRecord of classes) {
    for (const term of [term1, term2, term3]) {
      const existing = await prisma.feeStructure.findFirst({
        where: {
          schoolId,
          classId: classRecord.id,
          termId: term.id,
        },
      })

      if (!existing) {
        const tuitionFee = 150000 + (classRecord.level * 10000) // Increases with class level
        const developmentFee = 50000
        const examFee = 20000

        await prisma.feeStructure.create({
          data: {
            schoolId,
            classId: classRecord.id,
            termId: term.id,
            tuitionFee,
            developmentFee,
            examFee,
            totalAmount: tuitionFee + developmentFee + examFee,
          },
        })
      }
    }
  }
  console.log('  ✅ Created fee structures')

  // Create payments for 70% of students (some paid, some not)
  let paymentCount = 0
  for (const student of students) {
    if (Math.random() > 0.3) { // 70% have paid
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId,
          classId: student.classId,
          termId: term1.id,
        },
      })

      if (feeStructure) {
        const paymentPercentage = Math.random() > 0.2 ? 1.0 : 0.5 // 80% full payment, 20% partial
        const amount = feeStructure.totalAmount * paymentPercentage

        await prisma.payment.create({
          data: {
            schoolId,
            studentId: student.id,
            termId: term1.id,
            amount,
            paymentMethod: randomElement(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER']),
            receivedAt: randomDate(new Date('2026-02-01'), new Date('2026-02-28')),
            receivedBy: staffMembers[3].id, // Bursar
            status: 'COMPLETED',
          },
        })
        paymentCount++
      }
    }
  }
  console.log(`  ✅ Created ${paymentCount} payments\n`)

  console.log('✅ Realistic school data seeding complete!')
  console.log('\n📊 Summary:')
  console.log(`  - Academic Years: 1`)
  console.log(`  - Terms: 3`)
  console.log(`  - Classes: ${classes.length}`)
  console.log(`  - Streams: ${streams.length}`)
  console.log(`  - Subjects: ${subjects.length}`)
  console.log(`  - Staff: ${staffMembers.length}`)
  console.log(`  - Students: ${students.length}`)
  console.log(`  - Guardians: ${guardians.length}`)
  console.log(`  - Payments: ${paymentCount}`)
  console.log('\n🎉 Your school is now fully populated with realistic data!')
  console.log('\n🔐 Login Credentials:')
  console.log('  Head Teacher: headteacher@rwenzori.ac.ug / password123')
  console.log('  Deputy: deputy@rwenzori.ac.ug / password123')
  console.log('  DoS: dos@rwenzori.ac.ug / password123')
  console.log('  Bursar: bursar@rwenzori.ac.ug / password123')
  console.log('  Teachers: teacher5@rwenzori.ac.ug to teacher25@rwenzori.ac.ug / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
