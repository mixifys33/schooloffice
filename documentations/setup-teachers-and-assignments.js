const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupTeachersAndAssignments() {
  try {
    console.log('🚀 Setting up teachers and subject assignments...\n');

    // Get school
    const school = await prisma.school.findFirst({
      where: { code: 'VALLEY' },
      select: { id: true, name: true }
    });

    if (!school) {
      console.log('❌ School not found');
      return;
    }

    console.log(`📚 School: ${school.name}`);
    console.log(`🆔 School ID: ${school.id}\n`);

    // Step 1: Create 5 new fake teachers
    console.log('═'.repeat(90));
    console.log('STEP 1: Creating 5 New Teachers');
    console.log('═'.repeat(90));

    const newTeachers = [
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@valley.com', phone: '+256700111111', empNum: 'TEACH-001' },
      { firstName: 'Michael', lastName: 'Williams', email: 'michael.williams@valley.com', phone: '+256700222222', empNum: 'TEACH-002' },
      { firstName: 'Emily', lastName: 'Brown', email: 'emily.brown@valley.com', phone: '+256700333333', empNum: 'TEACH-003' },
      { firstName: 'James', lastName: 'Davis', email: 'james.davis@valley.com', phone: '+256700444444', empNum: 'TEACH-004' },
      { firstName: 'Linda', lastName: 'Miller', email: 'linda.miller@valley.com', phone: '+256700555555', empNum: 'TEACH-005' }
    ];

    const createdStaff = [];
    const passwordHash = await bcrypt.hash('password123', 12);

    for (const teacher of newTeachers) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          email: teacher.email
        }
      });

      let user;
      if (existingUser) {
        console.log(`⏭️  Skipped: ${teacher.firstName} ${teacher.lastName} (user already exists)`);
        user = existingUser;
      } else {
        // Create user account
        user = await prisma.user.create({
          data: {
            schoolId: school.id,
            username: `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}`,
            email: teacher.email,
            phone: teacher.phone,
            passwordHash,
            role: 'TEACHER',
            activeRole: 'TEACHER',
            isActive: true
          }
        });
      }

      // Check if staff already exists
      const existingStaff = await prisma.staff.findFirst({
        where: {
          schoolId: school.id,
          userId: user.id
        }
      });

      let staff;
      if (existingStaff) {
        console.log(`⏭️  Skipped: ${teacher.firstName} ${teacher.lastName} (staff already exists)`);
        staff = existingStaff;
      } else {
        // Create staff record
        staff = await prisma.staff.create({
          data: {
            schoolId: school.id,
            userId: user.id,
            employeeNumber: teacher.empNum,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email,
            phone: teacher.phone,
            role: 'TEACHER',
            primaryRole: 'CLASS_TEACHER',
            status: 'ACTIVE',
            hireDate: new Date()
          }
        });

        console.log(`✅ Created: ${teacher.firstName} ${teacher.lastName} (${teacher.empNum})`);
      }

      createdStaff.push(staff);
    }

    console.log(`\n✅ Successfully created ${createdStaff.length} new teachers\n`);

    // Step 2: Get all staff (now 12 total)
    console.log('═'.repeat(90));
    console.log('STEP 2: Getting All Staff Members');
    console.log('═'.repeat(90));

    const allStaff = await prisma.staff.findMany({
      where: { schoolId: school.id },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true }
    });

    console.log(`📊 Total Staff: ${allStaff.length}`);
    allStaff.forEach((staff, i) => {
      console.log(`   ${i + 1}. ${staff.firstName} ${staff.lastName} (${staff.employeeNumber})`);
    });
    console.log('');

    // Step 3: Get all subjects
    console.log('═'.repeat(90));
    console.log('STEP 3: Getting All Subjects');
    console.log('═'.repeat(90));

    const allSubjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, code: true }
    });

    console.log(`📚 Total Subjects: ${allSubjects.length}`);
    allSubjects.forEach((subject, i) => {
      console.log(`   ${i + 1}. ${subject.name} (${subject.code})`);
    });
    console.log('');

    // Step 4: Get all classes
    console.log('═'.repeat(90));
    console.log('STEP 4: Getting All Classes');
    console.log('═'.repeat(90));

    const allClasses = await prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true }
    });

    console.log(`🏫 Total Classes: ${allClasses.length}`);
    allClasses.forEach((cls, i) => {
      console.log(`   ${i + 1}. ${cls.name}`);
    });
    console.log('');

    // Step 5: Clear existing assignments
    console.log('═'.repeat(90));
    console.log('STEP 5: Clearing Existing Assignments');
    console.log('═'.repeat(90));

    const deletedStaffSubjects = await prisma.staffSubject.deleteMany({
      where: { schoolId: school.id }
    });
    console.log(`🗑️  Deleted ${deletedStaffSubjects.count} existing StaffSubject assignments`);

    const deletedClassSubjects = await prisma.classSubject.deleteMany({
      where: { 
        class: { schoolId: school.id }
      }
    });
    console.log(`🗑️  Deleted ${deletedClassSubjects.count} existing ClassSubject assignments`);

    const deletedDoSCurriculum = await prisma.doSCurriculumSubject.deleteMany({
      where: { schoolId: school.id }
    });
    console.log(`🗑️  Deleted ${deletedDoSCurriculum.count} existing DoSCurriculumSubject assignments\n`);

    // Step 6: Distribute subjects equally among staff
    console.log('═'.repeat(90));
    console.log('STEP 6: Assigning Subjects to Teachers (Equal Distribution)');
    console.log('═'.repeat(90));

    const staffSubjectAssignments = [];
    let staffIndex = 0;

    // Use first staff as assigner
    const assignerId = allStaff[0].id;

    // Distribute subjects round-robin to staff
    for (const subject of allSubjects) {
      // Assign each subject to 2-3 staff members for coverage
      const numAssignments = Math.min(3, allStaff.length);
      
      for (let i = 0; i < numAssignments; i++) {
        const staff = allStaff[staffIndex % allStaff.length];
        
        // Assign to 2 random classes for each staff-subject pair
        const randomClasses = allClasses
          .sort(() => Math.random() - 0.5)
          .slice(0, 2);

        for (const cls of randomClasses) {
          staffSubjectAssignments.push({
            schoolId: school.id,
            staffId: staff.id,
            subjectId: subject.id,
            classId: cls.id,
            assignedBy: assignerId
          });
        }

        staffIndex++;
      }
    }

    // Create StaffSubject assignments
    await prisma.staffSubject.createMany({
      data: staffSubjectAssignments
    });

    console.log(`✅ Created ${staffSubjectAssignments.length} StaffSubject assignments`);

    // Count assignments per staff
    const assignmentCounts = {};
    staffSubjectAssignments.forEach(assignment => {
      assignmentCounts[assignment.staffId] = (assignmentCounts[assignment.staffId] || 0) + 1;
    });

    console.log('\n📊 Assignments per teacher:');
    for (const staff of allStaff) {
      const count = assignmentCounts[staff.id] || 0;
      console.log(`   ${staff.firstName} ${staff.lastName}: ${count} assignments`);
    }
    console.log('');

    // Step 7: Assign at least 12 subjects to each class
    console.log('═'.repeat(90));
    console.log('STEP 7: Assigning Subjects to Classes (Min 12 per class)');
    console.log('═'.repeat(90));

    const classSubjectAssignments = [];

    for (const cls of allClasses) {
      // Select 12-15 subjects for each class (or all if less than 12)
      const numSubjects = Math.min(Math.max(12, allSubjects.length), allSubjects.length);
      const selectedSubjects = allSubjects
        .sort(() => Math.random() - 0.5)
        .slice(0, numSubjects);

      for (const subject of selectedSubjects) {
        classSubjectAssignments.push({
          schoolId: school.id,
          classId: cls.id,
          subjectId: subject.id,
          maxMark: 100,
          appearsOnReport: true,
          affectsPosition: true
        });
      }

      console.log(`✅ ${cls.name}: Assigned ${selectedSubjects.length} subjects`);
    }

    // Create ClassSubject assignments
    await prisma.classSubject.createMany({
      data: classSubjectAssignments
    });

    console.log(`\n✅ Created ${classSubjectAssignments.length} ClassSubject assignments\n`);

    // Step 8: Create DoS Curriculum assignments
    console.log('═'.repeat(90));
    console.log('STEP 8: Creating DoS Curriculum Assignments');
    console.log('═'.repeat(90));

    const dosCurriculumAssignments = [];

    for (const cls of allClasses) {
      // Get subjects assigned to this class
      const classSubjects = classSubjectAssignments
        .filter(assignment => assignment.classId === cls.id)
        .map(assignment => assignment.subjectId);

      for (const subjectId of classSubjects) {
        dosCurriculumAssignments.push({
          schoolId: school.id,
          classId: cls.id,
          subjectId: subjectId,
          periodsPerWeek: 4,
          isCore: true,
          isActive: true
        });
      }
    }

    // Create DoSCurriculumSubject assignments
    await prisma.doSCurriculumSubject.createMany({
      data: dosCurriculumAssignments
    });

    console.log(`✅ Created ${dosCurriculumAssignments.length} DoSCurriculumSubject assignments\n`);

    // Step 9: Summary
    console.log('═'.repeat(90));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(90));

    const finalStats = await Promise.all([
      prisma.staff.count({ where: { schoolId: school.id } }),
      prisma.staffSubject.count({ where: { schoolId: school.id } }),
      prisma.classSubject.count({ where: { class: { schoolId: school.id } } }),
      prisma.doSCurriculumSubject.count({ where: { schoolId: school.id } })
    ]);

    console.log(`\n✅ Total Staff: ${finalStats[0]}`);
    console.log(`✅ StaffSubject Assignments: ${finalStats[1]}`);
    console.log(`✅ ClassSubject Assignments: ${finalStats[2]}`);
    console.log(`✅ DoSCurriculumSubject Assignments: ${finalStats[3]}`);

    // Verify each class has at least 12 subjects
    console.log('\n📋 Subjects per class:');
    for (const cls of allClasses) {
      const count = await prisma.classSubject.count({
        where: { classId: cls.id }
      });
      console.log(`   ${cls.name}: ${count} subjects ${count >= 12 ? '✅' : '⚠️'}`);
    }

    console.log('\n✅ Setup complete! Your timetable is ready for testing.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTeachersAndAssignments();
