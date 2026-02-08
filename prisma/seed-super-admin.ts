/**
 * Super Admin Seed Script
 * Run this to create your first super admin account
 * 
 * Usage: npx ts-node prisma/seed-super-admin.ts
 * Or: npx tsx prisma/seed-super-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedSuperAdmin() {
  // ============================================
  // CONFIGURE YOUR SUPER ADMIN CREDENTIALS HERE
  // ============================================
  const SUPER_ADMIN_EMAIL = 'admin@schooloffice.com'
  const SUPER_ADMIN_PASSWORD = 'Admin@123456'  // Change this!
  // ============================================

  console.log('🔐 Creating Super Admin account...')
  console.log(`   Email: ${SUPER_ADMIN_EMAIL}`)

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: SUPER_ADMIN_EMAIL,
      role: 'SUPER_ADMIN',
    },
  })

  if (existingAdmin) {
    console.log('⚠️  Super Admin already exists with this email.')
    console.log('   If you need to reset the password, delete the user first.')
    return
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12)

  // Generate unique username for super admin
  const emailPrefix = SUPER_ADMIN_EMAIL.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  const username = `superadmin.${emailPrefix}`

  // Create the super admin user
  const superAdmin = await prisma.user.create({
    data: {
      email: SUPER_ADMIN_EMAIL,
      username,
      passwordHash,
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN'],
      activeRole: 'SUPER_ADMIN',
      schoolId: null,  // CRITICAL: Super Admin has no school
      isActive: true,
      failedAttempts: 0,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Super Admin created successfully!')
  console.log('')
  console.log('📋 Login Details:')
  console.log(`   URL: /admin/login`)
  console.log(`   Email: ${SUPER_ADMIN_EMAIL}`)
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Change the password after first login!')
  console.log(`   User ID: ${superAdmin.id}`)
}

seedSuperAdmin()
  .catch((error) => {
    console.error('❌ Error creating Super Admin:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
