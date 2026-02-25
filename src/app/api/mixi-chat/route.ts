import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Cache for documentation content
let documentationCache: string | null = null
let lastCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getDocumentationContext(): Promise<string> {
  const now = Date.now()
  
  // Return cached version if still valid
  if (documentationCache && (now - lastCacheTime) < CACHE_DURATION) {
    return doc