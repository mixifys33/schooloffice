/**
 * Staff Onboarding Service
 * Handles mandatory staff registration and onboarding flow for school admins
 * Requirements: Check for required staff roles and guide registration process
 */

import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { Role, StaffRole, StaffStatus } from '@/types/enums'
import { auditService } from './audit.service'
import { getUserFriendlyError } from '@/lib/error-messages'
   
export interface RequiredStaffRole {
  role: StaffRole | Role
  title: string
  description: string
  isRequired: boolean
}

export interface StaffRegistrationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: StaffRole | Role
  employeeNumber: string
  department?: string
}

export interface OnboardingStatus {
  isComplete: boolean
  missingRoles: RequiredStaffRole[]
  registeredStaff: Array<{
    id: string
    name: string
    role: StaffRole | Role
    email: string
    phone: string
  }>
}

export interface StaffCredentials {
  name: string
  email: string
  phone: string
  password: string
  role: string
  schoolCode: string
  staffId?: string
  createdAt?: Date
}

/**
 * Required staff roles for a complete school setup
 */
const REQUIRED_STAFF_ROLES: RequiredStaffRole[] = [
  {
    role: StaffRole.DOS,
    title: 'Director of Studies (DOS)',
    description: 'Manages academic affairs, approves marks, and oversees curriculum',
    isRequired: true,
  },
  {
    role: StaffRole.BURSAR,
    title: 'Bursar',
    description: 'Handles financial operations, fee collection, and payment processing',
    isRequired: true,
  },
  {
    role: Role.DEPUTY,
    title: 'Deputy Head Teacher',
    description: 'Assists in school administration and academic oversight',
    isRequired: true,
  },
  {
    role: Role.TEACHER,
    title: 'Head Teacher',
    description: 'Senior teacher responsible for academic leadership',
    isRequired: false, // Optional but recommended
  },
]

