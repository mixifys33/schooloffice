const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debugPasswordVerification() {
  try {
    console.log('🔍 Starting password verification debug...\n');

    const email = 'kimfa9717@gmail.com';
    const testPassword = 'Q5^Be#YbNf4#';

    // Find the user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { email: email },
        ],
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        schoolId: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Active:', user.isActive);
    console.log('   School ID:', user.schoolId);
    console.log('   Has password hash:', !!user.passwordHash);
    console.log('   Hash length:', user.passwordHash?.length);
    console.log('   Hash prefix:', user.passwordHash?.substring(0, 15));
    console.log('   Hash full:', user.passwordHash);
    console.log();

    // Test password verification
    console.log('🔧 Testing password verification...');
    console.log('   Test password:', testPassword);
    console.log('   Password length:', testPassword.length);
    console.log('   Password bytes:', Buffer.from(testPassword).toString('hex'));
    console.log();

    if (!user.passwordHash) {
      console.log('❌ No password hash stored');
      return;
    }

    // Try verification
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('   Verification result:', isValid);
    console.log();

    if (!isValid) {
      console.log('❌ Password verification FAILED');
      console.log();
      console.log('🔧 Attempting to create new hash with same password...');
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('   New hash:', newHash);
      console.log('   New hash length:', newHash.length);
      console.log();

      // Test new hash
      const newHashValid = await bcrypt.compare(testPassword, newHash);
      console.log('   New hash verification:', newHashValid);
      console.log();

      if (newHashValid) {
        console.log('✅ New hash works! The stored hash might be corrupted.');
        console.log();
        console.log('💡 Solution: Update the password hash in database');
        console.log('   Run this command:');
        console.log(`   await prisma.user.update({`);
        console.log(`     where: { id: '${user.id}' },`);
        console.log(`     data: { passwordHash: '${newHash}' }`);
        console.log(`   })`);
      }
    } else {
      console.log('✅ Password verification SUCCESSFUL');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPasswordVerification();
