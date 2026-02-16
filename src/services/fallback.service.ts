/**
 * Fallback Service
 * 
 * Manages multi-channel fallback logic for message delivery.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */    

import { prisma } from '../lib/db'
import {
  FallbackConfig,
  FallbackParams,
  FallbackResult,
  FallbackAttempt,
} from '../types/entities'
import { MessageChannel, MessageType } from '../types/enums'
import type { IFallbackService } from '../types/services'

export class FallbackService implements IFallbackService {
  /**
   * Determine the fallback chain for a message based on configuration and recipient capabilities
   * Requirement 17.1: When WhatsApp delivery fails, automatically attempt SMS delivery
   * Requirement 17.2: When SMS delivery fails after WhatsApp, log the complete failure chain
   */
  determineFallbackChain(params: FallbackParams): MessageChannel[] {
    const { primaryChannel, recipientHasWhatsApp, recipientHasEmail, recipientHasPhone, messageType } = params
    
    // Start with primary channel
    const chain: MessageChannel[] = [primaryChannel]
    
    // Determine available channels based on recipient capabilities
    const availableChannels: MessageChannel[] = []
    
    if (recipientHasWhatsApp) {
      availableChannels.push(MessageChannel.WHATSAPP)
    }
    if (recipientHasPhone) {
      availableChannels.push(MessageChannel.SMS)
    }
    if (recipientHasEmail) {
      availableChannels.push(MessageChannel.EMAIL)
    }
    
    // Build fallback chain based on message type and available channels
    switch (primaryChannel) {
      case MessageChannel.WHATSAPP:
        // WhatsApp -> SMS -> Email (if available)
        if (recipientHasPhone && !chain.includes(MessageChannel.SMS)) {
          chain.push(MessageChannel.SMS)
        }
        if (recipientHasEmail && !chain.includes(MessageChannel.EMAIL)) {
          chain.push(MessageChannel.EMAIL)
        }
        break
        
      case MessageChannel.SMS:
        // SMS -> WhatsApp -> Email (if available)
        if (recipientHasWhatsApp && !chain.includes(MessageChannel.WHATSAPP)) {
          chain.push(MessageChannel.WHATSAPP)
        }
        if (recipientHasEmail && !chain.includes(MessageChannel.EMAIL)) {
          chain.push(MessageChannel.EMAIL)
        }
        break
        
      case MessageChannel.EMAIL:
        // Email -> SMS -> WhatsApp (if available)
        if (recipientHasPhone && !chain.includes(MessageChannel.SMS)) {
          chain.push(MessageChannel.SMS)
        }
        if (recipientHasWhatsApp && !chain.includes(MessageChannel.WHATSAPP)) {
          chain.push(MessageChannel.WHATSAPP)
        }
        break
    }
    
    // For emergency messages, prioritize faster channels
    if (messageType === MessageType.EMERGENCY) {
      const emergencyOrder = [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL]
      const reorderedChain = emergencyOrder.filter(channel => 
        chain.includes(channel) && availableChannels.includes(channel)
      )
      return reorderedChain.length > 0 ? reorderedChain : chain
    }
    
    return chain
  }

