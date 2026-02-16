/**
 * Admin Profile API Route
 * Handles fetching and updating admin profile information with security verification
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user profile with school information
    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        schoolId: true,
        createdAt: true,
        lastLogin: true,
        school: {
          select: {
            name: true,
            code: true,
          }
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword, name, phone } = body

    // Validate current password is provided
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }

    // Fetch current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        schoolId: true,
        passwordHash: true,
        createdAt: true,
        lastLogin: true,
        school: {
          select: {
            name: true,
            code: true,
          }
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    const staffUpdateData: any = {}

    // Update profile fields if provided
    if (name !== undefined && name !== `${user.staff?.firstName} ${user.staff?.lastName}`) {
      // Split name into firstName and lastName
      const nameParts = name.trim().split(' ')
      staffUpdateData.firstName = nameParts[0]
      staffUpdateData.lastName = nameParts.slice(1).join(' ') || nameParts[0]
    }

    if (phone !== undefined && phone !== user.phone) {
      updateData.phone = phone.trim() || null
      // Also update staff phone if staff record exists
      if (user.staff) {
        staffUpdateData.phone = phone.trim() || null
      }
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 })
      }
      
      // Hash new password
      const saltRounds = 12
      updateData.passwordHash = await bcrypt.hash(newPassword, saltRounds)
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0 && Object.keys(staffUpdateData).length === 0) {
      return NextResponse.json({ 
        profile: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          schoolId: user.schoolId,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          school: user.school,
          staff: user.staff,
        }
      })
    }

    // Update user and staff in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if there are user changes
      let updatedUser = user
      if (Object.keys(updateData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: session.user.id },
          data: updateData,
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            schoolId: true,
            createdAt: true,
            lastLogin: true,
            school: {
              select: {
                name: true,
                code: true,
              }
            },
            staff: {
              select: {
                firstName: true,
                lastName: true,
                employeeNumber: true,
              }
            }
          }
        })
      }

      // Update staff if there are staff changes
      if (Object.keys(staffUpdateData).length > 0 && user.staff) {
        await tx.staff.update({
          where: { userId: session.user.id },
          data: staffUpdateData,
        })
        
        // Refetch to get updated staff data
        updatedUser = await tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            schoolId: true,
            createdAt: true,
            lastLogin: true,
            school: {
              select: {
                name: true,
                code: true,
              }
            },
            staff: {
              select: {
                firstName: true,
                lastName: true,
                employeeNumber: true,
              }
            }
          }
        })
      }

      return updatedUser
    })

    return NextResponse.json({ profile: result })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}