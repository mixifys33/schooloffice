// Homepage content configuration
// All static content for the SchoolOffice homepage sections

export interface HeroCTA {
  label: string;
  href: string;
}

export interface HeroContent {
  headline: string;
  subtext: string;
  primaryCTA: HeroCTA;
  secondaryCTA: HeroCTA;
}

export interface TrustPoint {
  text: string;
}

export interface TrustContent {
  title: string;
  points: TrustPoint[];
}

export interface ValueBlock {
  title: string;
  points: string[];
}

export interface CoreValueContent {
  title: string;
  blocks: ValueBlock[];
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  title: string;
  steps: Step[];
}

export interface RoleCard {
  title: string;
  responsibilities: string[];
}

export interface RolesContent {
  title: string;
  roles: RoleCard[];
}

export interface SecurityPoint {
  text: string;
}

export interface SecurityContent {
  title: string;
  points: SecurityPoint[];
}

export interface TargetAudienceContent {
  title: string;
  goodFit: string[];
  notGoodFit: string[];
}

export interface FinalCTAContent {
  headline: string;
  buttonLabel: string;
  buttonHref: string;
  reassuranceText: string;
}

export interface HomepageContent {
  hero: HeroContent;
  trust: TrustContent;
  coreValue: CoreValueContent;
  howItWorks: HowItWorksContent;
  roles: RolesContent;
  security: SecurityContent;
  targetAudience: TargetAudienceContent;
  finalCTA: FinalCTAContent;
}


export const HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    headline: "A digital school office built for real schools.",
    subtext:
      "SchoolOffice helps schools manage academics, track fees, and send reports and notices to parents through WhatsApp, SMS, and email from one controlled system.",
    primaryCTA: { label: "Register Your School", href: "/register" },
    secondaryCTA: { label: "View Demo", href: "/demo" },
  },
  trust: {
    title: "Built the way schools actually operate",
    points: [
      { text: "Separate system for every school with full data isolation" },
      { text: "Clear roles for admins, teachers, parents, and students" },
      { text: "Secure fee tracking with balances visible at all times" },
      { text: "Academic reports generated and sent digitally to parents" },
    ],
  },
  coreValue: {
    title: "What schools use SchoolOffice for every day",
    blocks: [
      {
        title: "Academics & Reports",
        points: [
          "Attendance and exams recorded once",
          "Reports generated automatically",
          "Reports sent to parents digitally",
        ],
      },
      {
        title: "Fees & Payments",
        points: [
          "Fee structures per class and term",
          "Real-time balance tracking",
          "Parents see exactly what is owed",
        ],
      },
      {
        title: "Communication with Parents",
        points: [
          "Send results and notices via WhatsApp",
          "SMS alerts for fees and attendance",
          "Email for official documents",
        ],
      },
    ],
  },
  howItWorks: {
    title: "How SchoolOffice Works",
    steps: [
      {
        number: 1,
        title: "Register your school",
        description: "A secure system is created only for your institution.",
      },
      {
        number: 2,
        title: "Add staff, students, and parents",
        description: "Everyone gets access based on their role.",
      },
      {
        number: 3,
        title: "Run daily school operations",
        description:
          "Academics, fees, reports, and communication in one place.",
      },
    ],
  },
  roles: {
    title: "Designed for every role in the school",
    roles: [
      {
        title: "School Admin",
        responsibilities: [
          "Academic and system control",
          "Reports and oversight",
          "Communication management",
        ],
      },
      {
        title: "Teachers",
        responsibilities: [
          "Attendance and marks",
          "Class responsibilities",
          "Simple daily workflow",
        ],
      },
      {
        title: "Parents",
        responsibilities: [
          "Fees and balances",
          "Academic reports",
          "School messages",
        ],
      },
      {
        title: "Students",
        responsibilities: ["Timetable", "Results", "Assignments"],
      },
    ],
  },
  security: {
    title: "Your school data stays under your control",
    points: [
      { text: "School-level data isolation" },
      { text: "Role-based permissions" },
      { text: "Full activity audit logs" },
      { text: "Secure login and access control" },
    ],
  },
  targetAudience: {
    title: "Who SchoolOffice is for",
    goodFit: [
      "Primary and secondary schools",
      "Schools with multiple staff roles",
      "Schools that communicate with parents regularly",
    ],
    notGoodFit: [
      "Informal tutoring centers",
      "One-person schools",
      "Personal coaching programs",
    ],
  },
  finalCTA: {
    headline: "Create your school's digital office.",
    buttonLabel: "Register Your School",
    buttonHref: "/register",
    reassuranceText: "Takes only a few minutes. No commitment.",
  },
} as const;
