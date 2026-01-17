import { HeroSection } from "@/components/homepage/hero-section";
import { TrustSection } from "@/components/homepage/trust-section";
import { CoreValueSection } from "@/components/homepage/core-value-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { RolesSection } from "@/components/homepage/roles-section";
import { SecuritySection } from "@/components/homepage/security-section";
import { TargetAudienceSection } from "@/components/homepage/target-audience-section";
import { FinalCTASection } from "@/components/homepage/final-cta-section";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen" data-testid="homepage">
      <HeroSection />
      <TrustSection />
      <CoreValueSection />
      <HowItWorksSection />
      <RolesSection />
      <SecuritySection />
      <TargetAudienceSection />
      <FinalCTASection />
    </main>
  );
}
