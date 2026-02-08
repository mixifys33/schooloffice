'use client'

import React from 'react'
import { ComingSoonWarning } from './coming-soon-warning'

/**
 * Security Settings - Currently Under Development
 * Being honest about incomplete functionality
 */
export function SecuritySettings() {
  return (
    <ComingSoonWarning
      title="Security Settings"
      description="Configure password policies, session management, and security features"
      features={[
        "Password complexity requirements (currently not enforced)",
        "Maximum login attempts and lockout duration",
        "Session timeout configuration (currently not enforced)",
        "Two-factor authentication setup",
        "Auto-logout on inactivity",
        "IP address restrictions",
        "Security audit logging",
        "Failed login attempt monitoring"
      ]}
      estimatedCompletion="Security Update - High Priority"
    />
  )
}