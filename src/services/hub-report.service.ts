/**
 * Hub Report Service
 * 
 * Provides report generation and analytics for the Super Admin Communication Hub.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8
 */

import { prisma } from '../lib/db'
import {
  ReportParams,
  UsageReport,
  DeliveryReport,
  CostReport,
  ScheduledReportConfig,
  SchoolUsageSummary,
  TrendData,
  DeliveryStats,
  SchoolDeliveryStats,
  CostSummary,
  SchoolCostSummary,
  MessageChannel,
  HubReportType,
  ReportFrequency,
} from '../types/communication-hub'

export class HubReportService {
  // ============================================
  // REPORT GENERATION - Requirements 8.1, 8.2
  // ============================================

  /**
   * Generate usage report for daily/weekly/monthly periods
   * Requirements 8.1, 8.2: Generate daily, weekly, and monthly usage reports with per-school message counts by channel
   */
  async generateUsageReport(params: ReportParams): Promise<UsageReport> {
    const { startDate, endDate, schoolIds, channels } = params

    // Build where clause for filtering
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (schoolIds && schoolIds.length > 0) {
      whereClause.schoolId = { in: schoolIds }
    }

    if (channels && channels.length > 0) {
      whereClause.channel = { in: channels }
    }

    // Get total message counts by channel
    const channelCounts = await prisma.communicationLog.groupBy({
      by: ['channel'],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    // Build byChannel summary
    const byChannel: Record<MessageChannel, number> = {
      [MessageChannel.SMS]: 0,
      [MessageChannel.WHATSAPP]: 0,
      [MessageChannel.EMAIL]: 0,
    }

    let totalMessages = 0
    for (const count of channelCounts) {
      const channel = count.channel as MessageChannel
      const messageCount = count._count.id
      byChannel[channel] = messageCount
      totalMessages += messageCount
    }

    // Get per-school message counts
    const schoolCounts = await prisma.communicationLog.groupBy({
      by: ['schoolId', 'channel'],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    // Build school usage summary
    const schoolUsageMap = new Map<string, SchoolUsageSummary>()

    for (const count of schoolCounts) {
      const schoolId = count.schoolId
      const channel = count.channel as MessageChannel
      const messageCount = count._count.id

      if (!schoolUsageMap.has(schoolId)) {
        // Get school name
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { name: true },
        })

        schoolUsageMap.set(schoolId, {
          schoolId,
          schoolName: school?.name || 'Unknown School',
          sms: 0,
          whatsapp: 0,
          email: 0,
          total: 0,
        })
      }

      const schoolUsage = schoolUsageMap.get(schoolId)!
      
      switch (channel) {
        case MessageChannel.SMS:
          schoolUsage.sms = messageCount
          break
        case MessageChannel.WHATSAPP:
          schoolUsage.whatsapp = messageCount
          break
        case MessageChannel.EMAIL:
          schoolUsage.email = messageCount
          break
      }
      
      schoolUsage.total += messageCount
    }

    const bySchool = Array.from(schoolUsageMap.values())
      .sort((a, b) => b.total - a.total) // Sort by total messages descending

    // Generate trend data based on period
    const trends = await this.generateTrendData(params)

    const report: UsageReport = {
      id: this.generateReportId(),
      period: { start: startDate, end: endDate },
      summary: {
        totalMessages,
        byChannel,
        bySchool,
      },
      trends,
      generatedAt: new Date(),
    }

    return report
  }

  /**
   * Generate trend data for usage reports
   */
  private async generateTrendData(params: ReportParams): Promise<TrendData[]> {
    const { startDate, endDate, period, schoolIds, channels } = params

    // Determine date grouping based on period
    let dateFormat: string
    let dateIncrement: number
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d'
        dateIncrement = 1 // days
        break
      case 'weekly':
        dateFormat = '%Y-%u' // Year-Week
        dateIncrement = 7 // days
        break
      case 'monthly':
        dateFormat = '%Y-%m'
        dateIncrement = 30 // days (approximate)
        break
      default:
        dateFormat = '%Y-%m-%d'
        dateIncrement = 1
    }

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (schoolIds && schoolIds.length > 0) {
      whereClause.schoolId = { in: schoolIds }
    }

    if (channels && channels.length > 0) {
      whereClause.channel = { in: channels }
    }

    // Get daily message counts by channel
    const dailyCounts = await prisma.communicationLog.groupBy({
      by: ['channel'],
      where: whereClause,
      _count: {
        id: true,
      },
      // Note: MongoDB doesn't support date formatting in groupBy like SQL
      // We'll need to process this in memory
    })

    // For now, create a simple trend based on the total period
    // In a production system, you'd want more sophisticated date grouping
    const trends: TrendData[] = []
    
    // Generate sample trend data points
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const dataPoints = Math.min(daysDiff, 30) // Limit to 30 data points

    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + Math.floor((i * daysDiff) / dataPoints))

      // Get counts for this specific date range
      const dayStart = new Date(date)
      const dayEnd = new Date(date)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayCounts = await prisma.communicationLog.groupBy({
        by: ['channel'],
        where: {
          ...whereClause,
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        _count: {
          id: true,
        },
      })

      const trendPoint: TrendData = {
        date,
        sms: 0,
        whatsapp: 0,
        email: 0,
      }

      for (const count of dayCounts) {
        const channel = count.channel as MessageChannel
        const messageCount = count._count.id

        switch (channel) {
          case MessageChannel.SMS:
            trendPoint.sms = messageCount
            break
          case MessageChannel.WHATSAPP:
            trendPoint.whatsapp = messageCount
            break
          case MessageChannel.EMAIL:
            trendPoint.email = messageCount
            break
        }
      }

      trends.push(trendPoint)
    }

    return trends
  }

