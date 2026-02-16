/**
 * Teacher Code Generation Service
 * 
 * Generates unique 5-character alphanumeric codes for teachers.
 * Format: [A-Z]{2}[0-9]{3} (e.g., "JD001", "SM042")
 * 
 * Requirements: 3.1-3.6, 10.1-10.7
 */

import { prisma } from '@/lib/db';

/**
 * Generate a unique teacher code for a staff member
 * 
 * Algorithm:
 * 1. Extract initials from teacher name (first + last name)
 * 2. Find next available number for those initials
 * 3. If all numbers exhausted (001-999), fall back to random code
 * 
 * @param teacherName - Full name of the teacher
 * @param schoolId - School ID for uniqueness check
 * @returns Unique 5-character teacher code
 */
export async function generateTeacherCode(
  teacherName: string,
  schoolId: string
): Promise<string> {
  console.log(`🔧 [Teacher Code] Generating code for teacher: ${teacherName}`);

  // 1. Extract initials from name
  const nameParts = teacherName.trim().split(/\s+/);
  let initials = '';

  if (nameParts.length >= 2) {
    // First and last name initials
    initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
  } else {
    // Single name - use first two letters
    initials = teacherName.substring(0, 2);
  }
  initials = initials.toUpperCase();

  console.log(`📊 [Teacher Code] Extracted initials: ${initials}`);

  // 2. Find next available number
  let number = 1;
  let code = '';
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    code = `${initials}${number.toString().padStart(3, '0')}`;

    // Check if code exists
    const existing = await prisma.staff.findFirst({
      where: {
        schoolId,
        teacherCode: code,
      },
    });

    if (!existing) {
      console.log(`✅ [Teacher Code] Assigned code: ${code}`);
      return code; // Found unique code
    }

    number++;
    attempts++;
  }

  // 3. Fallback: Random code if all initials+numbers exhausted
  console.log(`⚠️ [Teacher Code] All ${initials}XXX codes exhausted, generating random code`);
  return generateRandomCode(schoolId);
}

/**
 * Generate a random 5-character teacher code
 * Used as fallback when all initials-based codes are exhausted
 * 
 * @param schoolId - School ID for uniqueness check
 * @returns Unique random 5-character code
 */
async function generateRandomCode(schoolId: string): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  for (let attempt = 0; attempt < 100; attempt++) {
    const code =
      chars[Math.floor(Math.random() * chars.length)] +
      chars[Math.floor(Math.random() * chars.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      digits[Math.floor(Math.random() * digits.length)];

    const existing = await prisma.staff.findFirst({
      where: {
        schoolId,
        teacherCode: code,
      },
    });

    if (!existing) {
      console.log(`✅ [Teacher Code] Generated random code: ${code}`);
      return code;
    }
  }

  throw new Error('Failed to generate unique teacher code after 100 attempts');
}

/**
 * Generate codes for all teachers in a school who don't have codes
 * 
 * @param schoolId - School ID
 * @returns Object with success count and failed teachers
 */
export async function generateCodesForAllTeachers(schoolId: string): Promise<{
  successCount: number;
  failedTeachers: Array<{ id: string; name: string; error: string }>;
}> {
  console.log(`🔧 [Teacher Code] Generating codes for all teachers in school: ${schoolId}`);

  // Find all staff without teacher codes
  const staffWithoutCodes = await prisma.staff.findMany({
    where: {
      schoolId,
      teacherCode: null,
      isTeacher: true, // Only generate for actual teachers
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`📊 [Teacher Code] Found ${staffWithoutCodes.length} teachers without codes`);

  const failedTeachers: Array<{ id: string; name: string; error: string }> = [];
  let successCount = 0;

  for (const staff of staffWithoutCodes) {
    try {
      const fullName = `${staff.firstName} ${staff.lastName}`;
      const code = await generateTeacherCode(fullName, schoolId);

      await prisma.staff.update({
        where: { id: staff.id },
        data: { teacherCode: code },
      });

      successCount++;
    } catch (error) {
      console.error(`❌ [Teacher Code] Failed to generate code for ${staff.firstName} ${staff.lastName}:`, error);
      failedTeachers.push({
        id: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log(`✅ [Teacher Code] Migration complete: ${successCount} successful, ${failedTeachers.length} failed`);

  return {
    successCount,
    failedTeachers,
  };
}

/**
 * Check if a teacher code is available
 * 
 * @param code - Teacher code to check
 * @param schoolId - School ID
 * @returns True if code is available, false if taken
 */
export async function isTeacherCodeAvailable(
  code: string,
  schoolId: string
): Promise<boolean> {
  const existing = await prisma.staff.findFirst({
    where: {
      schoolId,
      teacherCode: code,
    },
  });

  return !existing;
}
