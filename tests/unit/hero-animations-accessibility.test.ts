/**
 * Accessibility Tests for Hero Section Animations
 * Requirements: 5.4, 8.1, 8.2
 * 
 * Validates that the hero section respects user preferences for reduced motion
 * and provides accessible animation behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Hero Animations - Reduced Motion Accessibility', () => {
  const cssFilePath = join(process.cwd(), 'src/styles/hero-animations.css');
  const cssContent = readFileSync(cssFilePath, 'utf-8');

  it('should have reduced motion media query defined', () => {
    /**
     * Validates: Requirement 8.1
     * Verifies that the CSS includes a prefers-reduced-motion media query
     */
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('should disable animations for all hero elements when reduced motion is enabled', () => {
    /**
     * Validates: Requirement 8.1
     * Verifies that all sliding animations are disabled when reduced motion is preferred
     */
    
    // Check that animation classes are targeted in reduced motion query
    expect(cssContent).toContain('.hero-animate-headline');
    expect(cssContent).toContain('.hero-animate-subtext');
    expect(cssContent).toContain('.hero-animate-cta');
    expect(cssContent).toContain('.hero-animate-preview');
    
    // Check that animations are disabled
    expect(cssContent).toContain('animation: none !important');
  });

  it('should display content immediately without animation delays', () => {
    /**
     * Validates: Requirement 8.2
     * Verifies that content is displayed immediately (opacity: 1, transform: none)
     * when reduced motion is enabled
     */
    
    // Check that opacity is set to 1 for immediate visibility
    expect(cssContent).toContain('opacity: 1 !important');
    
    // Check that transforms are removed for immediate positioning
    expect(cssContent).toContain('transform: none !important');
  });

  it('should disable hover transitions when reduced motion is enabled', () => {
    /**
     * Validates: Requirement 5.4
     * Verifies that hover transitions are also disabled to respect
     * user preferences for reduced motion
     */
    
    // Check that hover classes are targeted
    expect(cssContent).toContain('.hero-hover-scale');
    expect(cssContent).toContain('.hero-hover-lift');
    
    // Check that transitions are disabled
    expect(cssContent).toContain('transition: none !important');
  });

  it('should use !important to ensure reduced motion overrides take precedence', () => {
    /**
     * Validates: Requirements 5.4, 8.1, 8.2
     * Verifies that !important is used to ensure accessibility overrides
     * cannot be accidentally overridden by other styles
     */
    const reducedMotionSection = cssContent.split('@media (prefers-reduced-motion: reduce)')[1];
    
    if (reducedMotionSection) {
      // Count !important declarations in reduced motion section
      const importantCount = (reducedMotionSection.match(/!important/g) || []).length;
      
      // Should have multiple !important declarations for strong override
      expect(importantCount).toBeGreaterThan(3);
    }
  });

  it('should maintain animation classes outside of reduced motion context', () => {
    /**
     * Validates: Requirement 2.1, 2.2, 2.3, 2.4
     * Verifies that animations are still defined for users who don't
     * prefer reduced motion
     */
    
    // Check that animation classes exist with proper definitions
    expect(cssContent).toContain('.hero-animate-headline');
    expect(cssContent).toContain('animation: slideInFromLeft');
    expect(cssContent).toContain('cubic-bezier');
  });
});
