/**
 * SMS Center API Route
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * - Display SMS balance, messages sent this term, message templates
 * - Send SMS with unpaid student exclusion
 * - Track SMS balance
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { MessageChannel, MessageStatus, MessageTemplateType } from '@/types/enums'

/**
 * GET /api/sms
 * Get SMS center dashboard data
 * Requirement 8.1: Display SMS balance, messages sent this term, message templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    // Get school info for SMS budget
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        smsBudgetPerTerm: true,
        isActive: true,
        licenseType: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        academicYear: true,
      },
    })

    // Get SMS budget usage for current term
    let budgetUsage = null
    if (currentTerm) {
      budgetUsage = await prisma.sMSBudgetUsage.findUnique({
        where: {
          schoolId_termId: {
            schoolId,
            termId: currentTerm.id,
          },
        },
      })
    }

    // Get messages sent this term
    const termStartDate = currentTerm?.startDate || new Date(new Date().getFullYear(), 0, 1)
    const termEndDate = currentTerm?.endDate || new Date()

    const messagesSentThisTerm = await prisma.message.count({
      where: {
        schoolId,
        channel: MessageChannel.SMS,
        createdAt: {
          gte: termStartDate,
          lte: termEndDate,
        },
        status: {
          in: [MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ],
        },
      },
    })

    // Get message templates
    const templates = await prisma.messageTemplate.findMany({
      where: {
        schoolId,
        channel: MessageChannel.SMS,
        isActive: true,
      },
      orderBy: { type: 'asc' },
    })

    // Get recent messages
    const recentMessages = await prisma.message.findMany({
      where: {
        schoolId,
        channel: MessageChannel.SMS,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    })

    // Get delivery statistics for the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const deliveryStats = await prisma.message.groupBy({
      by: ['status'],
      where: {
        schoolId,
        channel: MessageChannel.SMS,
        createdAt: { gte: oneDayAgo },
      },
      _count: true,
    })

    const deliveryBreakdown = {
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      total: 0,
    }

    for (const stat of deliveryStats) {
      const count = stat._count
      deliveryBreakdown.total += count
      
      switch (stat.status) {
        case 'QUEUED':
          deliveryBreakdown.queued = count
          break
        case 'SENT':
          deliveryBreakdown.sent = count
          break
        case 'DELIVERED':
          deliveryBreakdown.delivered = count
          break
        case 'FAILED':
          deliveryBreakdown.failed = count
          break
      }
    }

    // Calculate delivery rate
    const deliveryRate = deliveryBreakdown.total > 0
      ? Math.round((deliveryBreakdown.delivered / deliveryBreakdown.total) * 100)
      : 0

    // Calculate SMS balance
    const smsBalance = budgetUsage 
      ? Math.max(0, budgetUsage.totalBudget - budgetUsage.usedAmount)
      : school.smsBudgetPerTerm

    // Check if SMS is paused due to budget
    const isPaused = budgetUsage?.isPaused || false

    // Check if school subscription is suspended (Requirement 8.4)
    const isSchoolSuspended = !school.isActive

    return NextResponse.json({
      smsBalance: Math.floor(smsBalance / 25), // Convert UGX to SMS count (25 UGX per SMS)
      smsBudget: Math.floor(school.smsBudgetPerTerm / 25),
      messagesSentThisTerm,
      usedAmount: budgetUsage?.usedAmount || 0,
      totalBudget: budgetUsage?.totalBudget || school.smsBudgetPerTerm,
      isPaused,
      isSchoolSuspended,
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
      } : null,
      templates: templates.map(t => ({
        id: t.id,
        type: t.type,
        content: t.content,
        isActive: t.isActive,
      })),
      recentMessages: recentMessages.map(m => ({
        id: m.id,
        studentName: m.student ? `${m.student.firstName} ${m.student.lastName}` : 'Unknown',
        content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        status: m.status,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
      })),
      // Delivery statistics (last 24 hours)
      deliveryStats: {
        ...deliveryBreakdown,
        deliveryRate,
      },
    })
  } catch (error) {
    console.error('Error fetching SMS center data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS center data' },
      { status: 500 }
    )
  }
}
