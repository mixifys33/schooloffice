/**
 * Password Reset Store
 * Shared in-memory store for verification codes and reset tokens
 * Uses globalThis to persist across hot reloads in development
 * In production, use Redis or database for persistence across server restarts
 */

interface VerificationCode {
  code: string
  expires: Date
  userId: string
}

interface ResetToken {
  userId: string
  expires: Date
}

// Use globalThis to persist across module reloads in development
const globalForStore = globalThis as unknown as {
  verificationCodes: Map<string, VerificationCode> | undefined
  resetTokens: Map<string, ResetToken> | undefined
}

// Initialize or reuse existing stores
const verificationCodes = globalForStore.verificationCodes ?? new Map<string, VerificationCode>()
const resetTokens = globalForStore.resetTokens ?? new Map<string, ResetToken>()

// Persist to globalThis for development
if (process.env.NODE_ENV !== 'production') {
  globalForStore.verificationCodes = verificationCodes
  globalForStore.resetTokens = resetTokens
}

export function storeVerificationCode(key: string, data: VerificationCode): void {
  // Clean up expired codes first
  cleanupExpiredCodes()
  const normalizedKey = key.toLowerCase()
  verificationCodes.set(normalizedKey, data)
  console.log('[Password Reset Store] Stored code for key:', normalizedKey)
  console.log('[Password Reset Store] Code:', data.code)
  console.log('[Password Reset Store] Total codes stored:', verificationCodes.size)
}

export function getVerificationCode(key: string): VerificationCode | undefined {
  const normalizedKey = key.toLowerCase()
  console.log('[Password Reset Store] Getting code for key:', normalizedKey)
  console.log('[Password Reset Store] Available keys:', Array.from(verificationCodes.keys()))
  
  const data = verificationCodes.get(normalizedKey)
  if (!data) {
    console.log('[Password Reset Store] No data found for key')
    return undefined
  }
  if (data.expires < new Date()) {
    console.log('[Password Reset Store] Code expired, deleting')
    verificationCodes.delete(normalizedKey)
    return undefined
  }
  console.log('[Password Reset Store] Found valid code')
  return data
}

export function deleteVerificationCode(key: string): void {
  verificationCodes.delete(key.toLowerCase())
}

export function storeResetToken(token: string, data: ResetToken): void {
  // Clean up expired tokens first
  cleanupExpiredTokens()
  resetTokens.set(token, data)
  console.log('[Password Reset Store] Stored reset token')
}

export function getResetToken(token: string): ResetToken | undefined {
  const data = resetTokens.get(token)
  if (!data) {
    console.log('[Password Reset Store] No reset token found')
    return undefined
  }
  if (data.expires < new Date()) {
    console.log('[Password Reset Store] Reset token expired')
    resetTokens.delete(token)
    return undefined
  }
  return data
}

export function deleteResetToken(token: string): void {
  resetTokens.delete(token)
}

function cleanupExpiredCodes(): void {
  const now = new Date()
  for (const [key, value] of verificationCodes.entries()) {
    if (value.expires < now) {
      verificationCodes.delete(key)
    }
  }
}

function cleanupExpiredTokens(): void {
  const now = new Date()
  for (const [key, value] of resetTokens.entries()) {
    if (value.expires < now) {
      resetTokens.delete(key)
    }
  }
}
