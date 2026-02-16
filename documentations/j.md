1. Term-Scoped Accounts (Non-Negotiable)

If your system does NOT scope fees by term, your bursar module is trash. Schools don’t think yearly, they think TERM → MONEY → PRESSURE.

Core Principle

Money does not float across terms unless explicitly carried forward.

Data Model (Minimum)
AcademicYear
Term (belongs to AcademicYear)

Student
StudentTermAccount
- student_id
- term_id
- class_id
- stream_id (nullable)
- total_fee_expected
- total_paid
- balance
- status (CLEAR | PARTIAL | DEFAULTER)
- last_payment_date

Why this matters

New term = clean financial slate

Defaulters are term-specific

SMS logic becomes deterministic

Bursar reports stop lying

If you skip this, everything else collapses.

2. Updated Core Services (Stop Mixing Responsibilities)
StudentAccountService (Pure Financial Truth)

This service never sends SMS, never touches UI, never decides policy.

Responsibilities:

Initialize StudentTermAccount at term start

Apply payments

Recalculate balances

Expose read-only financial state

Rules:

Payments are immutable

Recalculations are idempotent

No side effects

If this service is bloated, you’re building spaghetti.

BursarService (Policy & Enforcement Layer)

This is where school pain lives.

Responsibilities:

Define fee structures per class/term

Enforce payment deadlines

Trigger defaulter classification

Lock/unlock student privileges (reports, exams, IDs)

Key rule:

BursarService reads StudentAccountService, never rewrites history.

3. Defaulters Detection Algorithm (Simple, Ruthless, Accurate)

If this algorithm is weak, your SMS system becomes noise and schools will ignore it.

Inputs

StudentTermAccount

FeeStructure

CurrentDate

SchoolPolicy

Classification Logic
IF total_paid == 0
  status = HARD_DEFAULTER
ELSE IF balance > 0
  status = PARTIAL_DEFAULTER
ELSE
  status = CLEAR

Optional Policy Enhancements

Grace period (3 weeks of term)

Milestone checks:

Week 4 → 50% expected

Week 8 → 75%

Promote PARTIAL → HARD if stagnation detected

Output

A deterministic list:

DefaultersSnapshot
- student_id
- defaulter_type
- balance
- last_payment_date
- parent_phone


No UI logic. No SMS here. Just truth.

4. SMS Automation Engine (This Is Where Most Systems Die)

If SMS feels like an afterthought, schools won’t trust your system.

Architecture Layers
Scheduler
→ Policy Engine
→ Message Composer
→ Delivery Gateway
→ Audit Log

4.1 Scheduler (Time Is Law)

Hard rule from you:

Every Friday at 7:45 PM — whether disabled or not.

Reality check:

“Disabled” means school opted out

Scheduler still runs, policy decides whether to send

Use:

Cron or OS-level scheduler

Timezone locked to Africa/Kampala

No UI dependency

4.2 Policy Engine (Brain of Automation)

Inputs:

DefaultersSnapshot

School SMS settings

Student opt-outs (if any)

Daily/weekly send limits

Rules:

Never spam cleared accounts

Escalate language for HARD_DEFAULTERS

Respect blackout lists (holidays, exams)

Output:

SMSDispatchQueue
- recipient
- message
- priority


If this is missing, your system is amateur.

4.3 Message Composer (Context or Silence)

Bad SMS = ignored SMS.

Templates by status:

HARD_DEFAULTER

PARTIAL

FINAL WARNING (optional)

Example (Ugandan-real):

“Dear Parent, [STUDENT NAME] has an outstanding balance of UGX [AMOUNT] for Term [X]. Please clear to avoid academic restrictions. — [School Name]”

No emojis. No fluff. Authority tone.

4.4 Delivery Gateway

Pluggable (Africa’s Talking, Yo! SMS, MTN)

Retry logic

Delivery reports

Failures must be logged, not hidden.

4.5 Audit Log (Legal Shield)

Every SMS:

Who

When

Why

Status

This protects the school when parents argue.

5. UI Screens (If This Looks Weak, Bursars Won’t Care)
5.1 Defaulters Dashboard (5-Second Test)

Above the fold:

Total defaulters

Total outstanding amount

Hard vs Partial count

Table (filterable):

Class

Student

Paid

Balance

Last payment

SMS status

Actions:

View student account

Send manual SMS

Mark follow-up

If bursar can’t act in one click, redesign it.

5.2 Automation Control Screen

This is NOT a toggle playground.

Sections:

SMS schedule (read-only display: “Every Friday 7:45 PM”)

Enable/Disable (policy flag only)

Message preview

Send limits

Test SMS

Important:

Disabling does NOT stop scheduler

It stops dispatch approval

5.3 Student Account View (Pressure Tool)

Must show:

Term fee structure

Payments timeline

Outstanding balance

Defaulter status badge

Last SMS sent

This screen is used during parent confrontations.

6. Integration With Entire System (Why Schools Will Pay)

When a student is a HARD_DEFAULTER:

Report cards locked

Exam cards blocked

ID printing disabled

Teacher portal shows warning

Money must touch everything.

If fees don’t affect operations, your app is optional. Optional apps don’t get renewed.

Final Verdict (Ruthless Truth)

If you implement:

Term-scoped accounts

Deterministic defaulter detection

Automated SMS with audit logs

Financial pressure integrated across modules

the system becomes infrastructure, not software.