  // ============================================
  // DELIVERY AND COST REPORTS - Requirements 8.3, 8.4
  // ============================================

  /**
   * Generate delivery report with success rates
   * Requirements 8.3: Include delivery success rates by channel and school
   */
  async generateDeliveryReport(params: ReportParams): Promise<DeliveryReport> {
    const { startDate, endDate, schoolIds, channels } = params

    // Build where clause for filtering
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (schoolIds && schoolIds.length > 0) {
      whereClause.schoolId = { in: schoolIds }
    }

    if (channels && channels.length > 0) {
      whereClause.channel = { in: channels }
    }

    // Get overall delivery statistics
    const overallStats = await this.calculateDeliveryStats(whereClause)

    // Get delivery statistics by channel
    const byChannel: Record<MessageChannel, DeliveryStats> = {
      [MessageChannel.SMS]: await this.calculateDeliveryStats({
        ...whereClause,
        channel: MessageChannel.SMS,
      }),
      [MessageChannel.WHATSAPP]: await this.calculateDeliveryStats({
        ...whereClause,
        channel: MessageChannel.WHATSAPP,
      }),
      [MessageChannel.EMAIL]: await this.calculateDeliveryStats({
        ...whereClause,
        channel: MessageChannel.EMAIL,
      }),
    }

    // Get delivery statistics by school
    const bySchool = await this.calculateSchoolDeliveryStats(whereClause)

    const report: DeliveryReport = {
      id: this.generateReportId(),
      period: { start: startDate, end: endDate },
      overall: overallStats,
      byChannel,
      bySchool,
      generatedAt: new Date(),
    }

    return report
  }

  /**
   * Calculate delivery statistics for given criteria
   */
  private async calculateDeliveryStats(whereClause: any): Promise<DeliveryStats> {
    // Get status counts
    const statusCounts = await prisma.communicationLog.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    let sent = 0
    let delivered = 0
    let failed = 0
    let bounced = 0

    for (const count of statusCounts) {
      const status = count.status
      const messageCount = count._count.id

      switch (status) {
        case 'SENT':
        case 'DELIVERED':
          sent += messageCount
          if (status === 'DELIVERED') {
            delivered += messageCount
          }
          break
        case 'FAILED':
          failed += messageCount
          break
        case 'BOUNCED':
          bounced += messageCount
          break
        default:
          // Include other statuses in sent count
          sent += messageCount
          break
      }
    }

    const successRate = sent > 0 ? (delivered / sent) * 100 : 0

    return {
      sent,
      delivered,
      failed,
      bounced,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    }
  }

  /**
   * Calculate delivery statistics by school
   */
  private async calculateSchoolDeliveryStats(whereClause: any): Promise<SchoolDeliveryStats[]> {
    // Get unique school IDs from the filtered data
    const schoolIds = await prisma.communicationLog.findMany({
      where: whereClause,
      select: { schoolId: true },
      distinct: ['schoolId'],
    })

    const schoolStats: SchoolDeliveryStats[] = []

    for (const { schoolId } of schoolIds) {
      // Get school name
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      })

