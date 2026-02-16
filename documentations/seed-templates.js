/**
 * Seed default SMS templates
 * Run this to populate the database with default templates
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_TEMPLATES = [
  {
    type: 'ATTENDANCE_ALERT',
    name: 'Attendance Alert',
    content: 'Dear Parent, {{studentName}} was absent on {{date}}. Please contact school.',
    channel: 'SMS'
  },
  {
    type: 'FEES_REMINDER',
    name: 'Fees Reminder',
    content: 'Dear Parent, {{studentName}} has outstanding balance of UGX {{balance}}. Please pay.',
    channel: 'SMS'
  },
  {
    type: 'REPORT_READY',
    name: 'Report Ready',
    content: 'Dear Parent, {{studentName}} report card is ready. Position: {{position}}.',
    channel: 'SMS'
  },
  {
    type: 'GENERAL_ANNOUNCEMENT',
    name: 'General Announcement',
    content: '{{content}} - {{schoolName}}',
    channel: 'SMS'
  }
]

async function seedTemplates() {
  try {
    console.log('Seeding default SMS templates...')
    
    // Get all schools to seed templates for each
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`Found ${schools.length} schools`)
    
    for (const school of schools) {
      console.log(`Seeding templates for school: ${school.name}`)
      
      for (const template of DEFAULT_TEMPLATES) {
        await prisma.messageTemplate.upsert({
          where: {
            schoolId_type_channel: {
              schoolId: school.id,
              type: template.type,
              channel: template.channel
            }
          },
          update: {
            content: template.content,
            isActive: true
          },
          create: {
            schoolId: school.id,
            type: template.type,
            channel: template.channel,
            content: template.content,
            isActive: true
          }
        })
        
        console.log(`  ✓ ${template.name}`)
      }
    }
    
    console.log('✅ Templates seeded successfully!')
    
    // Verify by counting templates
    const totalTemplates = await prisma.messageTemplate.count()
    console.log(`Total templates in database: ${totalTemplates}`)
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTemplates()