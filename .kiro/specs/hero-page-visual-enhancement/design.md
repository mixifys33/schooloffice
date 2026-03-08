# Design Document: Full Homepage Visual Enhancement

## Overview

This design document outlines the technical approach for enhancing the entire SchoolOffice homepage with professional visual improvements including gradient backgrounds, sliding animations, scroll-triggered animations, hover transitions, and border styling. The enhancements will create an engaging, accessible, and performant user experience across all homepage sections while maintaining compatibility with the existing design system and theme infrastructure.

### Goals

- Implement smooth, performant CSS animations for all homepage sections
- Add scroll-triggered animations using Intersection Observer API
- Apply professional color gradients and visual polish throughout
- Create responsive hover effects that provide clear interaction feedback
- Ensure accessibility compliance including reduced motion support
- Maintain 60fps performance across modern devices
- Support all existing themes (light, dark, paper, contrast)
- Create a cohesive visual language across all sections

### Non-Goals

- Redesigning section layouts or content structure
- Adding new interactive features beyond hover effects and animations
- Implementing JavaScript-heavy animations (CSS-first approach with minimal JS for scroll detection)
- Modifying the dashboard preview content or data

## Architecture

### Component Structure

The homepage enhancement will be implemented across all existing homepage components using CSS-based animations and transitions, plus a lightweight scroll animation hook for viewport detection. No new components will be created.

```
src/
├── components/
│   └── homepage/
│       ├── hero-section.tsx (modified)
│       ├── trust-section.tsx (modified)
│       ├── core-value-section.tsx (modified)
│       ├── how-it-works-section.tsx (modified)
│       ├── roles-section.tsx (modified)
│       ├── security-section.tsx (modified)
│       ├── target-audience-section.tsx (modified)
│       ├── final-cta-section.tsx (modified)
│       └── content.ts (unchanged)
├── hooks/
│   └── use-scroll-animation.ts (new)
├── styles/
│   ├── hero-animations.css (existing)
│   └── homepage-animations.css (new)
```

### Animation System Architecture

The animation system will use a declarative CSS approach with the following layers:

1. **Entrance Animations Layer**: Keyframe animations for initial page load
2. **Hover Transitions Layer**: Transition-based effects for interactive elements
3. **Responsive Adaptation Layer**: Media query-based animation adjustments
4. **Accessibility Layer**: Reduced motion overrides

### Technology Stack

- **Next.js 15.1.9**: React framework with App Router
- **React 19**: Component library
- **Tailwind CSS 4**: Utility-first CSS framework
- **CSS Custom Properties**: Theme-aware color system
- **CSS Animations & Transitions**: Native browser animation APIs
- **CSS Transforms**: GPU-accelerated animations

## Components and Interfaces

### CSS Animation Module

A new CSS module `hero-animations.css` will contain all animation definitions:

```css
/* Keyframe Definitions */
@keyframes slideInFromLeft { ... }
@keyframes slideInFromRight { ... }
@keyframes slideInFromBottom { ... }
@keyframes fadeIn { ... }

/* Animation Classes */
.hero-animate-headline { ... }
.hero-animate-subtext { ... }
.hero-animate-cta { ... }
.hero-animate-preview { ... }

/* Hover Effect Classes */
.hero-hover-lift { ... }
.hero-hover-scale { ... }
.hero-hover-shadow { ... }
```

### Component Modifications

The `HeroSection` component will be modified to:

1. Add animation classes to existing elements
2. Apply gradient background enhancements
3. Add hover effect classes to interactive elements
4. Include border styling for visual separation

### Animation Timing Configuration

```typescript
const ANIMATION_CONFIG = {
  duration: {
    entrance: "0.8s",
    hover: "0.3s",
    stagger: "0.15s",
  },
  easing: {
    entrance: "cubic-bezier(0.16, 1, 0.3, 1)", // Smooth ease-out
    hover: "cubic-bezier(0.4, 0, 0.2, 1)", // Standard easing
  },
  delays: {
    headline: "0s",
    subtext: "0.15s",
    cta: "0.3s",
    preview: "0.2s",
  },
};
```

## Data Models

No new data models are required. The enhancement uses existing component props and CSS classes.

