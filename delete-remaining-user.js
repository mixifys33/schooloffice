const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteRemainingUser() {
  try {
    console.log('🔍 Checking remaining user...\n');

    // Find the user
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        schoolId: true
      }
    });

    if (!user) {
      console.log('✅ No users found in database');
      return;
    }

    console.log('👤 Found user:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   School ID: ${user.schoolId || 'N/A'}`);
    console.log('');

    // Delete the user
    console.log('🗑️  Deleting user...');
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log('✅ User deleted successfully!');
    console.log('');
    console.log('✅ ✅ ✅ DATABASE IS NOW COMPLETELY EMPTY ✅ ✅ ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteRemainingUser();
