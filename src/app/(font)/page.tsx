import { Metadata } from "next";
import { HeroSection } from "@/components/homepage/hero-section";
import { TrustSection } from "@/components/homepage/trust-section";
import { CoreValueSection } from "@/components/homepage/core-value-section";
import { HowItWorksSection } from "@/components/homepage/how-it-works-section";
import { RolesSection } from "@/components/homepage/roles-section";
import { SecuritySection } from "@/components/homepage/security-section";
import { TargetAudienceSection } from "@/components/homepage/target-audience-section";
import { FinalCTASection } from "@/components/homepage/final-cta-section";
import { AIChatWidget } from "@/components/ai-assistant/ai-chat-widget";

export const metadata: Metadata = {
  title: 'SchoolOffice.academy - Modern School Management System',
  description: 'Transform your school with SchoolOffice.academy - the complete cloud-based school management system. Manage students, teachers, attendance, grades, fees, and communication all in one place.',
  keywords: ['school management system', 'education software', 'student information system', 'school ERP', 'education management', 'school administration software'],
  alternates: {
    canonical: 'https://schooloffice.academy',
  },
  openGraph: {
    title: 'SchoolOffice.academy - Modern School Management System',
    description: 'Transform your school with SchoolOffice.academy - the complete cloud-based school management system.',
    url: 'https://schooloffice.academy',
    siteName: 'SchoolOffice.academy',
    images: [
      {
        url: '/images/schooloffice.png',
        width: 1200,
        height: 630,
        alt: 'SchoolOffice.academy - School Management System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  verification: {
    google: "VMGlVQ3ZFf0j0_g1hFF4rHuLU1jjuIPX-WoGcUkQKWM",
  },
};

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
      <AIChatWidget />
    </main>
  );
}
