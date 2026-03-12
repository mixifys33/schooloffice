const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

async function checkAndCreateStaff() {
    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');
        
        const db = client.db();
        const schoolId = '69ae6e6e7363683030310000'; // Test School Finance Bug #5
        const schoolCode = '12345';
        
        console.log(`\n🏫 Checking users for School ID: ${schoolId}`);
        console.log(`📋 School Code: ${schoolCode}`);
        
        // Find ALL users for this school (any role)
        const allUsers = await db.collection('users').find({
            schoolId: schoolId
        }).toArray();
        
        console.log(`\n👥 Found ${allUsers.length} total users for this school:`);
        
        if (allUsers.length > 0) {
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name || 'No Name'}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   👤 Role: ${user.role}`);
                console.log(`   🆔 User ID: ${user._id}`);
                console.log('');
            });
        }
        
        // Check if we have any admin/staff users
        const staffUsers = allUsers.filter(user => 
            ['admin', 'teacher', 'staff', 'bursar', 'head_teacher'].includes(user.role)
        );
        
        if (staffUsers.length === 0) {
            console.log('🔧 No staff users found. Creating a test admin user...');
            
            const newPassword = 'Hacker X1234567';
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const testAdmin = {
                name: 'Test Admin',
                email: 'admin@testschool.com',
                password: hashedPassword,
                role: 'admin',
                schoolId: schoolId,
                schoolCode: schoolCode,
                isVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await db.collection('users').insertOne(testAdmin);
            
            console.log('✅ Test admin user created!');
            console.log(`   🆔 User ID: ${result.insertedId}`);
            console.log(`   📧 Email: ${testAdmin.email}`);
            console.log(`   👤 Role: ${testAdmin.role}`);
            console.log(`   🔑 Password: ${newPassword}`);
            console.log(`   🏫 School Code: ${schoolCode}`);
            
        } else {
            console.log(`\n🔧 Resetting passwords for ${staffUsers.length} staff users...`);
            
            const newPassword = 'Hacker X1234567';
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            for (const user of staffUsers) {
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { password: hashedPassword } }
                );
                
                console.log(`✅ Password reset for: ${user.email} (${user.role})`);
            }
            
            console.log(`\n📝 Login Information:`);
            console.log(`   🏫 School Code: ${schoolCode}`);
            console.log(`   🔑 Password: ${newPassword}`);
            console.log(`   📧 Use any of these emails:`);
            staffUsers.forEach(user => {
                console.log(`      - ${user.email} (${user.role})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkAndCreateStaff();