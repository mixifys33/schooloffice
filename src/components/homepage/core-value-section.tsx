"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HOMEPAGE_CONTENT } from "./content";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import "@/styles/homepage-animations.css";

export function CoreValueSection() {
  const { title, blocks } = HOMEPAGE_CONTENT.coreValue;
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className="w-full py-12 md:py-24"
      data-testid="core-value-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className={`text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl ${isVisible ? 'section-fade-in' : 'section-animate'}`}>
            {title}
          </h2>
          <div className="grid gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full">
            {blocks.map((block, index) => (
              <Card 
                key={index} 
                data-testid="value-block"
                className={`value-card-hover card-gradient-border ${isVisible ? `card-fade-scale section-stagger-${index + 1}` : 'section-animate'}`}
              >
                <CardHeader>
                  <CardTitle className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {block.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-left">
                    {block.points.map((point, pointIndex) => (
                      <li
                        key={pointIndex}
                        className="text-sm text-muted-foreground"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