### CSS Class Naming Convention

```typescript
interface AnimationClasses {
  entrance: {
    headline: "hero-animate-headline";
    subtext: "hero-animate-subtext";
    cta: "hero-animate-cta";
    preview: "hero-animate-preview";
  };
  hover: {
    button: "hero-hover-scale hero-hover-shadow";
    preview: "hero-hover-lift";
    statCard: "hero-hover-highlight";
  };
  responsive: {
    mobile: "hero-mobile-simplified";
    tablet: "hero-tablet-optimized";
    desktop: "hero-desktop-full";
  };
}
```

## Scroll Animation System

### Intersection Observer Hook

A custom React hook will handle scroll-triggered animations:

```typescript
// src/hooks/use-scroll-animation.ts
export function useScrollAnimation(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Animate once
        }
      },
      { threshold: 0.2, ...options },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

### Animation Trigger Pattern

Each section will use the hook to trigger animations:

```typescript
export function TrustSection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className={isVisible ? 'animate-in' : 'animate-out'}>
      {/* Section content */}
    </section>
  );
}
```

## Section-Specific Enhancements

### Trust Section

- Fade-in animation for trust point cards
- Hover lift effect with colored borders
- Checkmark pulse animation
- Staggered card animations (0.1s delay between cards)

### Core Value Section

- Fade-in and scale-up animation for value cards
- Gradient borders on cards
- Colored text gradients for titles
- Enhanced hover effects with 3% scale-up

### How It Works Section

- Slide-in from left for step items
- Gradient backgrounds for step number badges
- Pulse animation on step numbers
- Progressive line animation between steps
- Colored accent borders on hover

### Roles Section

- Fade-in and scale-up for role cards
- Colored top borders (different color per role)
- Icon badges with gradient backgrounds
- Lift effect with colored shadows on hover

### Security Section

- Gradient background with shield icon
- Shield glow and pulse animation
- Fade-in for security points
- Green accent highlights on hover
- Gradient badges for security points

### Target Audience Section

- Slide-in from opposite directions (good fit from left, not good fit from right)
- Green gradient accents for good fit column
- Neutral gray styling for not good fit column
- Icon scale animations on hover
- Background color highlights on list item hover

### Final CTA Section

- Animated gradient background
- Prominent button glow effect
- Headline scale-up animation
- Contrasting color scheme for emphasis

## CSS Animation Classes

### New Homepage Animation Classes

```css
/* Scroll-triggered animations */
.section-fade-in { ... }
.section-slide-up { ... }
.section-slide-left { ... }
.section-slide-right { ... }

/* Card animations */
.card-fade-scale { ... }
.card-hover-lift { ... }
.card-gradient-border { ... }

/* Icon animations */
.icon-pulse { ... }
.icon-glow { ... }
.icon-scale-hover { ... }

/* Badge animations */
.badge-gradient { ... }
.badge-pulse { ... }

/* Section-specific */
.trust-card-hover { ... }
.value-card-hover { ... }
.step-highlight { ... }
.role-card-hover { ... }
.security-point-hover { ... }
.audience-item-hover { ... }
.cta-button-glow { ... }
```

## Performance Considerations

### Scroll Animation Optimization

- Use Intersection Observer (native browser API, no polling)
- Disconnect observer after first trigger (animate once)
- Use CSS transforms for animations (GPU-accelerated)
- Threshold set to 0.2 (trigger when 20% visible)

### Animation Performance

- All animations use transform and opacity only
- will-change property for animated elements
- Staggered animations use CSS animation-delay (no JavaScript)
- Reduced motion preferences respected globally

## Theme Integration

All new animations and colors will integrate with existing theme system:

```css
/* Light theme */
[data-theme="light"] .section-gradient { ... }

/* Dark theme */
[data-theme="dark"] .section-gradient { ... }

/* Paper theme */
[data-theme="paper"] .section-gradient { ... }

/* Contrast theme */
[data-theme="contrast"] .section-gradient { ... }
```

## Accessibility

- All scroll animations respect `prefers-reduced-motion`
- Keyboard navigation preserved during animations
- Focus indicators remain visible
- WCAG AA contrast ratios maintained
- Screen reader compatibility ensured