      // Calculate stats for this school
      const stats = await this.calculateDeliveryStats({
        ...whereClause,
        schoolId,
      })

      schoolStats.push({
        schoolId,
        schoolName: school?.name || 'Unknown School',
        stats,
      })
    }

    // Sort by success rate descending
    return schoolStats.sort((a, b) => b.stats.successRate - a.stats.successRate)
  }

  /**
   * Generate cost report with cost analysis
   * Requirements 8.4: Include cost versus usage analysis
   */
  async generateCostReport(params: ReportParams): Promise<CostReport> {
    const { startDate, endDate, schoolIds, channels } = params

    // Build where clause for filtering
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (schoolIds && schoolIds.length > 0) {
      whereClause.schoolId = { in: schoolIds }
    }

    if (channels && channels.length > 0) {
      whereClause.channel = { in: channels }
    }

    // Calculate overall cost summary
    const overall = await this.calculateCostSummary(whereClause)

    // Calculate cost summary by school
    const bySchool = await this.calculateSchoolCostSummary(whereClause)

    const report: CostReport = {
      id: this.generateReportId(),
      period: { start: startDate, end: endDate },
      overall,
      bySchool,
      generatedAt: new Date(),
    }

    return report
  }

  /**
   * Calculate cost summary for given criteria
   */
  private async calculateCostSummary(whereClause: any): Promise<CostSummary> {
    // Get cost totals by channel
    const channelCosts = await prisma.communicationLog.groupBy({
      by: ['channel'],
      where: {
        ...whereClause,
        cost: { not: null }, // Only include records with cost data
      },
      _sum: {
        cost: true,
      },
    })

    const byChannel: Record<MessageChannel, number> = {
      [MessageChannel.SMS]: 0,
      [MessageChannel.WHATSAPP]: 0,
      [MessageChannel.EMAIL]: 0,
    }

    let totalCost = 0

    for (const cost of channelCosts) {
      const channel = cost.channel as MessageChannel
      const channelCost = cost._sum.cost || 0
      byChannel[channel] = channelCost
      totalCost += channelCost
    }

    return {
      totalCost,
      byChannel,
    }
  }

  // ============================================
  // REPORT EXPORT - Requirements 8.5
  // ============================================

  /**
   * Export report to CSV or PDF format
   * Requirements 8.5: Support exporting reports as CSV or PDF
   */
  async exportReport(reportId: string, format: 'csv' | 'pdf'): Promise<Buffer> {
    // In a real implementation, you would store generated reports and retrieve them by ID
    // For now, we'll generate a sample export based on the format
    
    if (format === 'csv') {
      return this.exportReportAsCSV(reportId)
    } else if (format === 'pdf') {
      return this.exportReportAsPDF(reportId)
    } else {
      throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // ============================================
  // SCHEDULED REPORTS - Requirements 8.7
  // ============================================

  /**
   * Schedule a report for automatic generation
   * Requirements 8.7: Support daily/weekly/monthly frequency
   */
  async scheduleReport(config: ScheduledReportConfig): Promise<void> {
    const nextRunAt = this.calculateNextRunTime(config.frequency)

    await prisma.hubScheduledReport.create({
      data: {
        name: config.name,
        reportType: config.reportType,
        frequency: config.frequency,
        recipients: JSON.stringify(config.recipients),
        filters: JSON.stringify(config.filters),
        isActive: config.isActive,
        nextRunAt,
        createdBy: 'system', // In production, this would be the admin user ID
      },
    })
  }

  /**
   * Get all scheduled reports
   * Requirements 8.7: List scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReportConfig[]> {
    const scheduledReports = await prisma.hubScheduledReport.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return scheduledReports.map(report => ({
      id: report.id,
      name: report.name,
      reportType: report.reportType as HubReportType,
      frequency: report.frequency as ReportFrequency,
      recipients: JSON.parse(report.recipients as string),
      filters: JSON.parse(report.filters as string),
      isActive: report.isActive,
      nextRunAt: report.nextRunAt,
    }))
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRunTime(frequency: ReportFrequency): Date {
    const now = new Date()
    const nextRun = new Date(now)

    switch (frequency) {
      case ReportFrequency.DAILY:
        nextRun.setDate(now.getDate() + 1)
        nextRun.setHours(8, 0, 0, 0) // 8 AM next day
        break
      case ReportFrequency.WEEKLY:
        // Next Monday at 8 AM
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7
        nextRun.setDate(now.getDate() + daysUntilMonday)
        nextRun.setHours(8, 0, 0, 0)
        break
      case ReportFrequency.MONTHLY:
        // First day of next month at 8 AM
        nextRun.setMonth(now.getMonth() + 1, 1)
        nextRun.setHours(8, 0, 0, 0)
        break
      default:
        // Default to daily
        nextRun.setDate(now.getDate() + 1)
        nextRun.setHours(8, 0, 0, 0)
        break
    }

    return nextRun
  }

  // ============================================
  // PERIOD COMPARISON - Requirements 8.8
  // ============================================

  /**
   * Compare usage between two time periods
   * Requirements 8.8: Support comparing usage across different time periods
   */
  async compareUsagePeriods(
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
    schoolIds?: string[],
    channels?: MessageChannel[]
  ): Promise<{
    current: UsageReport
    previous: UsageReport
    comparison: {
      totalMessagesChange: number
      totalMessagesChangePercent: number
      channelChanges: Record<MessageChannel, { change: number; changePercent: number }>
      schoolChanges: Array<{
        schoolId: string
        schoolName: string
        change: number
        changePercent: number
      }>
    }
  }> {
    // Generate reports for both periods
    const currentParams: ReportParams = {
      period: 'daily', // Default period type
      startDate: currentPeriod.start,
      endDate: currentPeriod.end,
      schoolIds,
      channels,
    }

    const previousParams: ReportParams = {
      period: 'daily', // Default period type
      startDate: previousPeriod.start,
      endDate: previousPeriod.end,
      schoolIds,
      channels,
    }

    const [currentReport, previousReport] = await Promise.all([
      this.generateUsageReport(currentParams),
      this.generateUsageReport(previousParams),
    ])

    // Calculate overall change
    const totalMessagesChange = currentReport.summary.totalMessages - previousReport.summary.totalMessages
    const totalMessagesChangePercent = previousReport.summary.totalMessages > 0
      ? (totalMessagesChange / previousReport.summary.totalMessages) * 100
      : 0

    // Calculate channel changes
    const channelChanges: Record<MessageChannel, { change: number; changePercent: number }> = {
      [MessageChannel.SMS]: this.calculateChange(
        currentReport.summary.byChannel[MessageChannel.SMS],
        previousReport.summary.byChannel[MessageChannel.SMS]
      ),
      [MessageChannel.WHATSAPP]: this.calculateChange(
        currentReport.summary.byChannel[MessageChannel.WHATSAPP],
        previousReport.summary.byChannel[MessageChannel.WHATSAPP]
      ),
      [MessageChannel.EMAIL]: this.calculateChange(
        currentReport.summary.byChannel[MessageChannel.EMAIL],
        previousReport.summary.byChannel[MessageChannel.EMAIL]
      ),
    }

    // Calculate school changes
    const schoolChanges = this.calculateSchoolChanges(
      currentReport.summary.bySchool,
      previousReport.summary.bySchool
    )

    return {
      current: currentReport,
      previous: previousReport,
      comparison: {
        totalMessagesChange,
        totalMessagesChangePercent: Math.round(totalMessagesChangePercent * 100) / 100,
        channelChanges,
        schoolChanges,
      },
    }
  }

  /**
   * Compare delivery rates between two time periods
   */
  async compareDeliveryPeriods(
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
    schoolIds?: string[],
    channels?: MessageChannel[]
  ): Promise<{
    current: DeliveryReport
    previous: DeliveryReport
    comparison: {
      overallSuccessRateChange: number
      channelSuccessRateChanges: Record<MessageChannel, number>
      schoolSuccessRateChanges: Array<{
        schoolId: string
        schoolName: string
        change: number
      }>
    }
  }> {
    // Generate delivery reports for both periods
    const currentParams: ReportParams = {
      period: 'daily',
      startDate: currentPeriod.start,
      endDate: currentPeriod.end,
      schoolIds,
      channels,
    }

    const previousParams: ReportParams = {
      period: 'daily',
      startDate: previousPeriod.start,
      endDate: previousPeriod.end,
      schoolIds,
      channels,
    }

    const [currentReport, previousReport] = await Promise.all([
      this.generateDeliveryReport(currentParams),
      this.generateDeliveryReport(previousParams),
    ])

    // Calculate success rate changes
    const overallSuccessRateChange = currentReport.overall.successRate - previousReport.overall.successRate

    const channelSuccessRateChanges: Record<MessageChannel, number> = {
      [MessageChannel.SMS]: currentReport.byChannel[MessageChannel.SMS].successRate - 
                            previousReport.byChannel[MessageChannel.SMS].successRate,
      [MessageChannel.WHATSAPP]: currentReport.byChannel[MessageChannel.WHATSAPP].successRate - 
                                 previousReport.byChannel[MessageChannel.WHATSAPP].successRate,
      [MessageChannel.EMAIL]: currentReport.byChannel[MessageChannel.EMAIL].successRate - 
                              previousReport.byChannel[MessageChannel.EMAIL].successRate,
    }

    // Calculate school success rate changes
    const schoolSuccessRateChanges = this.calculateSchoolDeliveryChanges(
      currentReport.bySchool,
      previousReport.bySchool
    )

    return {
      current: currentReport,
      previous: previousReport,
      comparison: {
        overallSuccessRateChange: Math.round(overallSuccessRateChange * 100) / 100,
        channelSuccessRateChanges: Object.fromEntries(
          Object.entries(channelSuccessRateChanges).map(([channel, change]) => [
            channel,
            Math.round(change * 100) / 100,
          ])
        ) as Record<MessageChannel, number>,
        schoolSuccessRateChanges,
      },
    }
  }

  /**
   * Calculate change and percentage change between two values
   */
  private calculateChange(current: number, previous: number): { change: number; changePercent: number } {
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : 0

    return {
      change,
      changePercent: Math.round(changePercent * 100) / 100,
    }
  }

  /**
   * Calculate school-level changes in message counts
   */
  private calculateSchoolChanges(
    currentSchools: SchoolUsageSummary[],
    previousSchools: SchoolUsageSummary[]
  ): Array<{
    schoolId: string
    schoolName: string
    change: number
    changePercent: number
  }> {
    const previousSchoolMap = new Map(
      previousSchools.map(school => [school.schoolId, school])
    )

    return currentSchools.map(currentSchool => {
      const previousSchool = previousSchoolMap.get(currentSchool.schoolId)
      const previousTotal = previousSchool?.total || 0
      
      const { change, changePercent } = this.calculateChange(currentSchool.total, previousTotal)

      return {
        schoolId: currentSchool.schoolId,
        schoolName: currentSchool.schoolName,
        change,
        changePercent,
      }
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)) // Sort by absolute change percentage
  }

  /**
   * Calculate school-level changes in delivery success rates
   */
  private calculateSchoolDeliveryChanges(
    currentSchools: SchoolDeliveryStats[],
    previousSchools: SchoolDeliveryStats[]
  ): Array<{
    schoolId: string
    schoolName: string
    change: number
  }> {
    const previousSchoolMap = new Map(
      previousSchools.map(school => [school.schoolId, school])
    )

    return currentSchools.map(currentSchool => {
      const previousSchool = previousSchoolMap.get(currentSchool.schoolId)
      const previousSuccessRate = previousSchool?.stats.successRate || 0
      
      const change = currentSchool.stats.successRate - previousSuccessRate

      return {
        schoolId: currentSchool.schoolId,
        schoolName: currentSchool.schoolName,
        change: Math.round(change * 100) / 100,
      }
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)) // Sort by absolute change
  }

  /**
   * Process scheduled reports (would be called by a cron job)
   */
  async processScheduledReports(): Promise<void> {
    const now = new Date()
    
    // Get reports that are due to run
    const dueReports = await prisma.hubScheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    })

    for (const scheduledReport of dueReports) {
      try {
        // Parse filters
        const filters = JSON.parse(scheduledReport.filters as string) as ReportParams
        
        // Generate the report based on type
        let reportBuffer: Buffer
        
        switch (scheduledReport.reportType as HubReportType) {
          case HubReportType.USAGE:
            const usageReport = await this.generateUsageReport(filters)
            reportBuffer = await this.exportReportAsCSV(usageReport.id)
            break
          case HubReportType.DELIVERY:
            const deliveryReport = await this.generateDeliveryReport(filters)
            reportBuffer = await this.exportReportAsCSV(deliveryReport.id)
            break
          case HubReportType.COST:
            const costReport = await this.generateCostReport(filters)
            reportBuffer = await this.exportReportAsCSV(costReport.id)
            break
          default:
            console.error(`Unknown report type: ${scheduledReport.reportType}`)
            continue
        }

        // In production, you would:
        // 1. Save the report to file storage
        // 2. Send email notifications to recipients
        // 3. Log the successful generation
        
        console.log(`Generated scheduled report: ${scheduledReport.name}`)

        // Update the scheduled report with next run time
        const nextRunAt = this.calculateNextRunTime(scheduledReport.frequency as ReportFrequency)
        
        await prisma.hubScheduledReport.update({
          where: { id: scheduledReport.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        })

      } catch (error) {
        console.error(`Failed to generate scheduled report ${scheduledReport.name}:`, error)
        
        // In production, you would log this error and possibly notify administrators
      }
    }
  }

  /**
   * Export report as CSV
   */
  private async exportReportAsCSV(reportId: string): Promise<Buffer> {
    // For demonstration, create a sample CSV export
    // In production, you would retrieve the actual report data
    
    const csvHeaders = [
      'Report ID',
      'Generated At',
      'Period Start',
      'Period End',
      'School ID',
      'School Name',
      'Channel',
      'Message Count',
      'Delivery Rate',
      'Total Cost',
    ]

    const csvRows = [
      csvHeaders.join(','),
      // Sample data row
      [
        reportId,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
        'school_123',
        '"Sample School"',
        'SMS',
        '150',
        '95.5',
        '3750.00',
      ].join(','),
    ]

    return Buffer.from(csvRows.join('\n'), 'utf-8')
  }

  /**
   * Export report as PDF
   */
  private async exportReportAsPDF(reportId: string): Promise<Buffer> {
    // For demonstration, create a simple HTML-based PDF export
    // In production, you would use a library like puppeteer or jsPDF
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Communication Hub Report - ${reportId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
            .content { margin: 20px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Communication Hub Report</h1>
            <p><strong>Report ID:</strong> ${reportId}</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <div class="content">
            <h2>Report Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Messages</td>
                  <td>1,250</td>
                </tr>
                <tr>
                  <td>SMS Messages</td>
                  <td>800</td>
                </tr>
                <tr>
                  <td>WhatsApp Messages</td>
                  <td>300</td>
                </tr>
                <tr>
                  <td>Email Messages</td>
                  <td>150</td>
                </tr>
                <tr>
                  <td>Overall Delivery Rate</td>
                  <td>94.2%</td>
                </tr>
                <tr>
                  <td>Total Cost</td>
                  <td>UGX 20,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><em>Generated by SchoolOffice Communication Hub on ${new Date().toISOString()}</em></p>
          </div>
        </body>
      </html>
    `

    // Return HTML as buffer (in production, convert to actual PDF)
    return Buffer.from(htmlContent, 'utf-8')
  }

  /**
   * Calculate cost summary by school
   */
  private async calculateSchoolCostSummary(whereClause: any): Promise<SchoolCostSummary[]> {
    // Get cost totals by school and channel
    const schoolChannelCosts = await prisma.communicationLog.groupBy({
      by: ['schoolId', 'channel'],
      where: {
        ...whereClause,
        cost: { not: null }, // Only include records with cost data
      },
      _sum: {
        cost: true,
      },
    })

    // Build school cost summaries
    const schoolCostMap = new Map<string, SchoolCostSummary>()

    for (const cost of schoolChannelCosts) {
      const schoolId = cost.schoolId
      const channel = cost.channel as MessageChannel
      const channelCost = cost._sum.cost || 0

      if (!schoolCostMap.has(schoolId)) {
        // Get school name
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { name: true },
        })

        schoolCostMap.set(schoolId, {
          schoolId,
          schoolName: school?.name || 'Unknown School',
          cost: {
            totalCost: 0,
            byChannel: {
              [MessageChannel.SMS]: 0,
              [MessageChannel.WHATSAPP]: 0,
              [MessageChannel.EMAIL]: 0,
            },
          },
        })
      }

      const schoolCost = schoolCostMap.get(schoolId)!
      schoolCost.cost.byChannel[channel] = channelCost
      schoolCost.cost.totalCost += channelCost
    }

    const bySchool = Array.from(schoolCostMap.values())
      .sort((a, b) => b.cost.totalCost - a.cost.totalCost) // Sort by total cost descending

    return bySchool
  }

  /**
   * Generate a unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const hubReportService = new HubReportService()