export class StaffOnboardingService {
  /**
   * Check onboarding status for a school
   * Returns which required staff roles are missing
   */
  async checkOnboardingStatus(schoolId: string): Promise<OnboardingStatus> {
    // Get all staff members for the school
    const existingStaff = await prisma.staff.findMany({
      where: {
        schoolId,
        status: StaffStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    })

    // Map existing staff roles
    const existingRoles = new Set<string>()
    existingStaff.forEach(staff => {
      if (staff.primaryRole) {
        existingRoles.add(staff.primaryRole)
      }
      if (staff.role) {
        existingRoles.add(staff.role)
      }
      // Add secondary roles
      if (staff.secondaryRoles && Array.isArray(staff.secondaryRoles)) {
        staff.secondaryRoles.forEach(role => existingRoles.add(role))
      }
    })

    // Find missing required roles
    const missingRoles = REQUIRED_STAFF_ROLES.filter(requiredRole => {
      return requiredRole.isRequired && !existingRoles.has(requiredRole.role)
    })

    // Map registered staff
    const registeredStaff = existingStaff.map(staff => ({
      id: staff.id,
      name: `${staff.firstName} ${staff.lastName}`,
      role: (staff.primaryRole as StaffRole) || (staff.role as Role),
      email: staff.user?.email || staff.email || '',
      phone: staff.user?.phone || staff.phone || '',
    }))

    return {
      isComplete: missingRoles.length === 0,
      missingRoles,
      registeredStaff,
    }
  }

  /**
   * Register a new staff member with auto-generated credentials
   */
  async registerStaff(
    schoolId: string,
    staffData: StaffRegistrationData,
    registeredBy: string
  ): Promise<StaffCredentials> {
    try {
      // Generate a temporary password
      const tempPassword = this.generateTemporaryPassword()
      const passwordHash = await hashPassword(tempPassword)

      // Get school information
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { code: true, name: true },
      })

      if (!school) {
        throw new Error('School not found')
      }

      // Check if user already exists with this email or phone
      const existingUser = await prisma.user.findFirst({
        where: {
          schoolId,
          OR: [
            { email: staffData.email },
            { phone: staffData.phone },
          ],
        },
      })

      if (existingUser) {
        throw new Error('User with this email or phone already exists')
      }

      // Generate unique username based on actual names to avoid constraint violations
      const baseUsername = `${staffData.firstName.toLowerCase()}.${staffData.lastName.toLowerCase()}`.replace(/[^a-z.]/g, '')
      const schoolSuffix = schoolId.slice(-6) // Last 6 chars of schoolId for uniqueness
      const username = `${baseUsername}.${schoolSuffix}`

      // Map the staff role to a valid user role
      const userRole = this.mapStaffRoleToRole(staffData.role)

      // Create user account first
      const user = await prisma.user.create({
        data: {
          schoolId,
          email: staffData.email,
          phone: staffData.phone,
          username,
          passwordHash,
          role: userRole,
          roles: [userRole],
          isActive: true,
          forcePasswordReset: false, // No forced password reset on first login
        },
      })

      // Create staff profile with proper linking
      const staff = await prisma.staff.create({
        data: {
          userId: user.id, // Properly link to user
          schoolId,
          employeeNumber: staffData.employeeNumber,
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          email: staffData.email,
          phone: staffData.phone,
          role: userRole, // Use the mapped role for consistency
          primaryRole: Object.values(StaffRole).includes(staffData.role as StaffRole) 
            ? staffData.role as StaffRole 
            : null,
          secondaryRoles: [], // Initialize as empty array
          department: staffData.department,
          status: StaffStatus.ACTIVE,
          hireDate: new Date(),
        },
      })

      // Verify the staff-user relationship was created properly
      const verifyUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { staff: true }
      })

      if (!verifyUser?.staff || (Array.isArray(verifyUser.staff) && verifyUser.staff.length === 0)) {
        console.error('Staff-user relationship not created properly')
        throw new Error('Failed to create staff profile properly')
      }

      // Log the registration
      await auditService.log({
        schoolId,
        userId: registeredBy,
        action: 'staff_registered',
        resource: 'staff',
        resourceId: staff.id,
        details: {
          staffName: `${staffData.firstName} ${staffData.lastName}`,
          role: staffData.role,
          email: staffData.email,
          userId: user.id,
          staffId: staff.id,
        },
      })

      return {
        name: `${staffData.firstName} ${staffData.lastName}`,
        email: staffData.email,
        phone: staffData.phone,
        password: tempPassword,
        role: this.formatRoleForDisplay(staffData.role),
        schoolCode: school.code,
        staffId: staff.id,
        createdAt: new Date(),
      }
    } catch (error) {
      // Convert technical errors to user-friendly messages
      const userError = getUserFriendlyError(error)
      throw new Error(userError.message)
    }
  }

  /**
   * Get credentials for a staff member (for re-viewing/resending)
   */
  async getStaffCredentials(staffId: string, schoolId: string): Promise<StaffCredentials | null> {
    try {
      const staff = await prisma.staff.findFirst({
        where: {
          id: staffId,
          schoolId,
        },
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              role: true,
              forcePasswordReset: true,
            },
          },
        },
      })

      if (!staff || !staff.user.forcePasswordReset) {
        return null // Only return credentials if password hasn't been reset yet
      }

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { code: true },
      })

      if (!school) return null

      return {
        name: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
        phone: staff.phone || '',
        password: '••••••••••••', // Don't return actual password for security
        role: this.formatRoleForDisplay(staff.role as Role),
        schoolCode: school.code,
        staffId: staff.id,
        createdAt: staff.createdAt,
      }
    } catch (error) {
      console.error('Error getting staff credentials:', error)
      return null
    }
  }

  /**
   * Resend credentials to a staff member
   */
  async resendCredentials(staffId: string, schoolId: string): Promise<{ success: boolean; message: string }> {
    try {
      const staff = await prisma.staff.findFirst({
        where: {
          id: staffId,
          schoolId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              forcePasswordReset: true,
            },
          },
        },
      })

      if (!staff) {
        return { success: false, message: 'Staff member not found' }
      }

      if (!staff.user.forcePasswordReset) {
        return { success: false, message: 'Staff member has already changed their password' }
      }

      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { code: true, name: true },
      })

      if (!school) {
        return { success: false, message: 'School not found' }
      }

      // Generate new temporary password
      const newPassword = this.generateTemporaryPassword()
      const passwordHash = await hashPassword(newPassword)

      // Update user with new password
      await prisma.user.update({
        where: { id: staff.userId },
        data: { passwordHash },
      })

      // Create credentials object with complete information
      const credentials: StaffCredentials = {
        name: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
        phone: staff.phone || '',
        password: newPassword,
        role: this.formatRoleForDisplay((staff.primaryRole || staff.role) as StaffRole | Role),
        schoolCode: school.code,
        staffId: staff.id,
        createdAt: new Date(),
      }

      // Send credentials with improved template
      const result = await this.sendCredentials(credentials, school.name)

      // Log the credential resend
      await auditService.log({
        schoolId,
        userId: staff.userId,
        action: 'credentials_resent',
        resource: 'staff',
        resourceId: staff.id,
        details: {
          staffName: credentials.name,
          email: credentials.email,
          smsSuccess: result.smsSuccess,
          emailSuccess: result.emailSuccess,
        },
      })

      if (result.smsSuccess || result.emailSuccess) {
        return { 
          success: true, 
          message: `New credentials sent successfully via ${result.smsSuccess && result.emailSuccess ? 'SMS and email' : result.smsSuccess ? 'SMS' : 'email'}` 
        }
      } else {
        return { success: false, message: 'Failed to send credentials via SMS or email' }
      }
    } catch (error) {
      console.error('Error resending credentials:', error)
      const userError = getUserFriendlyError(error)
      return { success: false, message: userError.message }
    }
  }

  /**
   * Send credentials to staff member via SMS and email
   */
  async sendCredentials(
    credentials: StaffCredentials,
    schoolName: string
  ): Promise<{ smsSuccess: boolean; emailSuccess: boolean }> {
    // Get base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXTAUTH_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   'http://localhost:3000'
    const loginUrl = `${baseUrl}/login`
    
    const message = this.createCredentialsMessage(credentials, schoolName, loginUrl)
    
    let smsSuccess = false
    let emailSuccess = false

    // Send SMS
    try {
      console.log(`📱 Sending SMS credentials to ${credentials.phone}`)
      const smsResponse = await fetch(`${baseUrl}/api/sms/send-simple`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          to: credentials.phone,
          message: message.sms,
          type: 'STAFF_CREDENTIALS',
        }),
      })
      
      if (smsResponse.ok) {
        console.log('✅ SMS credentials sent successfully')
        smsSuccess = true
      } else {
        const errorText = await smsResponse.text()
        console.error('❌ SMS sending failed:', smsResponse.status, errorText)
      }
    } catch (error) {
      console.error('❌ Failed to send SMS credentials:', error)
    }

    // Send Email
    try {
      console.log(`📧 Sending email credentials to ${credentials.email}`)
      const emailResponse = await fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          to: credentials.email,
          subject: `Welcome to ${schoolName} - Your Staff Portal Access`,
          html: message.email,
          type: 'STAFF_CREDENTIALS',
        }),
      })
      
      if (emailResponse.ok) {
        console.log('✅ Email credentials sent successfully')
        emailSuccess = true
      } else {
        const errorText = await emailResponse.text()
        console.error('❌ Email sending failed:', emailResponse.status, errorText)
      }
    } catch (error) {
      console.error('❌ Failed to send email credentials:', error)
    }

    // Log the results
    console.log(`📊 Credential sending results: SMS: ${smsSuccess ? '✅' : '❌'}, Email: ${emailSuccess ? '✅' : '❌'}`)

    return { smsSuccess, emailSuccess }
  }

  /**
   * Map StaffRole to Role for user account creation
   */
  private mapStaffRoleToRole(staffRole: StaffRole | Role): Role {
    // If it's already a Role, return as is
    if (Object.values(Role).includes(staffRole as Role)) {
      return staffRole as Role
    }

    // Map StaffRole to Role
    const roleMapping: Record<StaffRole, Role> = {
      [StaffRole.DOS]: Role.TEACHER, // DOS is a specialized teacher role
      [StaffRole.BURSAR]: Role.ACCOUNTANT, // Bursar handles financial operations
      [StaffRole.CLASS_TEACHER]: Role.TEACHER,
      [StaffRole.HOSTEL_STAFF]: Role.TEACHER,
      [StaffRole.SUPPORT_STAFF]: Role.TEACHER,
    }

    return roleMapping[staffRole as StaffRole] || Role.TEACHER
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let password = ''
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 25)] // Uppercase
    password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 25)] // Lowercase
    password += '23456789'[Math.floor(Math.random() * 8)] // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)] // Special char
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Format role for display
   */
  private formatRoleForDisplay(role: StaffRole | Role): string {
    const roleMap: Record<string, string> = {
      [StaffRole.DOS]: 'Director of Studies',
      [StaffRole.BURSAR]: 'Bursar',
      [Role.DEPUTY]: 'Deputy Head Teacher',
      [Role.TEACHER]: 'Teacher',
      [Role.SCHOOL_ADMIN]: 'School Administrator',
      [Role.ACCOUNTANT]: 'Accountant',
    }
    
    return roleMap[role] || role.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Create credentials message for SMS and email
   */
  private createCredentialsMessage(
    credentials: StaffCredentials,
    schoolName: string,
    loginUrl: string
  ): { sms: string; email: string } {
    // Create a professional, informative SMS message under 156 characters
    const shortSchoolName = schoolName.length > 18 ? schoolName.substring(0, 15) + '...' : schoolName
    
    // Build the message with all essential information
    const sms = `🎓Welcome to ${shortSchoolName} Your Staff Access: Email: ${credentials.email}, Password: ${credentials.password}, School Code: ${credentials.schoolCode}. Login: ${loginUrl}`

    const email = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${schoolName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
                    
                    <!-- Hero Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                            <div style="background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                                🎓
                            </div>
                            <h1 style="color: white; margin: 0 0 10px; font-size: 32px; font-weight: 700;">Welcome Aboard!</h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px; font-weight: 500;">${schoolName}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px;">
                            
                            <!-- Welcome Message -->
                            <div style="margin-bottom: 35px;">
                                <h2 style="color: #1a202c; margin: 0 0 15px; font-size: 24px; font-weight: 600;">Hello ${credentials.name}! 👋</h2>
                                <p style="color: #4a5568; margin: 0; font-size: 16px; line-height: 1.6;">
                                    We're thrilled to have you join our team as a <strong style="color: #667eea;">${credentials.role}</strong>! 
                                    Your account has been created and you're all set to start making a difference in our students' lives.
                                </p>
                            </div>
                            
                            <!-- Credentials Card -->
                            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border: 2px solid #e2e8f0;">
                                <div style="display: flex; align-items: center; margin-bottom: 25px;">
                                    <span style="font-size: 28px; margin-right: 12px;">🔐</span>
                                    <h3 style="color: #2b6cb0; margin: 0; font-size: 20px; font-weight: 600;">Your Login Credentials</h3>
                                </div>
                                
                                <table width="100%" cellpadding="8" cellspacing="0">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                            <strong style="color: #4a5568; font-size: 14px;">📧 Email</strong>
                                        </td>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                            <code style="background: white; padding: 8px 12px; border-radius: 6px; color: #2d3748; font-size: 14px; border: 1px solid #cbd5e0;">${credentials.email}</code>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                            <strong style="color: #4a5568; font-size: 14px;">📱 Phone Number</strong>
                                        </td>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                            <code style="background: white; padding: 8px 12px; border-radius: 6px; color: #2d3748; font-size: 14px; border: 1px solid #cbd5e0;">${credentials.phone}</code>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                            <strong style="color: #4a5568; font-size: 14px;">🏫 School Code</strong>
                                        </td>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                            <code style="background: white; padding: 8px 12px; border-radius: 6px; color: #2d3748; font-size: 14px; border: 1px solid #cbd5e0;">${credentials.schoolCode}</code>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0;">
                                            <strong style="color: #4a5568; font-size: 14px;">🔑 Temporary Password</strong>
                                        </td>
                                        <td style="padding: 12px 0; text-align: right;">
                                            <code style="background: #fed7d7; padding: 8px 12px; border-radius: 6px; color: #c53030; font-size: 14px; font-weight: 600; border: 1px solid #fc8181;">${credentials.password}</code>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); transition: all 0.3s;">
                                    🚀 Access Your Portal
                                </a>
                            </div>
                            
                            <!-- Quick Start Guide -->
                            <div style="background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%); border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #48bb78;">
                                <h4 style="color: #2f855a; margin: 0 0 15px; font-size: 18px; font-weight: 600;">
                                    <span style="font-size: 20px; margin-right: 8px;">✨</span>Quick Start Guide
                                </h4>
                                <ol style="color: #276749; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li style="margin-bottom: 8px;">Click the <strong>"Access Your Portal"</strong> button above</li>
                                    <li style="margin-bottom: 8px;">Enter your <strong>School Code</strong> on the login page</li>
                                    <li style="margin-bottom: 8px;">Sign in with your <strong>email</strong> and <strong>temporary password</strong></li>
                                    <li style="margin-bottom: 8px;">Create a <strong>strong, unique password</strong> (required on first login)</li>
                                    <li>Complete your <strong>profile</strong> and start exploring!</li>
                                </ol>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%); border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #f6ad55;">
                                <h4 style="color: #c05621; margin: 0 0 15px; font-size: 18px; font-weight: 600;">
                                    <span style="font-size: 20px; margin-right: 8px;">🔒</span>Security First
                                </h4>
                                <ul style="color: #744210; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li style="margin-bottom: 8px;"><strong>Change your password</strong> immediately after first login</li>
                                    <li style="margin-bottom: 8px;"><strong>Never share</strong> your credentials with anyone</li>
                                    <li style="margin-bottom: 8px;"><strong>Always log out</strong> when you're done</li>
                                    <li>Contact IT support if you notice anything suspicious</li>
                                </ul>
                            </div>
                            
                            <!-- Motivational Quote -->
                            <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%); border-radius: 12px; margin: 30px 0;">
                                <p style="color: #234e52; font-size: 18px; font-style: italic; margin: 0 0 10px; line-height: 1.6;">
                                    "Education is the most powerful weapon which you can use to change the world."
                                </p>
                                <p style="color: #2c7a7b; font-size: 14px; font-weight: 600; margin: 0;">— Nelson Mandela</p>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f7fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #718096; margin: 0 0 15px; font-size: 14px; text-align: center;">
                                <strong>Login URL:</strong> <a href="${loginUrl}" style="color: #667eea; text-decoration: none;">${loginUrl}</a>
                            </p>
                            <p style="color: #718096; margin: 0 0 15px; font-size: 14px; text-align: center;">
                                Need help? Contact your school administrator or IT support team.
                            </p>
                            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #a0aec0; margin: 0; font-size: 12px;">
                                    This email contains sensitive information. Please handle it securely and delete after setup.
                                </p>
                                <p style="color: #cbd5e0; margin: 10px 0 0; font-size: 11px;">
                                    © ${new Date().getFullYear()} ${schoolName}. All rights reserved.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

    return { sms, email }
  }

  /**
   * Get all required staff roles for display
   */
  getRequiredStaffRoles(): RequiredStaffRole[] {
    return REQUIRED_STAFF_ROLES
  }

  /**
   * Validate staff registration data
   */
  validateStaffData(data: StaffRegistrationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.firstName?.trim()) {
      errors.push('First name is required')
    }

    if (!data.lastName?.trim()) {
      errors.push('Last name is required')
    }

    if (!data.email?.trim()) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format')
    }

    if (!data.phone?.trim()) {
      errors.push('Phone number is required')
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(data.phone)) {
      errors.push('Invalid phone number format')
    }

    if (!data.role) {
      errors.push('Role is required')
    }

    if (!data.employeeNumber?.trim()) {
      errors.push('Employee number is required')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Export singleton instance
export const staffOnboardingService = new StaffOnboardingService()