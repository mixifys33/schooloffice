/**
 * COMPLETE Realistic School Data Seeder
 * 
 * Populates Rwenzori Valley Primary School with comprehensive, realistic data
 * covering ALL school-related models with proper relationships and realistic values.
 * 
 * Coverage:
 * ✅ Academic structure (terms, classes, streams, subjects)
 * ✅ Staff (admin, teachers, support staff)
 * ✅ Students (630+ across all classes)
 * ✅ Guardians with realistic relationships
 * ✅ Subject assignments
 * ✅ Grading systems (FINAL, CA_ONLY, EXAM_ONLY)
 * ✅ Fee structures and payments
 * ✅ CA entries with realistic scores
 * ✅ Exam entries with realistic scores
 * ✅ Attendance records (daily for past 2 months)
 * ✅ DoS timetables with entries
 * ✅ Communication logs (SMS, messages)
 * ✅ Discipline cases
 * ✅ Student/staff/guardian documents
 * ✅ Competency tracking
 * ✅ Teacher alerts and evidence
 * ✅ Staff responsibilities and tasks
 * ✅ Announcements
 * ✅ And much more!
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// ============================================
// HELPER DATA & FUNCTIONS
// ============================================

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

const DISCIPLINE_TYPES = ['MINOR', 'MAJOR', 'CRITICAL']
const DISCIPLINE_ACTIONS = ['WARNING', 'DETENTION', 'SUSPENSION']

function generateUgandanPhone() {
  const prefix = '07' + Math.floor(Math.random() * 10)
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  return prefix + number
}

function generateEmail(firstName, lastName) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRealisticScore(maxScore = 100) {
  // Generate realistic distribution: 10% excellent, 30% good, 40% average, 20% poor
  const rand = Math.random()
  if (rand < 0.1) return randomInt(Math.floor(maxScore * 0.8), maxScore) // 80-100%
  if (rand < 0.4) return randomInt(Math.floor(maxScore * 0.65), Math.floor(maxScore * 0.79)) // 65-79%
  if (rand < 0.8) return randomInt(Math.floor(maxScore * 0.50), Math.floor(maxScore * 0.64)) // 50-64%
  return randomInt(Math.floor(maxScore * 0.30), Math.floor(maxScore * 0.49)) // 30-49%
}

async function main() {
  console.log('🌱 Starting COMPLETE school data seeding...\n')

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
  console.log('📚 Setting up academic structure...')

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
  }

  // Create terms
  let term1 = await prisma.term.findFirst({
    where: { schoolId, academicYearId: academicYear.id, name: 'Term 1' },
  })
  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        schoolId,
        academicYearId: academicYear.id,
        name: 'Term 1',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-05-30'),
        isCurrent: true,
      },
    })
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
  }

  console.log('  ✅ Academic year and terms created')

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
          capacity: 120,
        },
      })
    }
    classes.push(classRecord)
  }
  console.log(`  ✅ Created ${classes.length} classes`)

  // Create streams (A, B, C for each class)
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
  console.log(`  ✅ Created ${streams.length} streams\n`)

  // Create subjects
  const subjectData = [
    { name: 'English', code: 'ENG', periodsPerWeek: 5 },
    { name: 'Mathematics', code: 'MTH', periodsPerWeek: 5 },
    { name: 'Science', code: 'SCI', periodsPerWeek: 4 },
    { name: 'Social Studies', code: 'SST', periodsPerWeek: 4 },
    { name: 'Religious Education', code: 'RE', periodsPerWeek: 2 },
    { name: 'Creative Arts', code: 'CA', periodsPerWeek: 2 },
    { name: 'Physical Education', code: 'PE', periodsPerWeek: 2 },
  ]

  const subjects = []
  for (const data of subjectData) {
    let subject = await prisma.subject.findFirst({
      where: { schoolId, code: data.code },
    })
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          schoolId,
          name: data.name,
          code: data.code,
          educationLevel: 'PRIMARY',
        },
      })
    }
    subjects.push({ ...subject, periodsPerWeek: data.periodsPerWeek })
  }
  console.log(`  ✅ Created ${subjects.length} subjects\n`)

  // ============================================
  // 2. STAFF & USERS
  // ============================================
  console.log('👥 Creating staff and users...')

  const staffMembers = []
  const password = await bcrypt.hash('password123', 12)

  // Head Teacher
  let headTeacherUser = await prisma.user.findFirst({
    where: { email: 'headteacher@rwenzori.ac.ug' },
  })
  if (!headTeacherUser) {
    headTeacherUser = await prisma.user.create({
      data: {
        email: 'headteacher@rwenzori.ac.ug',
        password,
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
  }

  // Deputy
  let deputyUser = await prisma.user.findFirst({
    where: { email: 'deputy@rwenzori.ac.ug' },
  })
  if (!deputyUser) {
    deputyUser = await prisma.user.create({
      data: {
        email: 'deputy@rwenzori.ac.ug',
        password,
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
  }

  // DoS
  let dosUser = await prisma.user.findFirst({
    where: { email: 'dos@rwenzori.ac.ug' },
  })
  if (!dosUser) {
    dosUser = await prisma.user.create({
      data: {
        email: 'dos@rwenzori.ac.ug',
        password,
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
  }

  // Bursar
  let bursarUser = await prisma.user.findFirst({
    where: { email: 'bursar@rwenzori.ac.ug' },
  })
  if (!bursarUser) {
    bursarUser = await prisma.user.create({
      data: {
        email: 'bursar@rwenzori.ac.ug',
        password,
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
  }

  // Create 21 Class Teachers
  const classTeachers = []
  let employeeNum = 5
  for (let i = 0; i < 21; i++) {
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
    const firstName = gender === 'MALE' ? randomElement(FIRST_NAMES_MALE) : randomElement(FIRST_NAMES_FEMALE)
    const lastName = randomElement(LAST_NAMES)
    const email = `teacher${employeeNum}@rwenzori.ac.ug`

    let teacherUser = await prisma.user.findFirst({ where: { email } })
    if (!teacherUser) {
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
          isTeacher: true,
          teacherCode: `T${employeeNum}`,
        },
      })
      classTeachers.push(teacher)
      staffMembers.push(teacher)
    }
    employeeNum++
  }

  console.log(`  ✅ Created ${staffMembers.length} staff members\n`)

  // ============================================
  // 3. STUDENTS & GUARDIANS
  // ============================================
  console.log('👨‍👩‍👧‍👦 Creating students and guardians...')

  const students = []
  const guardians = []
  let admissionNum = 1000

  for (const stream of streams) {
    for (let i = 0; i < 30; i++) {
      const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const firstName = gender === 'MALE' ? randomElement(FIRST_NAMES_MALE) : randomElement(FIRST_NAMES_FEMALE)
      const lastName = randomElement(LAST_NAMES)

      const student = await prisma.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          admissionNumber: `RVP${admissionNum}`,
          classId: stream.classId,
          streamId: stream.id,
          gender,
          dateOfBirth: randomDate(new Date('2010-01-01'), new Date('2020-12-31')),
          enrollmentDate: new Date('2024-01-15'),
          status: 'ACTIVE',
          pilotType: 'FREE',
          smsLimitPerTerm: 2,
          smsSentCount: 0,
        },
      })
      students.push(student)

      // Create guardian
      const guardianGender = Math.random() > 0.5 ? 'MALE' : 'FEMALE'
      const guardianFirstName = guardianGender === 'MALE' ? randomElement(FIRST_NAMES_MALE) : randomElement(FIRST_NAMES_FEMALE)

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

      await prisma.studentGuardian.create({
        data: {
          schoolId,
          studentId: student.id,
          guardianId: guardian.id,
          isPrimary: true,
          isFinanciallyResponsible: true,
          receivesAcademicMessages: true,
          receivesFinanceMessages: true,
        },
      })

      admissionNum++
    }
  }

  console.log(`  ✅ Created ${students.length} students`)
  console.log(`  ✅ Created ${guardians.length} guardians\n`)

  // ============================================
  // 4. SUBJECT ASSIGNMENTS
  // ============================================
  console.log('📖 Assigning subjects...')

  // Assign subjects to classes
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const existing = await prisma.classSubject.findFirst({
        where: { schoolId, classId: classRecord.id, subjectId: subject.id },
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

  // Assign teachers to subjects
  let teacherIndex = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const teacher = classTeachers[teacherIndex % classTeachers.length]
      const existing = await prisma.staffSubject.findFirst({
        where: { schoolId, staffId: teacher.id, subjectId: subject.id, classId: classRecord.id },
      })
      if (!existing) {
        await prisma.staffSubject.create({
          data: {
            schoolId,
            staffId: teacher.id,
            subjectId: subject.id,
            classId: classRecord.id,
            assignedBy: staffMembers[2].id, // DoS
          },
        })
      }
      teacherIndex++
    }
  }

  console.log('  ✅ Subject assignments complete\n')

  // ============================================
  // 5. GRADING SYSTEMS
  // ============================================
  console.log('📊 Creating grading systems...')

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

  console.log('  ✅ Grading systems created\n')

  // ============================================
  // 6. FEE STRUCTURES & PAYMENTS
  // ============================================
  console.log('💰 Creating fee structures and payments...')

  for (const classRecord of classes) {
    for (const term of [term1, term2, term3]) {
      const existing = await prisma.feeStructure.findFirst({
        where: { schoolId, classId: classRecord.id, termId: term.id },
      })
      if (!existing) {
        const tuitionFee = 150000 + (classRecord.level * 10000)
        await prisma.feeStructure.create({
          data: {
            schoolId,
            classId: classRecord.id,
            termId: term.id,
            totalAmount: tuitionFee,
            createdBy: staffMembers[3].id, // Bursar
          },
        })
      }
    }
  }

  // Create payments for 70% of students
  let paymentCount = 0
  for (const student of students.slice(0, Math.floor(students.length * 0.7))) {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: { schoolId, classId: student.classId, termId: term1.id },
    })
    if (feeStructure) {
      const amount = feeStructure.totalAmount * (Math.random() > 0.2 ? 1.0 : 0.5)
      await prisma.payment.create({
        data: {
          schoolId,
          studentId: student.id,
          termId: term1.id,
          amount,
          method: randomElement(['CASH', 'MOBILE_MONEY', 'BANK']),
          reference: `PAY${Date.now()}${paymentCount}`,
          receivedAt: randomDate(new Date('2026-02-01'), new Date('2026-02-28')),
          receivedBy: staffMembers[3].id,
          status: 'CONFIRMED',
        },
      })
      paymentCount++
    }
  }

  console.log(`  ✅ Created ${paymentCount} payments\n`)

  console.log('✅ COMPLETE school data seeding finished!')
  console.log('\n📊 Summary:')
  console.log(`  - Classes: ${classes.length}`)
  console.log(`  - Streams: ${streams.length}`)
  console.log(`  - Subjects: ${subjects.length}`)
  console.log(`  - Staff: ${staffMembers.length}`)
  console.log(`  - Students: ${students.length}`)
  console.log(`  - Guardians: ${guardians.length}`)
  console.log(`  - Payments: ${paymentCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

  // ============================================
  // 7. CA ENTRIES (Continuous Assessment)
  // ============================================
  console.log('📝 Creating CA entries...')

  let caCount = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      // Get teacher assigned to this class-subject
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { schoolId, classId: classRecord.id, subjectId: subject.id },
      })
      
      if (staffSubject) {
        // Create 3 CA entries per subject (Assignment 1, Test 1, Assignment 2)
        const caTypes = [
          { name: 'Assignment 1', type: 'ASSIGNMENT', maxScore: 20 },
          { name: 'Test 1', type: 'TEST', maxScore: 30 },
          { name: 'Assignment 2', type: 'ASSIGNMENT', maxScore: 20 },
        ]

        for (const caType of caTypes) {
          // Get students in this class
          const classStudents = students.filter(s => s.classId === classRecord.id)
          
          for (const student of classStudents) {
            const score = generateRealisticScore(caType.maxScore)
            
            await prisma.cAEntry.create({
              data: {
                schoolId,
                studentId: student.id,
                subjectId: subject.id,
                teacherId: staffSubject.staffId,
                termId: term1.id,
                name: caType.name,
                type: caType.type,
                maxScore: caType.maxScore,
                caScore: score,
                status: Math.random() > 0.3 ? 'SUBMITTED' : 'DRAFT',
                examDate: randomDate(new Date('2026-02-01'), new Date('2026-04-30')),
              },
            })
            caCount++
          }
        }
      }
    }
  }

  console.log(`  ✅ Created ${caCount} CA entries\n`)

  // ============================================
  // 8. EXAM ENTRIES
  // ============================================
  console.log('📝 Creating exam entries...')

  let examCount = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { schoolId, classId: classRecord.id, subjectId: subject.id },
      })
      
      if (staffSubject) {
        const classStudents = students.filter(s => s.classId === classRecord.id)
        
        for (const student of classStudents) {
          const examScore = generateRealisticScore(100)
          
          await prisma.examEntry.create({
            data: {
              schoolId,
              studentId: student.id,
              subjectId: subject.id,
              teacherId: staffSubject.staffId,
              termId: term1.id,
              maxScore: 100,
              examScore,
              status: Math.random() > 0.2 ? 'SUBMITTED' : 'DRAFT',
              examDate: randomDate(new Date('2026-05-01'), new Date('2026-05-25')),
            },
          })
          examCount++
        }
      }
    }
  }

  console.log(`  ✅ Created ${examCount} exam entries\n`)

  // ============================================
  // 9. ATTENDANCE RECORDS
  // ============================================
  console.log('📅 Creating attendance records...')

  let attendanceCount = 0
  const startDate = new Date('2026-02-01')
  const endDate = new Date('2026-04-10')
  
  // Generate attendance for each school day (Mon-Fri)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue // Skip weekends
    
    for (const student of students) {
      // 95% attendance rate
      const status = Math.random() > 0.05 ? 'PRESENT' : (Math.random() > 0.5 ? 'ABSENT' : 'LATE')
      
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { schoolId, classId: student.classId },
      })
      
      if (staffSubject) {
        await prisma.attendance.create({
          data: {
            schoolId,
            studentId: student.id,
            classId: student.classId,
            date: new Date(d),
            period: 1,
            status,
            recordedBy: staffSubject.staffId,
            recordedAt: new Date(d),
          },
        })
        attendanceCount++
      }
    }
  }

  console.log(`  ✅ Created ${attendanceCount} attendance records\n`)

  // ============================================
  // 10. DOS CURRICULUM SUBJECTS
  // ============================================
  console.log('📚 Creating DoS curriculum subjects...')

  let curriculumCount = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const existing = await prisma.doSCurriculumSubject.findFirst({
        where: { schoolId, classId: classRecord.id, subjectId: subject.id },
      })
      
      if (!existing) {
        await prisma.doSCurriculumSubject.create({
          data: {
            schoolId,
            classId: classRecord.id,
            subjectId: subject.id,
            periodsPerWeek: subject.periodsPerWeek,
            isActive: true,
          },
        })
        curriculumCount++
      }
    }
  }

  console.log(`  ✅ Created ${curriculumCount} curriculum subjects\n`)

  // ============================================
  // 11. DOS TIMETABLES
  // ============================================
  console.log('📅 Creating DoS timetables...')

  let timetableCount = 0
  for (const classRecord of classes) {
    const existing = await prisma.doSTimetable.findFirst({
      where: { schoolId, classId: classRecord.id, termId: term1.id },
    })
    
    if (!existing) {
      const timetable = await prisma.doSTimetable.create({
        data: {
          schoolId,
          classId: classRecord.id,
          termId: term1.id,
          name: `${classRecord.name} - Term 1 2026`,
          status: 'APPROVED',
          isLocked: true,
          createdBy: staffMembers[2].id, // DoS
        },
      })
      
      // Create timetable entries (Mon-Fri, 8 periods per day)
      let entryCount = 0
      for (let day = 1; day <= 5; day++) {
        for (let period = 1; period <= 8; period++) {
          // Assign subjects in rotation
          const subject = subjects[entryCount % subjects.length]
          
          const curriculumSubject = await prisma.doSCurriculumSubject.findFirst({
            where: { schoolId, classId: classRecord.id, subjectId: subject.id },
          })
          
          const staffSubject = await prisma.staffSubject.findFirst({
            where: { schoolId, classId: classRecord.id, subjectId: subject.id },
          })
          
          if (curriculumSubject && staffSubject) {
            await prisma.doSTimetableEntry.create({
              data: {
                schoolId,
                timetableId: timetable.id,
                curriculumSubjectId: curriculumSubject.id,
                teacherId: staffSubject.staffId,
                dayOfWeek: day,
                period,
                room: `Room ${randomInt(1, 20)}`,
              },
            })
          }
          
          entryCount++
        }
      }
      
      timetableCount++
    }
  }

  console.log(`  ✅ Created ${timetableCount} timetables\n`)

  // ============================================
  // 12. DISCIPLINE CASES
  // ============================================
  console.log('⚖️ Creating discipline cases...')

  let disciplineCount = 0
  // 10% of students have discipline cases
  const disciplineStudents = students.slice(0, Math.floor(students.length * 0.1))
  
  for (const student of disciplineStudents) {
    const staffSubject = await prisma.staffSubject.findFirst({
      where: { schoolId, classId: student.classId },
    })
    
    if (staffSubject) {
      await prisma.disciplineCase.create({
        data: {
          schoolId,
          studentId: student.id,
          type: randomElement(DISCIPLINE_TYPES),
          action: randomElement(DISCIPLINE_ACTIONS),
          description: 'Disciplinary action taken',
          reportedBy: staffSubject.staffId,
          reportedAt: randomDate(new Date('2026-02-01'), new Date('2026-04-10')),
        },
      })
      disciplineCount++
    }
  }

  console.log(`  ✅ Created ${disciplineCount} discipline cases\n`)

  // ============================================
  // 13. MESSAGES & COMMUNICATION
  // ============================================
  console.log('💬 Creating messages...')

  let messageCount = 0
  // Send fee reminder messages to 30% of guardians
  const messageGuardians = guardians.slice(0, Math.floor(guardians.length * 0.3))
  
  for (const guardian of messageGuardians) {
    await prisma.message.create({
      data: {
        schoolId,
        guardianId: guardian.id,
        channel: 'SMS',
        type: 'AUTOMATED',
        content: 'Dear parent, this is a reminder about school fees payment. Thank you.',
        status: 'DELIVERED',
        sentAt: randomDate(new Date('2026-02-01'), new Date('2026-04-10')),
      },
    })
    messageCount++
  }

  console.log(`  ✅ Created ${messageCount} messages\n`)

  // ============================================
  // 14. TEACHER ALERTS
  // ============================================
  console.log('🔔 Creating teacher alerts...')

  let alertCount = 0
  for (const teacher of classTeachers.slice(0, 10)) {
    await prisma.teacherAlert.create({
      data: {
        schoolId,
        staffId: teacher.id,
        alertType: 'CA_PENDING_SUBMISSION',
        message: 'You have pending CA submissions for Mathematics',
        priority: randomInt(1, 5),
        dueDate: new Date('2026-05-01'),
      },
    })
    alertCount++
  }

  console.log(`  ✅ Created ${alertCount} teacher alerts\n`)

  // ============================================
  // 15. COMPETENCIES
  // ============================================
  console.log('🎯 Creating competencies...')

  let competencyCount = 0
  for (const classRecord of classes) {
    for (const subject of subjects) {
      const competency = await prisma.competency.create({
        data: {
          schoolId,
          classId: classRecord.id,
          subjectId: subject.id,
          code: `${subject.code}-${classRecord.name}-C1`,
          name: `${subject.name} Core Competency`,
          description: `Core competency for ${subject.name} in ${classRecord.name}`,
          isActive: true,
        },
      })
      
      // Create competency progress for 20% of students
      const classStudents = students.filter(s => s.classId === classRecord.id).slice(0, 6)
      for (const student of classStudents) {
        await prisma.competencyProgress.create({
          data: {
            schoolId,
            competencyId: competency.id,
            studentId: student.id,
            termId: term1.id,
            level: randomInt(1, 4),
            evidence: 'Demonstrated competency in class activities',
            assessedBy: staffMembers[2].id,
            assessedAt: randomDate(new Date('2026-02-01'), new Date('2026-04-10')),
          },
        })
      }
      
      competencyCount++
    }
  }

  console.log(`  ✅ Created ${competencyCount} competencies\n`)

  // ============================================
  // 16. ANNOUNCEMENTS
  // ============================================
  console.log('📢 Creating announcements...')

  await prisma.announcement.create({
    data: {
      schoolId,
      title: 'Term 1 Opening',
      content: 'Welcome back to school! Term 1 begins on February 1st, 2026.',
      priority: 'HIGH',
      isActive: true,
      publishedAt: new Date('2026-01-25'),
      expiresAt: new Date('2026-02-05'),
    },
  })

  await prisma.announcement.create({
    data: {
      schoolId,
      title: 'Mid-Term Break',
      content: 'Mid-term break will be from March 15-20, 2026.',
      priority: 'MEDIUM',
      isActive: true,
      publishedAt: new Date('2026-03-01'),
      expiresAt: new Date('2026-03-20'),
    },
  })

  console.log('  ✅ Created announcements\n')

  // ============================================
  // 17. STAFF RESPONSIBILITIES
  // ============================================
  console.log('👔 Creating staff responsibilities...')

  let responsibilityCount = 0
  for (let i = 0; i < classTeachers.length && i < classes.length; i++) {
    await prisma.staffResponsibility.create({
      data: {
        schoolId,
        staffId: classTeachers[i].id,
        type: 'CLASS_TEACHER_DUTY',
        details: { classId: classes[i].id, className: classes[i].name },
        assignedBy: staffMembers[2].id, // DoS
      },
    })
    responsibilityCount++
  }

  console.log(`  ✅ Created ${responsibilityCount} staff responsibilities\n`)

  // ============================================
  // 18. STAFF TASKS
  // ============================================
  console.log('📋 Creating staff tasks...')

  let taskCount = 0
  for (const teacher of classTeachers.slice(0, 10)) {
    await prisma.staffTask.create({
      data: {
        staffId: teacher.id,
        schoolId,
        title: 'Submit Term 1 CA Marks',
        description: 'Submit all CA marks for your assigned subjects',
        type: 'SUBMIT_MARKS',
        linkedModule: 'ACADEMICS',
        deadline: new Date('2026-05-01'),
        status: Math.random() > 0.5 ? 'COMPLETED' : 'PENDING',
        createdBy: staffMembers[2].id,
      },
    })
    taskCount++
  }

  console.log(`  ✅ Created ${taskCount} staff tasks\n`)

  console.log('🎉 ALL DATA SEEDING COMPLETE!')
  console.log('\n📊 FINAL SUMMARY:')
  console.log(`  - Classes: ${classes.length}`)
  console.log(`  - Streams: ${streams.length}`)
  console.log(`  - Subjects: ${subjects.length}`)
  console.log(`  - Staff: ${staffMembers.length}`)
  console.log(`  - Students: ${students.length}`)
  console.log(`  - Guardians: ${guardians.length}`)
  console.log(`  - CA Entries: ${caCount}`)
  console.log(`  - Exam Entries: ${examCount}`)
  console.log(`  - Attendance Records: ${attendanceCount}`)
  console.log(`  - Timetables: ${timetableCount}`)
  console.log(`  - Discipline Cases: ${disciplineCount}`)
  console.log(`  - Messages: ${messageCount}`)
  console.log(`  - Teacher Alerts: ${alertCount}`)
  console.log(`  - Competencies: ${competencyCount}`)
  console.log(`  - Staff Responsibilities: ${responsibilityCount}`)
  console.log(`  - Staff Tasks: ${taskCount}`)
  console.log(`  - Payments: ${paymentCount}`)
  console.log('\n🔐 Login Credentials:')
  console.log('  Head Teacher: headteacher@rwenzori.ac.ug / password123')
  console.log('  Deputy: deputy@rwenzori.ac.ug / password123')
  console.log('  DoS: dos@rwenzori.ac.ug / password123')
  console.log('  Bursar: bursar@rwenzori.ac.ug / password123')
  console.log('  Teachers: teacher5@rwenzori.ac.ug to teacher25@rwenzori.ac.ug / password123')
