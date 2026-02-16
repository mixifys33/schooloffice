/**
 * Diagnostic Script: Class Teacher Data Investigation
 * Checks database for streams, subjects, and staff assignments
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseClassTeacherData() {
  try {
    console.log('🔍 Starting Class Teacher Data Diagnosis...\n')

    // 1. Check for staff records
    console.log('📋 Step 1: Checking Staff Records')
    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        firstName