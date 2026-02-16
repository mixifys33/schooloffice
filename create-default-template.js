/**
 * Create Default Report Card Template
 * 
 * This script creates a system default template for all schools
 * that uses the built-in PDF generation service (no HTML required).
 * 
 * Run: node create-default-template.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createDefaultTemplate() {
  try {
    console.log('🚀 Creating default report card templates...\n')

    // Get all schools
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`📊 Found ${schools.length} school(s)\n`)

    for (const school of schools) {
      console.log(`Processing: ${school.name}`)

      // Get first staff member (DoS or Admin) to set as creator
      const staff = await prisma.staff.findFirst({
        where: { schoolId: school.id },
        orderBy: { createdAt: 'asc' },
      })

      if (!staff) {
        console.log(`  ⚠️  No staff found, skipping...`)
        continue
      }

      // Check if default template already exists
      const existing = await prisma.reportTemplate.findFirst({
        where: {
          schoolId: school.id,
          isSystemTemplate: true,
        },
      })

      if (existing) {
        console.log(`  ✓ Default template already exists`)
        continue
      }

      // Create default template
      const template = await prisma.reportTemplate.create({
        data: {
          schoolId: school.id,
          name: 'Default Report Card',
          type: 'NEW_CURRICULUM',
          content: null, // null = use built-in PDF service
          variables: {
            description: 'System default template using built-in PDF layouts',
            features: [
              'Professional layout',
              'School branding',
              'Student information',
              'Subject scores table',
              'Performance summary',
              'Attendance tracking',
              'Teacher comments',
              'Signatures section',
            ],
          },
          isDefault: true,
          isActive: true,
          isSystemTemplate: true,
          createdBy: staff.id,
        },
      })

      console.log(`  ✅ Created default template: ${template.id}`)
    }

    console.log('\n✨ Done! All schools now have default templates.')
    console.log('\n📝 Next steps:')
    console.log('   1. Run: npx prisma db push (to update database schema)')
    console.log('   2. Generate reports - they will use the built-in PDF service')
    console.log('   3. No HTML knowledge required!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultTemplate()