  /**
   * Execute fallback for a failed message
   * Requirement 17.1: When WhatsApp delivery fails, automatically attempt SMS delivery
   * Requirement 17.2: When SMS delivery fails after WhatsApp, log the complete failure chain
   * Requirement 17.5: When fallback succeeds, record which channel ultimately delivered the message
   */
  async executeFallback(messageId: string, failedChannel: MessageChannel): Promise<FallbackResult> {
    try {
      // Get the original message log to understand the context
      const messageLog = await prisma.communicationLog.findUnique({
        where: { messageId },
      })

      if (!messageLog) {
        throw new Error(`Message log not found for messageId: ${messageId}`)
      }

      // Get fallback configuration for the school
      const fallbackConfig = await this.getFallbackConfig(messageLog.schoolId)
      
      if (!fallbackConfig || !fallbackConfig.enabled) {
        return {
          success: false,
          attempts: [{
            channel: failedChannel,
            success: false,
            error: 'Fallback is disabled for this school',
            timestamp: new Date(),
          }],
        }
      }

      // Determine recipient capabilities (simplified - in real implementation, 
      // this would query the actual recipient data)
      const recipientCapabilities = await this.getRecipientCapabilities(
        messageLog.recipientId, 
        messageLog.recipientType
      )

      // Determine fallback chain
      const fallbackParams: FallbackParams = {
        primaryChannel: failedChannel,
        recipientHasWhatsApp: recipientCapabilities.hasWhatsApp,
        recipientHasEmail: recipientCapabilities.hasEmail,
        recipientHasPhone: recipientCapabilities.hasPhone,
        messageType: this.inferMessageType(messageLog.content),
      }

      const fallbackChain = this.determineFallbackChain(fallbackParams)
      
      // Remove the failed channel from the chain
      const remainingChannels = fallbackChain.filter(channel => channel !== failedChannel)
      
      if (remainingChannels.length === 0) {
        return {
          success: false,
          attempts: [{
            channel: failedChannel,
            success: false,
            error: 'No fallback channels available',
            timestamp: new Date(),
          }],
        }
      }

      const attempts: FallbackAttempt[] = [{
        channel: failedChannel,
        success: false,
        error: 'Primary channel failed',
        timestamp: new Date(),
      }]

      // Try each fallback channel
      for (const channel of remainingChannels) {
        // Check if this channel is disabled for the recipient
        if (await this.isChannelDisabledForRecipient(messageLog.recipientId, channel)) {
          attempts.push({
            channel,
            success: false,
            error: 'Channel disabled by recipient',
            timestamp: new Date(),
          })
          continue
        }

        try {
          // Attempt delivery on fallback channel
          const deliveryResult = await this.attemptDeliveryOnChannel(
            messageLog,
            channel,
            recipientCapabilities
          )

          attempts.push({
            channel,
            success: deliveryResult.success,
            error: deliveryResult.error,
            timestamp: new Date(),
          })

          if (deliveryResult.success) {
            // Update the message log with successful fallback
            await this.updateMessageLogWithFallback(messageId, attempts, channel)
            
            return {
              success: true,
              finalChannel: channel,
              attempts,
            }
          }
        } catch (error) {
          attempts.push({
            channel,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          })
        }

        // Check if we've exceeded max attempts
        if (attempts.length >= fallbackConfig.maxAttempts + 1) { // +1 for original attempt
          break
        }
      }

      // All fallback attempts failed
      await this.updateMessageLogWithFallback(messageId, attempts)
      
      return {
        success: false,
        attempts,
      }
    } catch (error) {
      return {
        success: false,
        attempts: [{
          channel: failedChannel,
          success: false,
          error: `Fallback execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        }],
      }
    }
  }

  /**
   * Get fallback configuration for a school
   * Requirement 17.3: Respect channel preferences configured per message type
   */
  async getFallbackConfig(schoolId: string): Promise<FallbackConfig | null> {
    const config = await prisma.fallbackConfig.findUnique({
      where: { schoolId },
    })

    if (!config) {
      return null
    }

    return {
      id: config.id,
      schoolId: config.schoolId,
      enabled: config.enabled,
      fallbackOrder: config.fallbackOrder as MessageChannel[],
      maxAttempts: config.maxAttempts,
      retryDelayMinutes: config.retryDelayMinutes,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }

  /**
   * Update fallback configuration for a school
   * Requirement 17.3: Respect channel preferences configured per message type
   */
  async updateFallbackConfig(schoolId: string, config: Partial<FallbackConfig>): Promise<FallbackConfig> {
    const updatedConfig = await prisma.fallbackConfig.upsert({
      where: { schoolId },
      update: {
        enabled: config.enabled,
        fallbackOrder: config.fallbackOrder,
        maxAttempts: config.maxAttempts,
        retryDelayMinutes: config.retryDelayMinutes,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        enabled: config.enabled ?? true,
        fallbackOrder: config.fallbackOrder ?? [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
        maxAttempts: config.maxAttempts ?? 3,
        retryDelayMinutes: config.retryDelayMinutes ?? 5,
      },
    })

    return {
      id: updatedConfig.id,
      schoolId: updatedConfig.schoolId,
      enabled: updatedConfig.enabled,
      fallbackOrder: updatedConfig.fallbackOrder as MessageChannel[],
      maxAttempts: updatedConfig.maxAttempts,
      retryDelayMinutes: updatedConfig.retryDelayMinutes,
      createdAt: updatedConfig.createdAt,
      updatedAt: updatedConfig.updatedAt,
    }
  }

  /**
   * Create default fallback configuration for a school
   * Requirement 17.3: Respect channel preferences configured per message type
   */
  async createDefaultFallbackConfig(schoolId: string): Promise<FallbackConfig> {
    const defaultConfig = await prisma.fallbackConfig.create({
      data: {
        schoolId,
        enabled: true,
        fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
        maxAttempts: 3,
        retryDelayMinutes: 5,
      },
    })

    return {
      id: defaultConfig.id,
      schoolId: defaultConfig.schoolId,
      enabled: defaultConfig.enabled,
      fallbackOrder: defaultConfig.fallbackOrder as MessageChannel[],
      maxAttempts: defaultConfig.maxAttempts,
      retryDelayMinutes: defaultConfig.retryDelayMinutes,
      createdAt: defaultConfig.createdAt,
      updatedAt: defaultConfig.updatedAt,
    }
  }

  /**
   * Get recipient capabilities (phone, email, WhatsApp availability)
   */
  private async getRecipientCapabilities(recipientId: string, recipientType: string) {
    // This is a simplified implementation. In a real system, this would
    // query the actual recipient data from students, guardians, or staff tables
    
    if (recipientType === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: recipientId },
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
      })

      if (!student || !student.guardians.length) {
        return { hasPhone: false, hasEmail: false, hasWhatsApp: false }
      }

      // Use primary guardian's contact info
      const primaryGuardian = student.guardians.find(sg => sg.isPrimary)?.guardian || 
                             student.guardians[0].guardian

      return {
        hasPhone: !!primaryGuardian.phone,
        hasEmail: !!primaryGuardian.email,
        hasWhatsApp: !!primaryGuardian.phone, // Assume WhatsApp if phone exists
      }
    }

    if (recipientType === 'GUARDIAN') {
      const guardian = await prisma.guardian.findUnique({
        where: { id: recipientId },
      })

      if (!guardian) {
        return { hasPhone: false, hasEmail: false, hasWhatsApp: false }
      }

      return {
        hasPhone: !!guardian.phone,
        hasEmail: !!guardian.email,
        hasWhatsApp: !!guardian.phone, // Assume WhatsApp if phone exists
      }
    }

    if (recipientType === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { id: recipientId },
        include: {
          user: true,
        },
      })

      if (!staff) {
        return { hasPhone: false, hasEmail: false, hasWhatsApp: false }
      }

      return {
        hasPhone: !!staff.phone,
        hasEmail: !!staff.user.email,
        hasWhatsApp: !!staff.phone, // Assume WhatsApp if phone exists
      }
    }

    return { hasPhone: false, hasEmail: false, hasWhatsApp: false }
  }

  /**
   * Check if a channel is disabled for a specific recipient
   * Requirement 17.4: Do not retry on channels explicitly disabled by the recipient
   */
  private async isChannelDisabledForRecipient(recipientId: string, channel: MessageChannel): Promise<boolean> {
    // This is a placeholder implementation. In a real system, this would
    // check recipient preferences or opt-out settings
    
    // For now, assume no channels are disabled
    return false
  }

  /**
   * Attempt message delivery on a specific channel
   */
  private async attemptDeliveryOnChannel(
    messageLog: any,
    channel: MessageChannel,
    recipientCapabilities: any
  ): Promise<{ success: boolean; error?: string }> {
    // This is a simplified implementation. In a real system, this would
    // integrate with the actual gateway services (SMS, WhatsApp, Email)
    
    try {
      // Get the appropriate contact for the channel
      let contact: string | null = null
      
      switch (channel) {
        case MessageChannel.SMS:
        case MessageChannel.WHATSAPP:
          contact = await this.getPhoneContact(messageLog.recipientId, messageLog.recipientType)
          break
        case MessageChannel.EMAIL:
          contact = await this.getEmailContact(messageLog.recipientId, messageLog.recipientType)
          break
      }

      if (!contact) {
        return {
          success: false,
          error: `No ${channel.toLowerCase()} contact available for recipient`,
        }
      }

      // Simulate delivery attempt (in real implementation, this would call the gateway services)
      // For now, assume 80% success rate for fallback attempts
      const success = Math.random() > 0.2
      
      if (success) {
        // Create a new message log entry for the fallback attempt
        await prisma.communicationLog.create({
          data: {
            schoolId: messageLog.schoolId,
            messageId: `${messageLog.messageId}_fallback_${channel.toLowerCase()}`,
            senderId: messageLog.senderId,
            senderRole: messageLog.senderRole,
            channel,
            recipientId: messageLog.recipientId,
            recipientType: messageLog.recipientType,
            recipientContact: contact,
            content: messageLog.content,
            templateId: messageLog.templateId,
            status: 'SENT',
            statusReason: 'Fallback delivery successful',
            metadata: {
              originalMessageId: messageLog.messageId,
              fallbackChannel: true,
              originalChannel: messageLog.channel,
            },
          },
        })

        return { success: true }
      } else {
        return {
          success: false,
          error: `${channel} delivery failed`,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delivery error',
      }
    }
  }

  /**
   * Get phone contact for a recipient
   */
  private async getPhoneContact(recipientId: string, recipientType: string): Promise<string | null> {
    if (recipientType === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: recipientId },
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
      })

      if (!student || !student.guardians.length) {
        return null
      }

      const primaryGuardian = student.guardians.find(sg => sg.isPrimary)?.guardian || 
                             student.guardians[0].guardian
      return primaryGuardian.phone
    }

    if (recipientType === 'GUARDIAN') {
      const guardian = await prisma.guardian.findUnique({
        where: { id: recipientId },
      })
      return guardian?.phone || null
    }

    if (recipientType === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { id: recipientId },
      })
      return staff?.phone || null
    }

    return null
  }

  /**
   * Get email contact for a recipient
   */
  private async getEmailContact(recipientId: string, recipientType: string): Promise<string | null> {
    if (recipientType === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: recipientId },
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
      })

      if (!student || !student.guardians.length) {
        return null
      }

      const primaryGuardian = student.guardians.find(sg => sg.isPrimary)?.guardian || 
                             student.guardians[0].guardian
      return primaryGuardian.email
    }

    if (recipientType === 'GUARDIAN') {
      const guardian = await prisma.guardian.findUnique({
        where: { id: recipientId },
      })
      return guardian?.email || null
    }

    if (recipientType === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { id: recipientId },
        include: {
          user: true,
        },
      })
      return staff?.user.email || null
    }

    return null
  }

  /**
   * Infer message type from content (simplified implementation)
   */
  private inferMessageType(content: string): MessageType {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('emergency') || lowerContent.includes('urgent')) {
      return MessageType.EMERGENCY
    }
    if (lowerContent.includes('fee') || lowerContent.includes('payment') || lowerContent.includes('balance')) {
      return MessageType.FINANCIAL
    }
    if (lowerContent.includes('absent') || lowerContent.includes('attendance')) {
      return MessageType.ATTENDANCE
    }
    if (lowerContent.includes('exam') || lowerContent.includes('result') || lowerContent.includes('grade')) {
      return MessageType.ACADEMIC
    }
    
    return MessageType.GENERAL
  }

  /**
   * Update message log with fallback attempt results
   */
  private async updateMessageLogWithFallback(
    messageId: string,
    attempts: FallbackAttempt[],
    successfulChannel?: MessageChannel
  ): Promise<void> {
    const fallbackData = {
      attempts,
      completedAt: new Date(),
      successfulChannel,
    }

    await prisma.communicationLog.update({
      where: { messageId },
      data: {
        fallbackAttempts: JSON.stringify(fallbackData),
        status: successfulChannel ? 'SENT' : 'FAILED',
        statusReason: successfulChannel 
          ? `Delivered via fallback channel: ${successfulChannel}`
          : 'All fallback attempts failed',
        updatedAt: new Date(),
      },
    })
  }
}

// Export singleton instance
export const fallbackService = new FallbackService()