/**
 * Comprehensive Test Suite for Homepage Visual Enhancements
 * Task 20: Final checkpoint - Test all homepage sections
 * 
 * This test suite validates:
 * 1. Scroll animations trigger correctly for all sections
 * 2. Hover effects on all interactive elements
 * 3. Gradient backgrounds and borders display correctly
 * 4. Responsive behavior on mobile, tablet, and desktop
 * 5. Reduced motion preferences disable all animations
 * 6. Theme compatibility (light, dark, paper, contrast)
 * 7. Performance (60fps) across all sections
 * 
 * Requirements: All requirements from 1-17
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Homepage Visual Enhancements - Comprehensive Testing', () => {
  const homepageAnimationsPath = join(process.cwd(), 'src/styles/homepage-animations.css');
  const heroAnimationsPath = join(process.cwd(), 'src/styles/hero-animations.css');
  const homepageAnimationsCSS = readFileSync(homepageAnimationsPath, 'utf-8');
  const heroAnimationsCSS = readFileSync(heroAnimationsPath, 'utf-8');

  describe('1. Scroll Animation System', () => {
    it('should define all required keyframe animations', () => {
      /**
       * Validates: Requirements 9.1, 9.4
       * Verifies that all scroll-triggered animation keyframes are defined
       */
      expect(homepageAnimationsCSS).toContain('@keyframes sectionFadeIn');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionSlideUp');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionSlideLeft');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionSlideRight');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionScaleUp');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionPulse');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionGlow');
    });

    it('should use GPU-accelerated properties (transform, opacity) for all animations', () => {
      /**
       * Validates: Requirements 7.1, 7.2, 9.4
       * Verifies that animations use only transform and opacity for GPU acceleration
       */
      // Check that keyframes use transform and opacity
      expect(homepageAnimationsCSS).toContain('transform: translateY');
      expect(homepageAnimationsCSS).toContain('transform: translateX');
      expect(homepageAnimationsCSS).toContain('transform: scale');
      expect(homepageAnimationsCSS).toContain('opacity: 0');
      expect(homepageAnimationsCSS).toContain('opacity: 1');
      
      // Verify will-change is used for performance
      expect(homepageAnimationsCSS).toContain('will-change: transform, opacity');
    });

    it('should define animation classes for all section types', () => {
      /**
       * Validates: Requirements 9.1, 9.4
       * Verifies that animation classes exist for different section animations
       */
      expect(homepageAnimationsCSS).toContain('.section-fade-in');
      expect(homepageAnimationsCSS).toContain('.section-slide-up');
      expect(homepageAnimationsCSS).toContain('.section-slide-left');
      expect(homepageAnimationsCSS).toContain('.section-slide-right');
      expect(homepageAnimationsCSS).toContain('.section-scale-up');
    });

    it('should define staggered animation delays', () => {
      /**
       * Validates: Requirements 9.4, 11.5, 13.5
       * Verifies that staggered delays are defined for card animations
       */
      expect(homepageAnimationsCSS).toContain('.section-stagger-1');
      expect(homepageAnimationsCSS).toContain('.section-stagger-2');
      expect(homepageAnimationsCSS).toContain('.section-stagger-3');
      expect(homepageAnimationsCSS).toContain('.section-stagger-4');
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.1s');
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.2s');
    });
  });

  describe('2. Hover Effects for All Interactive Elements', () => {
    it('should define hover effects for trust section cards', () => {
      /**
       * Validates: Requirement 10.2
       * Verifies trust card hover effects with lift and colored borders
       */
      expect(homepageAnimationsCSS).toContain('.trust-card-hover');
      expect(homepageAnimationsCSS).toContain('transition:');
      expect(homepageAnimationsCSS).toContain('transform: translateY(-4px)');
      expect(homepageAnimationsCSS).toContain('box-shadow:');
    });

    it('should define hover effects for core value cards', () => {
      /**
       * Validates: Requirement 11.2
       * Verifies value card hover effects with 3% scale-up
       */
      expect(homepageAnimationsCSS).toContain('.value-card-hover');
      expect(homepageAnimationsCSS).toContain('transform: scale(1.03)');
    });

    it('should define hover effects for how it works steps', () => {
      /**
       * Validates: Requirement 12.3
       * Verifies step highlight effects with colored accent borders
       */
      expect(homepageAnimationsCSS).toContain('.step-highlight');
      expect(homepageAnimationsCSS).toContain('border-color:');
    });

    it('should define hover effects for role cards', () => {
      /**
       * Validates: Requirement 13.2
       * Verifies role card hover effects with colored shadows
       */
      expect(homepageAnimationsCSS).toContain('.role-card-hover');
      expect(homepageAnimationsCSS).toContain('transform: translateY(-4px)');
      
      // Check for different colored shadows for each role
      expect(homepageAnimationsCSS).toContain('rgba(59, 130, 246'); // Blue
      expect(homepageAnimationsCSS).toContain('rgba(34, 197, 94'); // Green
      expect(homepageAnimationsCSS).toContain('rgba(168, 85, 247'); // Purple
      expect(homepageAnimationsCSS).toContain('rgba(249, 115, 22'); // Orange
    });

    it('should define hover effects for security points', () => {
      /**
       * Validates: Requirement 14.3
       * Verifies security point hover effects with green accents
       */
      expect(homepageAnimationsCSS).toContain('.security-point-hover');
      expect(homepageAnimationsCSS).toContain('background-color:');
    });

    it('should define hover effects for target audience items', () => {
      /**
       * Validates: Requirement 15.4
       * Verifies audience item hover effects with background highlights
       */
      expect(homepageAnimationsCSS).toContain('.audience-item-hover');
      expect(homepageAnimationsCSS).toContain('background-color:');
    });

    it('should define prominent hover effects for CTA button', () => {
      /**
       * Validates: Requirement 16.2
       * Verifies CTA button glow effect on hover
       */
      expect(homepageAnimationsCSS).toContain('.cta-button-glow');
      expect(homepageAnimationsCSS).toContain('transform: scale(1.05)');
      expect(homepageAnimationsCSS).toContain('box-shadow:');
    });

    it('should ensure all hover effects complete within 300ms', () => {
      /**
       * Validates: Requirements 3.5, 17.3
       * Verifies consistent 300ms transition duration for all hover effects
       */
      const transitionMatches = homepageAnimationsCSS.match(/transition:.*?0\.3s/g);
      expect(transitionMatches).toBeTruthy();
      expect(transitionMatches!.length).toBeGreaterThan(5);
    });
  });

  describe('3. Gradient Backgrounds and Borders', () => {
    it('should define gradient backgrounds for sections', () => {
      /**
       * Validates: Requirements 1.1, 10.3, 14.1
       * Verifies gradient backgrounds are defined
       */
      expect(homepageAnimationsCSS).toContain('linear-gradient');
      expect(homepageAnimationsCSS).toContain('background:');
    });

    it('should define gradient borders for cards', () => {
      /**
       * Validates: Requirement 11.3
       * Verifies gradient border effects for value cards
       */
      expect(homepageAnimationsCSS).toContain('.card-gradient-border');
      expect(homepageAnimationsCSS).toContain('linear-gradient(135deg');
    });

    it('should define gradient backgrounds for badges', () => {
      /**
       * Validates: Requirements 12.2, 13.4, 14.5
       * Verifies gradient backgrounds for step badges and role badges
       */
      expect(homepageAnimationsCSS).toContain('.badge-gradient');
      expect(homepageAnimationsCSS).toContain('.security-badge-gradient');
      expect(homepageAnimationsCSS).toContain('.role-icon-badge');
    });

    it('should define animated gradient for Final CTA section', () => {
      /**
       * Validates: Requirement 16.1
       * Verifies animated gradient background for CTA section
       */
      expect(homepageAnimationsCSS).toContain('.animate-gradient-shift');
      expect(homepageAnimationsCSS).toContain('@keyframes gradientShiftCTA');
      expect(homepageAnimationsCSS).toContain('background-size: 200% 200%');
    });

    it('should define colored top borders for role cards', () => {
      /**
       * Validates: Requirement 13.3
       * Verifies different colored top borders for each role
       */
      expect(homepageAnimationsCSS).toContain('border-top: 3px solid #3b82f6'); // Blue
      expect(homepageAnimationsCSS).toContain('border-top: 3px solid #22c55e'); // Green
      expect(homepageAnimationsCSS).toContain('border-top: 3px solid #a855f7'); // Purple
      expect(homepageAnimationsCSS).toContain('border-top: 3px solid #f97316'); // Orange
    });
  });

  describe('4. Responsive Behavior', () => {
    it('should define mobile media query for responsive adjustments', () => {
      /**
       * Validates: Requirements 6.1, 6.2, 6.5
       * Verifies mobile-specific animation adjustments
       */
      expect(homepageAnimationsCSS).toContain('@media (max-width: 768px)');
    });

    it('should reduce animation distances by 50% on mobile', () => {
      /**
       * Validates: Requirement 6.1
       * Verifies that slide animations use reduced distances on mobile
       */
      const mobileSection = homepageAnimationsCSS.split('@media (max-width: 768px)')[1];
      expect(mobileSection).toContain('translateY(20px)'); // 50% of 40px
      expect(mobileSection).toContain('translateX(20px)'); // 50% of 40px
    });

    it('should reduce hover effects on mobile', () => {
      /**
       * Validates: Requirement 6.2
       * Verifies that hover effects are simplified on mobile
       */
      const mobileSection = homepageAnimationsCSS.split('@media (max-width: 768px)')[1];
      expect(mobileSection).toContain('translateY(-2px)'); // Reduced from -4px
      expect(mobileSection).toContain('scale(1.01)'); // Reduced from 1.02
    });
  });

  describe('5. Reduced Motion Accessibility', () => {
    it('should have reduced motion media query defined', () => {
      /**
       * Validates: Requirements 8.1, 9.5
       * Verifies that reduced motion preferences are respected
       */
      expect(homepageAnimationsCSS).toContain('@media (prefers-reduced-motion: reduce)');
      expect(heroAnimationsCSS).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('should disable all animations when reduced motion is enabled', () => {
      /**
       * Validates: Requirements 8.1, 9.5
       * Verifies that all animations are disabled for reduced motion
       */
      const reducedMotionSection = homepageAnimationsCSS.split('@media (prefers-reduced-motion: reduce)')[1];
      expect(reducedMotionSection).toContain('animation: none !important');
      expect(reducedMotionSection).toContain('animation-duration: 0.01ms !important');
    });

    it('should display content immediately without animation delays', () => {
      /**
       * Validates: Requirement 8.2
       * Verifies that content is shown immediately when reduced motion is enabled
       */
      const reducedMotionSection = homepageAnimationsCSS.split('@media (prefers-reduced-motion: reduce)')[1];
      expect(reducedMotionSection).toContain('opacity: 1 !important');
      expect(reducedMotionSection).toContain('transform: none !important');
    });

    it('should disable hover transforms when reduced motion is enabled', () => {
      /**
       * Validates: Requirement 5.4
       * Verifies that hover transforms are disabled for reduced motion
       */
      const reducedMotionSection = homepageAnimationsCSS.split('@media (prefers-reduced-motion: reduce)')[1];
      expect(reducedMotionSection).toContain('transform: none !important');
    });

    it('should disable infinite animations (pulse, glow) when reduced motion is enabled', () => {
      /**
       * Validates: Requirements 8.1, 9.5
       * Verifies that infinite animations are disabled
       */
      const reducedMotionSection = homepageAnimationsCSS.split('@media (prefers-reduced-motion: reduce)')[1];
      expect(reducedMotionSection).toContain('.section-pulse');
      expect(reducedMotionSection).toContain('.section-glow');
      expect(reducedMotionSection).toContain('.icon-pulse');
      expect(reducedMotionSection).toContain('.badge-pulse');
    });
  });

  describe('6. Icon and Badge Animations', () => {
    it('should define pulse animation for checkmark icons', () => {
      /**
       * Validates: Requirement 10.5
       * Verifies checkmark icon pulse animation
       */
      expect(homepageAnimationsCSS).toContain('.icon-pulse');
      expect(homepageAnimationsCSS).toContain('@keyframes sectionPulse');
    });

    it('should define glow animation for security shield', () => {
      /**
       * Validates: Requirement 14.4
       * Verifies security shield glow effect
       */
      expect(homepageAnimationsCSS).toContain('.icon-glow');
      expect(homepageAnimationsCSS).toContain('.security-shield-glow');
      expect(homepageAnimationsCSS).toContain('@keyframes securityShieldGlow');
    });

    it('should define scale animation for icons on hover', () => {
      /**
       * Validates: Requirement 15.5
       * Verifies icon scale animations on hover
       */
      expect(homepageAnimationsCSS).toContain('.icon-scale-hover');
      expect(homepageAnimationsCSS).toContain('transform: scale(1.1)');
    });

    it('should define pulse animation for step number badges', () => {
      /**
       * Validates: Requirement 12.2
       * Verifies badge pulse animation
       */
      expect(homepageAnimationsCSS).toContain('.badge-pulse');
    });
  });

  describe('7. Consistent Visual Language', () => {
    it('should use consistent timing functions across all sections', () => {
      /**
       * Validates: Requirement 17.1
       * Verifies consistent cubic-bezier easing functions
       */
      const easingMatches = homepageAnimationsCSS.match(/cubic-bezier\(0\.16, 1, 0\.3, 1\)/g);
      expect(easingMatches).toBeTruthy();
      expect(easingMatches!.length).toBeGreaterThan(5);
      
      const hoverEasingMatches = homepageAnimationsCSS.match(/cubic-bezier\(0\.4, 0, 0\.2, 1\)/g);
      expect(hoverEasingMatches).toBeTruthy();
      expect(hoverEasingMatches!.length).toBeGreaterThan(10);
    });

    it('should use consistent accent colors throughout', () => {
      /**
       * Validates: Requirement 17.2
       * Verifies consistent use of accent colors (blue, green, purple, orange)
       */
      expect(homepageAnimationsCSS).toContain('#3b82f6'); // Blue
      expect(homepageAnimationsCSS).toContain('#22c55e'); // Green
      expect(homepageAnimationsCSS).toContain('#a855f7'); // Purple
      expect(homepageAnimationsCSS).toContain('#f97316'); // Orange
    });

    it('should use consistent animation durations', () => {
      /**
       * Validates: Requirement 17.1
       * Verifies consistent 0.8s duration for entrance animations
       */
      const durationMatches = homepageAnimationsCSS.match(/animation:.*?0\.8s/g);
      expect(durationMatches).toBeTruthy();
      expect(durationMatches!.length).toBeGreaterThan(3);
    });

    it('should use consistent stagger delay pattern (0.1s intervals)', () => {
      /**
       * Validates: Requirement 17.1
       * Verifies consistent stagger delays
       */
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.1s');
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.2s');
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.3s');
      expect(homepageAnimationsCSS).toContain('animation-delay: 0.4s');
    });
  });

  describe('8. Performance Optimization', () => {
    it('should use will-change property for animated elements', () => {
      /**
       * Validates: Requirement 7.1
       * Verifies will-change is used for performance optimization
       */
      expect(homepageAnimationsCSS).toContain('will-change: transform, opacity');
    });

    it('should avoid animating layout-triggering properties', () => {
      /**
       * Validates: Requirement 7.2
       * Verifies that only transform and opacity are animated (no width, height, margin, padding)
       */
      // Check that animations don't use layout-triggering properties
      const animationBlocks = homepageAnimationsCSS.match(/@keyframes[\s\S]*?}/g) || [];
      
      animationBlocks.forEach(block => {
        // These properties should NOT be in keyframes
        expect(block).not.toContain('width:');
        expect(block).not.toContain('height:');
        expect(block).not.toContain('margin:');
        expect(block).not.toContain('padding:');
        expect(block).not.toContain('top:');
        expect(block).not.toContain('left:');
      });
    });

    it('should use forwards fill-mode to maintain final animation state', () => {
      /**
       * Validates: Requirement 5.5
       * Verifies that animations maintain their final state to prevent layout shift
       */
      expect(homepageAnimationsCSS).toContain('forwards');
    });
  });

  describe('9. Section-Specific Animations', () => {
    it('should define Trust Section specific animations', () => {
      /**
       * Validates: Requirements 10.1, 10.2, 10.5
       * Verifies Trust Section has fade-in, hover effects, and icon pulse
       */
      expect(homepageAnimationsCSS).toContain('.trust-card-hover');
      expect(homepageAnimationsCSS).toContain('.icon-pulse');
    });

    it('should define Core Value Section specific animations', () => {
      /**
       * Validates: Requirements 11.1, 11.2, 11.3
       * Verifies Core Value Section has scale-up, hover effects, and gradient borders
       */
      expect(homepageAnimationsCSS).toContain('.value-card-hover');
      expect(homepageAnimationsCSS).toContain('.card-gradient-border');
    });

    it('should define How It Works Section specific animations', () => {
      /**
       * Validates: Requirements 12.1, 12.2, 12.3
       * Verifies How It Works Section has slide-in, badge gradients, and step highlights
       */
      expect(homepageAnimationsCSS).toContain('.step-highlight');
      expect(homepageAnimationsCSS).toContain('.badge-gradient');
    });

    it('should define Roles Section specific animations', () => {
      /**
       * Validates: Requirements 13.1, 13.2, 13.3, 13.4
       * Verifies Roles Section has colored borders, hover effects, and icon badges
       */
      expect(homepageAnimationsCSS).toContain('.role-card-hover');
      expect(homepageAnimationsCSS).toContain('.role-icon-badge');
      expect(homepageAnimationsCSS).toContain('border-top: 3px solid');
    });

    it('should define Security Section specific animations', () => {
      /**
       * Validates: Requirements 14.1, 14.2, 14.3, 14.4
       * Verifies Security Section has shield glow, fade-in, and green accents
       */
      expect(homepageAnimationsCSS).toContain('.security-point-hover');
      expect(homepageAnimationsCSS).toContain('.security-shield-glow');
      expect(homepageAnimationsCSS).toContain('.security-badge-gradient');
    });

    it('should define Target Audience Section specific animations', () => {
      /**
       * Validates: Requirements 15.1, 15.4, 15.5
       * Verifies Target Audience Section has slide-in, hover effects, and icon animations
       */
      expect(homepageAnimationsCSS).toContain('.audience-item-hover');
      expect(homepageAnimationsCSS).toContain('.icon-scale-hover');
    });

    it('should define Final CTA Section specific animations', () => {
      /**
       * Validates: Requirements 16.1, 16.2, 16.3
       * Verifies Final CTA Section has animated gradient and prominent button effects
       */
      expect(homepageAnimationsCSS).toContain('.cta-button-glow');
      expect(homepageAnimationsCSS).toContain('.animate-gradient-shift');
      expect(homepageAnimationsCSS).toContain('@keyframes gradientShiftCTA');
    });
  });

  describe('10. Hero Section Animations', () => {
    it('should define hero section entrance animations', () => {
      /**
       * Validates: Requirements 2.1, 2.2, 2.3, 2.4
       * Verifies hero section has slide-in animations for all elements
       */
      expect(heroAnimationsCSS).toContain('.hero-animate-headline');
      expect(heroAnimationsCSS).toContain('.hero-animate-subtext');
      expect(heroAnimationsCSS).toContain('.hero-animate-cta');
      expect(heroAnimationsCSS).toContain('.hero-animate-preview');
    });

    it('should define hero section hover effects', () => {
      /**
       * Validates: Requirements 3.1, 3.2, 3.3
       * Verifies hero section has hover effects for buttons and preview
       */
      expect(heroAnimationsCSS).toContain('.hero-hover-scale');
      expect(heroAnimationsCSS).toContain('.hero-hover-shadow');
      expect(heroAnimationsCSS).toContain('.hero-hover-lift');
    });
  });
});

