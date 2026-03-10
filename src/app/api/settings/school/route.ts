import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get the first school record (assuming single school setup)
    const school = await prisma.school.findFirst({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true
      }
    })

    if (!school) {
      return NextResponse.json({
        school: {
          name: 'School Name',
          address: '',
          phone: '',
          email: ''
        }
      })
    }

    return NextResponse.json({ school })
  } catch (error) {
    console.error('Error fetching school settings:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch school settings',
        school: {
          name: 'School Name',
          address: '',
          phone: '',
          email: ''
        }
      },
      { status: 500 }
    )
  }
}