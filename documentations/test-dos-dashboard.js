const { PrismaClient } = require('@prisma/client');

async function testDoSDashboard() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing DoS Dashboard Service...');
    
    // Test basic database connection
    console.log('1. Testing database connection...');
    const schoolCount = await prisma.school.count();
    console.log(`Found ${schoolCount} schools in database`);
    
    // Test DoS tables
    console.log('2. Testing DoS tables...');
    
    try {
      const dosSubjectsCount = await prisma.doSCurriculumSubject.count();
      console.log(`DoSCurriculumSubject table: ${dosSubjectsCount} records`);
    } catch (error) {
      console.error('DoSCurriculumSubject table error:', error.message);
    }
    
    try {
      const dosAssessmentCount = await prisma.doSAssessmentPlan.count();
      console.log(`DoSAssessmentPlan table: ${dosAssessmentCount} records`);
    } catch (error) {
      console.error('DoSAssessmentPlan table error:', error.message);
    }
    
    try {
      const dosExamCount = await prisma.doSExam.count();
      console.log(`DoSExam table: ${dosExamCount} records`);
    } catch (error) {
      console.error('DoSExam table error:', error.message);
    }
    
    try {
      const dosFinalScoreCount = await prisma.doSFinalScore.count();
      console.log(`DoSFinalScore table: ${dosFinalScoreCount} records`);
    } catch (error) {
      console.error('DoSFinalScore table error:', error.message);
    }
    
    try {
      const dosReportCardCount = await prisma.doSReportCard.count();
      console.log(`DoSReportCard table: ${dosReportCardCount} records`);
    } catch (error) {
      console.error('DoSReportCard table error:', error.message);
    }
    
    // Test term lookup
    console.log('3. Testing term lookup...');
    const terms = await prisma.term.findMany({
      include: {
        academicYear: true
      },
      take: 5
    });
    console.log(`Found ${terms.length} terms`);
    
    if (terms.length > 0) {
      console.log('Sample term:', {
        id: terms[0].id,
        name: terms[0].name,
        schoolId: terms[0].academicYear.schoolId,
        isActive: terms[0].academicYear.isActive
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDoSDashboard();