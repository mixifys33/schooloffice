"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HOMEPAGE_CONTENT } from "./content";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import "@/styles/homepage-animations.css";

export function FinalCTASection() {
  const { headline, buttonLabel, buttonHref, reassuranceText } =
    HOMEPAGE_CONTENT.finalCTA;
  
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className="w-full py-12 md:py-24 relative overflow-hidden"
      data-testid="final-cta-section"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-600 animate-gradient-shift" />
      
      <div className="container px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          {/* Headline with fade-in and scale-up animation */}
          <h2 
            className={`text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl text-white ${
              isVisible ? 'section-animate section-scale-up' : 'opacity-0'
            }`}
          >
            {headline}
          </h2>
          
          {/* CTA button with prominent glow effect */}
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-base font-semibold cta-button-glow"
          >
            <Link href={buttonHref}>{buttonLabel}</Link>
          </Button>
          
          {/* Reassurance text with fade-in animation */}
          <p 
            className={`text-sm text-white/90 ${
              isVisible ? 'section-animate section-fade-in section-stagger-1' : 'opacity-0'
            }`}
          >
            {reassuranceText}
          </p>
        </div>
      </div>
    </section>
  );
}
