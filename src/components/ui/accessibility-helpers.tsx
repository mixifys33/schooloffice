/**
 * Accessibility Helper Components and Utilities
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 * - Meet WCAG 2.1 AA accessibility standards
 * - Provide proper ARIA labels and semantic HTML structure
 * - Implement keyboard navigation for all elements
 * - Ensure sufficient color contrast ratios
 * - Support screen readers with proper heading structure
 * - Provide focus indicators that are clearly visible
 * - Allow users to navigate the entire interface using only keyboard input
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Screen reader only text component
export interface ScreenRea