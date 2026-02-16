const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubjectAssignments() {
  try {
    console.log('🔍 Checking subject assignments...\n');

    // Get the school
    const school = await prisma.school.findFirst({
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!school) {
      console.log('❌ No school found in database');
      return;
    }

    console.log(`📚 School: ${school.name} (${school.code})`);
    console.log(`🆔 School ID: ${school.id}\n`);

    // Get total subjects
    const totalSubjects = await prisma.subject.count({
      where: { schoolId: school.id },
    });

    console.log(`📊 Total Subjects: ${totalSubjects}\n`);

    // ========================================
    // CHECK TEACHER ASSIGNMENTS (StaffSubject)
    // ========================================
    console.log('👨‍🏫 TEACHER ASSIGNMENTS (StaffSubject)\n');
    console.log('─'.repeat(90));

    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staff: { schoolId: school.id },
      },
      include: {
        subject: { select: { name: true, code: true } },
        staff: { select: { firstName: true, lastName: true, employeeNumber: true } },
        class: { select: { name: true } },
      },
    });

    console.log(`Total Teacher-Subject Assignments: ${staffSubjects.length}\n`);

    // Get unique subjects assigned to teachers
    const subjectsWithTeachers = new Set(staffSubjects.map(ss => ss.subjectId));
    console.log(`Subjects assigned to teachers: ${subjectsWithTeachers.size} out of ${totalSubjects}\n`);

    // Group by subject
    const subjectTeacherMap = {};
    staffSubjects.forEach(ss => {
      if (!subjectTeacherMap[ss.subjectId]) {
        subjectTeacherMap[ss.subjectId] = {
          subjectName: ss.subject.name,
          subjectCode: ss.subject.code,
          teachers: [],
        };
      }
      subjectTeacherMap[ss.subjectId].teachers.push({
        name: `${ss.staff.firstName} ${ss.staff.lastName}`,
        empNo: ss.staff.employeeNumber,
        class: ss.class?.name || 'N/A',
      });
    });

    console.log('Subjects with Teacher Assignments:\n');
    Object.values(subjectTeacherMap).forEach((subj, idx) => {
      console.log(`${idx + 1}. ${subj.subjectName} (${subj.subjectCode}) - ${subj.teachers.length} teacher(s)`);
      subj.teachers.forEach(t => {
        console.log(`   └─ ${t.name} (${t.empNo}) - Class: ${t.class}`);
      });
    });

    console.log('\n' + '─'.repeat(90) + '\n');

    // ========================================
    // CHECK CLASS ASSIGNMENTS (ClassSubject)
    // ========================================
    console.log('🏫 CLASS ASSIGNMENTS (ClassSubject)\n');
    console.log('─'.repeat(90));

    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class: { schoolId: school.id },
      },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
      },
    });

    console.log(`Total Class-Subject Assignments: ${classSubjects.length}\n`);

    // Get unique subjects assigned to classes
    const subjectsWithClasses = new Set(classSubjects.map(cs => cs.subjectId));
    console.log(`Subjects assigned to classes: ${subjectsWithClasses.size} out of ${totalSubjects}\n`);

    // Group by subject
    const subjectClassMap = {};
    classSubjects.forEach(cs => {
      if (!subjectClassMap[cs.subjectId]) {
        subjectClassMap[cs.subjectId] = {
          subjectName: cs.subject.name,
          subjectCode: cs.subject.code,
          classes: [],
        };
      }
      subjectClassMap[cs.subjectId].classes.push({
        name: cs.class.name,
        maxMark: cs.maxMark,
        appearsOnReport: cs.appearsOnReport,
      });
    });

    console.log('Subjects with Class Assignments:\n');
    Object.values(subjectClassMap).forEach((subj, idx) => {
      console.log(`${idx + 1}. ${subj.subjectName} (${subj.subjectCode}) - ${subj.classes.length} class(es)`);
      subj.classes.forEach(c => {
        console.log(`   └─ ${c.name} (Max: ${c.maxMark}, Report: ${c.appearsOnReport ? 'Yes' : 'No'})`);
      });
    });

    console.log('\n' + '─'.repeat(90) + '\n');

    // ========================================
    // CHECK DoS CURRICULUM SUBJECTS
    // ========================================
    console.log('📚 DoS CURRICULUM SUBJECTS (DoSCurriculumSubject)\n');
    console.log('─'.repeat(90));

    const dosCurriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: { schoolId: school.id },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
      },
    });

    console.log(`Total DoS Curriculum Assignments: ${dosCurriculumSubjects.length}\n`);

    // Get unique subjects in DoS curriculum
    const subjectsInCurriculum = new Set(dosCurriculumSubjects.map(dcs => dcs.subjectId));
    console.log(`Subjects in DoS curriculum: ${subjectsInCurriculum.size} out of ${totalSubjects}\n`);

    // Group by subject
    const curriculumMap = {};
    dosCurriculumSubjects.forEach(dcs => {
      if (!curriculumMap[dcs.subjectId]) {
        curriculumMap[dcs.subjectId] = {
          subjectName: dcs.subject.name,
          subjectCode: dcs.subject.code,
          assignments: [],
        };
      }
      curriculumMap[dcs.subjectId].assignments.push({
        class: dcs.class.name,
        periodsPerWeek: dcs.periodsPerWeek,
        isCore: dcs.isCore,
        isActive: dcs.isActive,
      });
    });

    console.log('Subjects in DoS Curriculum:\n');
    Object.values(curriculumMap).forEach((subj, idx) => {
      console.log(`${idx + 1}. ${subj.subjectName} (${subj.subjectCode}) - ${subj.assignments.length} class(es)`);
      subj.assignments.forEach(a => {
        console.log(`   └─ ${a.class} (${a.periodsPerWeek} periods/week, Core: ${a.isCore ? 'Yes' : 'No'}, Active: ${a.isActive ? 'Yes' : 'No'})`);
      });
    });

    console.log('\n' + '─'.repeat(90) + '\n');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('📊 SUMMARY\n');
    console.log('─'.repeat(90));

    // Get all subjects
    const allSubjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, code: true },
    });

    // Check which subjects are NOT assigned
    const unassignedToTeachers = allSubjects.filter(s => !subjectsWithTeachers.has(s.id));
    const unassignedToClasses = allSubjects.filter(s => !subjectsWithClasses.has(s.id));
    const notInCurriculum = allSubjects.filter(s => !subjectsInCurriculum.has(s.id));

    console.log(`\n✅ Subjects assigned to teachers: ${subjectsWithTeachers.size}/${totalSubjects}`);
    console.log(`✅ Subjects assigned to classes: ${subjectsWithClasses.size}/${totalSubjects}`);
    console.log(`✅ Subjects in DoS curriculum: ${subjectsInCurriculum.size}/${totalSubjects}`);

    if (unassignedToTeachers.length > 0) {
      console.log(`\n❌ Subjects NOT assigned to any teacher (${unassignedToTeachers.length}):`);
      unassignedToTeachers.forEach(s => console.log(`   - ${s.name} (${s.code})`));
    }

    if (unassignedToClasses.length > 0) {
      console.log(`\n❌ Subjects NOT assigned to any class (${unassignedToClasses.length}):`);
      unassignedToClasses.forEach(s => console.log(`   - ${s.name} (${s.code})`));
    }

    if (notInCurriculum.length > 0) {
      console.log(`\n❌ Subjects NOT in DoS curriculum (${notInCurriculum.length}):`);
      notInCurriculum.forEach(s => console.log(`   - ${s.name} (${s.code})`));
    }

    console.log('\n' + '─'.repeat(90));
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubjectAssignments();
