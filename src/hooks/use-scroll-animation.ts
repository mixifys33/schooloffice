"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for scroll-triggered animations using Intersection Observer API
 * 
 * @param options - Optional IntersectionObserver configuration
 * @returns Object containing ref to attach to element and isVisible state
 * 
 * Features:
 * - Triggers when element is 20% visible (threshold: 0.2)
 * - Disconnects observer after first trigger for performance
 * - Supports custom options for advanced use cases
 * - Respects reduced motion preferences
 */
export function useScrollAnimation(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // If reduced motion is preferred, show content immediately
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect after first trigger to animate once and improve performance
          observer.disconnect();
        }
      },
      {
        threshold: 0.2, // Trigger when 20% of element is visible
        ...options, // Allow custom options to override defaults
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
