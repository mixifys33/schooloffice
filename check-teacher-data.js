const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeacherData() {
  try {
    console.log('🔍 Checking teacher data...');
    
    // Check users with TEACHER role
    const teacherUsers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true
      }
    });
    
    console.log('👥 Teacher users found:', teacherUsers.length);
    teacherUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - School: ${user.schoolId}`);
    });
    
    // Check teacher profiles
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
        schoolId: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        classTeacherForIds: true
      }
    });
    
    console.log('\n👨‍🏫 Teacher profiles found:', teachers.length);
    teachers.forEach(teacher => {
      console.log(`  - ${teacher.firstName} ${teacher.lastName} (User: ${teacher.userId}) - School: ${teacher.schoolId}`);
      console.log(`    Classes: ${teacher.assignedClassIds.length}, Subjects: ${teacher.assignedSubjectIds.length}`);
    });
    
    // Check classes and subjects
    const classes = await prisma.class.findMany({
      select: { id: true, name: true, schoolId: true }
    });
    
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, schoolId: true }
    });
    
    console.log('\n📚 Classes found:', classes.length);
    console.log('📖 Subjects found:', subjects.length);
    
    // Check if there are any students
    const students = await prisma.student.findMany({
      select: { id: true, firstName: true, lastName: true, classId: true }
    });
    
    console.log('👨‍🎓 Students found:', students.length);
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeacherData();