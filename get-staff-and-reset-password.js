const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

async function getStaffAndResetPasswords() {
    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');
        
        const db = client.db();
        const schoolId = '69ae6e6e7363683030310000'; // Test School Finance Bug #5
        const schoolCode = '12345';
        const newPassword = 'Hacker X1234567';
        
        console.log(`\n🏫 Getting staff for School ID: ${schoolId}`);
        console.log(`📋 School Code: ${schoolCode}`);
        
        // Find all staff for this school
        const staff = await db.collection('users').find({
            schoolId: schoolId,
            role: { $in: ['admin', 'teacher', 'staff', 'bursar', 'head_teacher'] }
        }).toArray();
        
        if (staff.length === 0) {
            console.log('❌ No staff found for this school');
            return;
        }
        
        console.log(`\n👥 Found ${staff.length} staff members:`);
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        for (let i = 0; i < staff.length; i++) {
            const member = staff[i];
            console.log(`\n${i + 1}. ${member.name || 'No Name'}`);
            console.log(`   📧 Email: ${member.email}`);
            console.log(`   👤 Role: ${member.role}`);
            console.log(`   🆔 User ID: ${member._id}`);
            console.log(`   🏫 School Code: ${schoolCode}`);
            
            // Reset password
            await db.collection('users').updateOne(
                { _id: member._id },
                { $set: { password: hashedPassword } }
            );
            
            console.log(`   🔑 Password reset to: ${newPassword}`);
        }
        
        console.log(`\n✅ All passwords have been reset to: ${newPassword}`);
        console.log(`\n📝 Login Information:`);
        console.log(`   🏫 School Code: ${schoolCode}`);
        console.log(`   🔑 Password: ${newPassword}`);
        console.log(`   📧 Use any of the emails listed above`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

getStaffAndResetPasswords();