/**
 * Mobile Responsiveness Tests for Super Admin Schools Control Center
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * Task 15.1: Add responsive layouts
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-school-id' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Mobile Responsiveness Tests', () => {
  beforeEach(() => {
    jest.clearAllMoc