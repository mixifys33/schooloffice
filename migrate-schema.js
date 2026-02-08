// Migration script to update the database schema
// Run this after updating the schema.prisma file

const { execSync } = require('child_process');

console.log('Running Prisma migration...');

try {
  // Generate Prisma client
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push schema changes to database
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}