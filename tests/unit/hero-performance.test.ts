/**
 * Performance and GPU Acceleration Tests for Hero Section
 * Requirements: 7.1, 7.2, 7.4, 7.5
 * 
 * These tests verify:
 * - Animations use only transform and opacity properties (GPU-accelerated)
 * - No layout-triggering properties are animated
 * - Performance optimizations are in place
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Hero Section - Performance and GPU Acceleration', () => {
  const cssContent = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/hero-animations.css'),
    'utf-8'
  );

  describe('GPU Acceleration - Transform and Opacity Only (Requirement 7.1)', () => {
    it('should use only transform and opacity in slideInFromLeft keyframe', () => {
      const slideInFromLeftMatch = cssContent.match(
        /@keyframes slideInFromLeft\s*{([^}]+)}/s
      );
      expect(slideInFromLeftMatch).toBeTruthy();
      
      const slideInFromLeftContent = slideInFromLeftMatch![1];
      expect(slideInFromLeftContent).toContain('opacity');
      expect(slideInFromLeftContent).toContain('transform');
      expect(slideInFromLeftContent).toContain('translateX');
      
      // Ensure no layout-triggering properties
      expect(slideInFromLeftContent).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);
    });

    it('should use only transform and opacity in slideInFromRight keyframe', () => {
      const slideInFromRightMatch = cssContent.match(
        /@keyframes slideInFromRight\s*{([^}]+)}/s
      );
      expect(slideInFromRightMatch).toBeTruthy();
      
      const slideInFromRightContent = slideInFromRightMatch![1];
      expect(slideInFromRightContent).toContain('opacity');
      expect(slideInFromRightContent).toContain('transform');
      expect(slideInFromRightContent).toContain('translateX');
      expect(slideInFromRightContent).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);
    });

    it('should use only transform and opacity in slideInFromBottom keyframe', () => {
      const slideInFromBottomMatch = cssContent.match(
        /@keyframes slideInFromBottom\s*{([^}]+)}/s
      );
      expect(slideInFromBottomMatch).toBeTruthy();
      
      const slideInFromBottomContent = slideInFromBottomMatch![1];
      expect(slideInFromBottomContent).toContain('opacity');
      expect(slideInFromBottomContent).toContain('transform');
      expect(slideInFromBottomContent).toContain('translateY');
      expect(slideInFromBottomContent).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);
    });

    it('should use only opacity in fadeIn keyframe', () => {
      const fadeInMatch = cssContent.match(
        /@keyframes fadeIn\s*{([^}]+)}/s
      );
      expect(fadeInMatch).toBeTruthy();
      
      const fadeInContent = fadeInMatch![1];
      expect(fadeInContent).toContain('opacity');
      // fadeIn should not use transform or layout properties
      expect(fadeInContent).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding|transform)\s*:/);
    });

    it('should use only transform in hover scale transitions', () => {
      const hoverScaleMatch = cssContent.match(
        /\.hero-hover-scale\s*{([^}]+)}/s
      );
      expect(hoverScaleMatch).toBeTruthy();
      
      const hoverScaleContent = hoverScaleMatch![1];
      expect(hoverScaleContent).toContain('transition');
      expect(hoverScaleContent).toContain('transform');
      expect(hoverScaleContent).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);

      const hoverScaleHoverMatch = cssContent.match(
        /\.hero-hover-scale:hover\s*{([^}]+)}/s
      );
      expect(hoverScaleHoverMatch).toBeTruthy();
      
      const hoverScaleHoverContent = hoverScaleHoverMatch![1];
      expect(hoverScaleHoverContent).toContain('transform');
      expect(hoverScaleHoverContent).toContain('scale');
    });

    it('should use only transform and box-shadow in hover lift transitions', () => {
      const hoverLiftMatch = cssContent.match(
        /\.hero-hover-lift\s*{([^}]+)}/s
      );
      expect(hoverLiftMatch).toBeTruthy();
      
      const hoverLiftContent = hoverLiftMatch![1];
      expect(hoverLiftContent).toContain('transition');
      expect(hoverLiftContent).toContain('transform');
      expect(hoverLiftContent).toContain('box-shadow');

      const hoverLiftHoverMatch = cssContent.match(
        /\.hero-hover-lift:hover\s*{([^}]+)}/s
      );
      expect(hoverLiftHoverMatch).toBeTruthy();
      
      const hoverLiftHoverContent = hoverLiftHoverMatch![1];
      expect(hoverLiftHoverContent).toContain('transform');
      expect(hoverLiftHoverContent).toContain('translateY');
      expect(hoverLiftHoverContent).toContain('scale');
    });

    it('should use opacity-based hover effect for stat cards (GPU-accelerated)', () => {
      // Check hero-hover-highlight uses opacity for GPU acceleration
      const hoverHighlightMatch = cssContent.match(
        /\.hero-hover-highlight::before\s*{([^}]+)}/s
      );
      expect(hoverHighlightMatch).toBeTruthy();
      
      const hoverHighlightContent = hoverHighlightMatch![1];
      expect(hoverHighlightContent).toContain('opacity');
      expect(hoverHighlightContent).toContain('transition');
      
      // Verify hover state changes opacity
      const hoverHighlightHoverMatch = cssContent.match(
        /\.hero-hover-highlight:hover::before\s*{([^}]+)}/s
      );
      expect(hoverHighlightHoverMatch).toBeTruthy();
      
      const hoverHighlightHoverContent = hoverHighlightHoverMatch![1];
      expect(hoverHighlightHoverContent).toContain('opacity');
    });
  });

  describe('No Layout Recalculation (Requirement 7.2)', () => {
    it('should not animate layout-triggering properties in keyframes', () => {
      const layoutTriggeringProps = [
        'width', 'height', 'top', 'left', 'right', 'bottom',
        'margin', 'padding', 'border-width', 'font-size'
      ];

      // Check all keyframe animations
      const keyframeMatches = cssContent.matchAll(/@keyframes\s+(\w+)\s*{([^}]+)}/gs);
      
      for (const match of keyframeMatches) {
        const keyframeName = match[1];
        const keyframeContent = match[2];
        
        layoutTriggeringProps.forEach((prop) => {
          const regex = new RegExp(`\\b${prop}\\s*:`, 'i');
          expect(keyframeContent).not.toMatch(regex);
        });
      }
    });

    it('should use will-change for GPU acceleration hints (Requirement 7.4)', () => {
      // Check that animated elements have will-change property
      expect(cssContent).toContain('will-change: transform, opacity');
      
      // Verify will-change is applied to animated elements
      const willChangeMatch = cssContent.match(
        /\.hero-animate-headline,\s*\.hero-animate-subtext,\s*\.hero-animate-cta,\s*\.hero-animate-preview,\s*\.hero-hover-scale,\s*\.hero-hover-lift\s*{([^}]+)}/s
      );
      expect(willChangeMatch).toBeTruthy();
      
      const willChangeContent = willChangeMatch![1];
      expect(willChangeContent).toContain('will-change');
    });

    it('should use backface-visibility for smooth rendering', () => {
      // Check for backface-visibility optimization
      expect(cssContent).toContain('backface-visibility: hidden');
      expect(cssContent).toContain('perspective: 1000px');
    });
  });

  describe('Animation Timing and 60fps Performance (Requirements 7.5)', () => {
    it('should use cubic-bezier easing for smooth animations', () => {
      // Check entrance animations use smooth easing
      expect(cssContent).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
      
      // Check hover transitions use standard easing
      expect(cssContent).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('should complete entrance animations within 1.5 seconds', () => {
      // Extract animation durations and delays
      const headlineMatch = cssContent.match(/\.hero-animate-headline\s*{[^}]*animation:[^;]*0\.8s[^;]*0s[^}]*}/s);
      expect(headlineMatch).toBeTruthy(); // 0.8s duration, 0s delay = 0.8s total

      const subtextMatch = cssContent.match(/\.hero-animate-subtext\s*{[^}]*animation:[^;]*0\.8s[^;]*0\.15s[^}]*}/s);
      expect(subtextMatch).toBeTruthy(); // 0.8s duration, 0.15s delay = 0.95s total

      const ctaMatch = cssContent.match(/\.hero-animate-cta\s*{[^}]*animation:[^;]*0\.8s[^;]*0\.3s[^}]*}/s);
      expect(ctaMatch).toBeTruthy(); // 0.8s duration, 0.3s delay = 1.1s total

      const previewMatch = cssContent.match(/\.hero-animate-preview\s*{[^}]*animation:[^;]*0\.8s[^;]*0\.2s[^}]*}/s);
      expect(previewMatch).toBeTruthy(); // 0.8s duration, 0.2s delay = 1.0s total

      // Maximum total time is CTA: 0.3s delay + 0.8s duration = 1.1s
      // This is well within the 1.5s requirement (Requirement 2.5)
    });

    it('should use animation-fill-mode: both to prevent flashing', () => {
      // Check that entrance animations use 'both' fill mode
      const headlineMatch = cssContent.match(/\.hero-animate-headline\s*{[^}]*animation:[^;]*both[^}]*}/s);
      expect(headlineMatch).toBeTruthy();

      const subtextMatch = cssContent.match(/\.hero-animate-subtext\s*{[^}]*animation:[^;]*both[^}]*}/s);
      expect(subtextMatch).toBeTruthy();

      const ctaMatch = cssContent.match(/\.hero-animate-cta\s*{[^}]*animation:[^;]*both[^}]*}/s);
      expect(ctaMatch).toBeTruthy();

      const previewMatch = cssContent.match(/\.hero-animate-preview\s*{[^}]*animation:[^;]*both[^}]*}/s);
      expect(previewMatch).toBeTruthy();
    });

    it('should use 300ms for hover transitions (Requirement 3.5)', () => {
      // Check hover transitions complete within 300ms
      const hoverScaleMatch = cssContent.match(/\.hero-hover-scale\s*{[^}]*transition:[^;]*0\.3s[^}]*}/s);
      expect(hoverScaleMatch).toBeTruthy();

      const hoverShadowMatch = cssContent.match(/\.hero-hover-shadow\s*{[^}]*transition:[^;]*0\.3s[^}]*}/s);
      expect(hoverShadowMatch).toBeTruthy();

      const hoverLiftMatch = cssContent.match(/\.hero-hover-lift\s*{[^}]*transition:[^;]*0\.3s[^}]*}/s);
      expect(hoverLiftMatch).toBeTruthy();
    });
  });

  describe('Responsive Performance Optimizations (Requirement 6.1, 6.2)', () => {
    it('should reduce animation distances by 50% on mobile', () => {
      // Mobile should use -30px instead of -60px for left slide (50% reduction)
      expect(cssContent).toContain('translateX(-30px)');
      
      // Mobile should use 20px instead of 40px for bottom slide (50% reduction)
      expect(cssContent).toContain('translateY(20px)');
      
      // Verify these are within mobile media query
      const mobileMediaQuery = cssContent.match(
        /@media \(max-width: 768px\)\s*{[\s\S]*?translateX\(-30px\)[\s\S]*?}/
      );
      expect(mobileMediaQuery).toBeTruthy();
    });

    it('should reduce animation duration on mobile to maintain perceived speed', () => {
      // Check mobile reduces animation duration to 0.6s
      const mobileDurationMatch = cssContent.match(
        /@media \(max-width: 768px\)[\s\S]*?animation-duration:\s*0\.6s/
      );
      expect(mobileDurationMatch).toBeTruthy();
    });

    it('should simplify hover effects on mobile for better performance', () => {
      // Check mobile reduces hover scale to 1.02 instead of 1.05
      const mobileHoverMatch = cssContent.match(
        /@media \(max-width: 768px\)[\s\S]*?scale\(1\.02\)/
      );
      expect(mobileHoverMatch).toBeTruthy();
    });

    it('should provide simplified fade-in animation for mobile', () => {
      // Check mobile has simplified fade-in class
      const mobileFadeMatch = cssContent.match(
        /\.hero-mobile-simplified\s*{[^}]*animation:[^;]*fadeIn[^}]*0\.6s[^}]*}/s
      );
      expect(mobileFadeMatch).toBeTruthy();
    });
  });

  describe('Layout Shift Prevention (Requirement 5.5)', () => {
    it('should not cause layout shift with animation properties', () => {
      // Verify animations use transform which doesn't cause layout shift
      const animationClasses = [
        { name: 'hero-animate-headline', keyframe: 'slideInFromLeft' },
        { name: 'hero-animate-subtext', keyframe: 'slideInFromLeft' },
        { name: 'hero-animate-cta', keyframe: 'slideInFromBottom' },
        { name: 'hero-animate-preview', keyframe: 'slideInFromRight' }
      ];

      animationClasses.forEach(({ name, keyframe }) => {
        // Verify the class exists
        const classMatch = cssContent.match(
          new RegExp(`\\.${name}\\s*{[^}]*animation:[^}]*}`, 's')
        );
        expect(classMatch).toBeTruthy();
        
        // Find the keyframe and verify it uses transform
        const keyframeMatch = cssContent.match(
          new RegExp(`@keyframes ${keyframe}\\s*{[\\s\\S]*?transform:[\\s\\S]*?}`, 's')
        );
        expect(keyframeMatch).toBeTruthy();
      });
    });

    it('should use animation-fill-mode: both to maintain final state', () => {
      // animation-fill-mode: both ensures elements maintain their final animated state
      // preventing layout shift when animation completes
      expect(cssContent).toContain('animation-fill-mode: both');
    });
  });
});
