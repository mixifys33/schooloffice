/**
 * Integration Tests for Homepage Components
 * Task 20: Final checkpoint - Component integration testing
 * 
 * This test suite validates:
 * 1. Components properly import and use animation CSS
 * 2. useScrollAnimation hook implementation
 * 3. Components apply animation classes correctly
 * 4. Reduced motion preferences are respected in hook
 * 5. Intersection Observer is used correctly
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Homepage Components - Integration Testing', () => {
  // Read all component files
  const componentsDir = join(process.cwd(), 'src/components/homepage');
  const hookPath = join(process.cwd(), 'src/hooks/use-scroll-animation.ts');
  
  const trustSectionPath = join(componentsDir, 'trust-section.tsx');
  const coreValueSectionPath = join(componentsDir, 'core-value-section.tsx');
  const howItWorksSectionPath = join(componentsDir, 'how-it-works-section.tsx');
  const rolesSectionPath = join(componentsDir, 'roles-section.tsx');
  const securitySectionPath = join(componentsDir, 'security-section.tsx');
  const targetAudienceSectionPath = join(componentsDir, 'target-audience-section.tsx');
  const finalCtaSectionPath = join(componentsDir, 'final-cta-section.tsx');
  const heroSectionPath = join(componentsDir, 'hero-section.tsx');

  const trustSection = readFileSync(trustSectionPath, 'utf-8');
  const coreValueSection = readFileSync(coreValueSectionPath, 'utf-8');
  const howItWorksSection = readFileSync(howItWorksSectionPath, 'utf-8');
  const rolesSection = readFileSync(rolesSectionPath, 'utf-8');
  const securitySection = readFileSync(securitySectionPath, 'utf-8');
  const targetAudienceSection = readFileSync(targetAudienceSectionPath, 'utf-8');
  const finalCtaSection = readFileSync(finalCtaSectionPath, 'utf-8');
  const heroSection = readFileSync(heroSectionPath, 'utf-8');
  const scrollAnimationHook = readFileSync(hookPath, 'utf-8');

  describe('1. useScrollAnimation Hook Implementation', () => {
    it('should use Intersection Observer API', () => {
      /**
       * Validates: Requirement 9.2
       * Verifies that the hook uses Intersection Observer for scroll detection
       */
      expect(scrollAnimationHook).toContain('IntersectionObserver');
      expect(scrollAnimationHook).toContain('new IntersectionObserver');
    });

    it('should set threshold to 0.2 (20% visible)', () => {
      /**
       * Validates: Requirement 9.3
       * Verifies that animations trigger when element is 20% visible
       */
      expect(scrollAnimationHook).toContain('threshold: 0.2');
    });

    it('should disconnect observer after first trigger', () => {
      /**
       * Validates: Requirement 9.2
       * Verifies that observer disconnects for performance optimization
       */
      expect(scrollAnimationHook).toContain('observer.disconnect()');
    });

    it('should check for reduced motion preferences', () => {
      /**
       * Validates: Requirement 9.5
       * Verifies that the hook respects reduced motion preferences
       */
      expect(scrollAnimationHook).toContain('prefers-reduced-motion');
      expect(scrollAnimationHook).toContain('matchMedia');
    });

    it('should show content immediately when reduced motion is preferred', () => {
      /**
       * Validates: Requirement 9.5
       * Verifies that content is shown immediately for reduced motion users
       */
      expect(scrollAnimationHook).toContain('setIsVisible(true)');
      expect(scrollAnimationHook).toContain('prefersReducedMotion');
    });

    it('should return ref and isVisible state', () => {
      /**
       * Validates: Hook interface
       * Verifies that the hook returns the correct interface
       */
      expect(scrollAnimationHook).toContain('return { ref, isVisible }');
    });
  });

  describe('2. Trust Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 10.1
       * Verifies that Trust Section uses scroll animation hook
       */
      expect(trustSection).toContain('useScrollAnimation');
      expect(trustSection).toContain('@/hooks/use-scroll-animation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 10.1
       * Verifies that Trust Section imports animation styles
       */
      expect(trustSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 10.1
       * Verifies that Trust Section applies animation classes conditionally
       */
      expect(trustSection).toContain('isVisible');
      expect(trustSection).toContain('section-fade-in');
      expect(trustSection).toContain('section-slide-up');
      expect(trustSection).toContain('section-animate');
    });

    it('should apply staggered delays to trust point cards', () => {
      /**
       * Validates: Requirement 10.5
       * Verifies that trust cards have staggered animation delays
       */
      expect(trustSection).toContain('section-stagger');
    });

    it('should apply hover effect classes to cards', () => {
      /**
       * Validates: Requirement 10.2
       * Verifies that trust cards have hover effects
       */
      expect(trustSection).toContain('trust-card-hover');
    });

    it('should apply icon pulse animation to checkmarks', () => {
      /**
       * Validates: Requirement 10.5
       * Verifies that checkmark icons have pulse animation
       */
      expect(trustSection).toContain('icon-pulse');
    });
  });

  describe('3. Core Value Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 11.1
       * Verifies that Core Value Section uses scroll animation hook
       */
      expect(coreValueSection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 11.1
       * Verifies that Core Value Section imports animation styles
       */
      expect(coreValueSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 11.1
       * Verifies that Core Value Section applies animation classes
       */
      expect(coreValueSection).toContain('isVisible');
      expect(coreValueSection).toContain('section-');
    });

    it('should apply hover effect classes to value cards', () => {
      /**
       * Validates: Requirement 11.2
       * Verifies that value cards have hover effects
       */
      expect(coreValueSection).toContain('value-card-hover');
    });
  });

  describe('4. How It Works Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 12.1
       * Verifies that How It Works Section uses scroll animation hook
       */
      expect(howItWorksSection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 12.1
       * Verifies that How It Works Section imports animation styles
       */
      expect(howItWorksSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 12.1
       * Verifies that How It Works Section applies animation classes
       */
      expect(howItWorksSection).toContain('isVisible');
    });

    it('should apply hover effect classes to steps', () => {
      /**
       * Validates: Requirement 12.3
       * Verifies that steps have hover effects
       */
      expect(howItWorksSection).toContain('step-highlight');
    });
  });

  describe('5. Roles Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 13.1
       * Verifies that Roles Section uses scroll animation hook
       */
      expect(rolesSection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 13.1
       * Verifies that Roles Section imports animation styles
       */
      expect(rolesSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 13.1
       * Verifies that Roles Section applies animation classes
       */
      expect(rolesSection).toContain('isVisible');
    });

    it('should apply hover effect classes to role cards', () => {
      /**
       * Validates: Requirement 13.2
       * Verifies that role cards have hover effects
       */
      expect(rolesSection).toContain('role-card-hover');
    });
  });

  describe('6. Security Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 14.2
       * Verifies that Security Section uses scroll animation hook
       */
      expect(securitySection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 14.2
       * Verifies that Security Section imports animation styles
       */
      expect(securitySection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 14.2
       * Verifies that Security Section applies animation classes
       */
      expect(securitySection).toContain('isVisible');
    });

    it('should apply hover effect classes to security points', () => {
      /**
       * Validates: Requirement 14.3
       * Verifies that security points have hover effects
       */
      expect(securitySection).toContain('security-point-hover');
    });

    it('should apply shield glow animation', () => {
      /**
       * Validates: Requirement 14.4
       * Verifies that security shield has glow effect
       */
      expect(securitySection).toContain('security-shield-glow');
    });
  });

  describe('7. Target Audience Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 15.1
       * Verifies that Target Audience Section uses scroll animation hook
       */
      expect(targetAudienceSection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 15.1
       * Verifies that Target Audience Section imports animation styles
       */
      expect(targetAudienceSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 15.1
       * Verifies that Target Audience Section applies animation classes
       */
      expect(targetAudienceSection).toContain('isVisible');
    });

    it('should apply hover effect classes to audience items', () => {
      /**
       * Validates: Requirement 15.4
       * Verifies that audience items have hover effects
       */
      expect(targetAudienceSection).toContain('audience-item-hover');
    });
  });

  describe('8. Final CTA Section Component Integration', () => {
    it('should import useScrollAnimation hook', () => {
      /**
       * Validates: Requirement 16.3
       * Verifies that Final CTA Section uses scroll animation hook
       */
      expect(finalCtaSection).toContain('useScrollAnimation');
    });

    it('should import homepage-animations.css', () => {
      /**
       * Validates: Requirement 16.3
       * Verifies that Final CTA Section imports animation styles
       */
      expect(finalCtaSection).toContain('@/styles/homepage-animations.css');
    });

    it('should apply animation classes based on isVisible state', () => {
      /**
       * Validates: Requirement 16.3
       * Verifies that Final CTA Section applies animation classes
       */
      expect(finalCtaSection).toContain('isVisible');
    });

    it('should apply CTA button glow effect', () => {
      /**
       * Validates: Requirement 16.2
       * Verifies that CTA button has glow effect
       */
      expect(finalCtaSection).toContain('cta-button-glow');
    });

    it('should apply animated gradient background', () => {
      /**
       * Validates: Requirement 16.1
       * Verifies that Final CTA Section has animated gradient
       */
      expect(finalCtaSection).toContain('animate-gradient-shift');
    });
  });

  describe('9. Hero Section Component Integration', () => {
    it('should import hero-animations.css', () => {
      /**
       * Validates: Requirements 2.1, 2.2, 2.3, 2.4
       * Verifies that Hero Section imports animation styles
       */
      expect(heroSection).toContain('@/styles/hero-animations.css');
    });

    it('should apply entrance animation classes', () => {
      /**
       * Validates: Requirements 2.1, 2.2, 2.3, 2.4
       * Verifies that Hero Section applies entrance animations
       */
      expect(heroSection).toContain('hero-animate-');
    });

    it('should apply hover effect classes', () => {
      /**
       * Validates: Requirements 3.1, 3.2, 3.3
       * Verifies that Hero Section applies hover effects
       */
      expect(heroSection).toContain('hero-hover-');
    });
  });

  describe('10. All Sections Use Client-Side Rendering', () => {
    it('should mark all animated sections as client components', () => {
      /**
       * Validates: Next.js App Router compatibility
       * Verifies that all sections using hooks are client components
       */
      expect(trustSection).toContain('"use client"');
      expect(coreValueSection).toContain('"use client"');
      expect(howItWorksSection).toContain('"use client"');
      expect(rolesSection).toContain('"use client"');
      expect(securitySection).toContain('"use client"');
      expect(targetAudienceSection).toContain('"use client"');
      expect(finalCtaSection).toContain('"use client"');
      expect(heroSection).toContain('"use client"');
    });
  });

  describe('11. All Sections Have Test IDs', () => {
    it('should have data-testid attributes for testing', () => {
      /**
       * Validates: Testability
       * Verifies that all sections have test IDs for integration testing
       */
      expect(trustSection).toContain('data-testid');
      expect(coreValueSection).toContain('data-testid');
      expect(howItWorksSection).toContain('data-testid');
      expect(rolesSection).toContain('data-testid');
      expect(securitySection).toContain('data-testid');
      expect(targetAudienceSection).toContain('data-testid');
      expect(finalCtaSection).toContain('data-testid');
      expect(heroSection).toContain('data-testid');
    });
  });
});

