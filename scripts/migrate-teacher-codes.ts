/**
 * Teacher Code Migration Script
 * 
 * Generates unique teacher codes for all existing teachers without codes.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-teacher-codes.ts <schoolId>
 * 
 * Example:
 *   npx ts-node scripts/migrate-teacher-codes.ts 695d70b9fd1c15f57d0ad1f2
 */

import { PrismaClient } from '@prisma/client';
import { generateCodesForAllTeachers } from '../src/services/teacher-code-generator.service';

const prisma = new PrismaClient();

async function main() {
  const schoolId = process.argv[2];

  if (!schoolId) {
    console.error('❌ Error: School ID is required');
    console.log('Usage: npx ts-node scripts/migrate-teacher-codes.ts <schoolId>');
    process.exit(1);
  }

  console.log('🚀 Starting teacher code migration...');
  console.log(`📊 School ID: ${schoolId}`);

  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  });

  if (!school) {
    console.error(`❌ Error: School with ID ${schoolId} not found`);
    process.exit(1);
  }

  console.log(`✅ School found: ${school.name}`);

  // Count teachers without codes
  const teachersWithoutCodes = await prisma.staff.count({
    where: {
      schoolId,
      teacherCode: null,
      isTeacher: true,
    },
  });

  console.log(`📊 Teachers without codes: ${teachersWithoutCodes}`);

  if (teachersWithoutCodes === 0) {
    console.log('✅ All teachers already have codes. No migration needed.');
    process.exit(0);
  }

  // Generate codes
  const result = await generateCodesForAllTeachers(schoolId);

  console.log('\n📊 Migration Results:');
  console.log(`✅ Successfully generated: ${result.successCount} codes`);
  console.log(`❌ Failed: ${result.failedTeachers.length} teachers`);

  if (result.failedTeachers.length > 0) {
    console.log('\n❌ Failed Teachers:');
    result.failedTeachers.forEach((teacher) => {
      console.log(`  - ${teacher.name} (${teacher.id}): ${teacher.error}`);
    });
  }

  console.log('\n✅ Migration complete!');
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
