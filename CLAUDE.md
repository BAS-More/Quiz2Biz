# CLAUDE.md — Quiz2Biz Project Context

> **Last updated:** 15 February 2026
> **Owner:** Avi Bendetsky
> **Project:** Quiz2Biz — Chat → Benchmark → Document platform
> **Repo:** C:\Dev\quiz-to-build
> **Remotes:** GitHub (github.com/Avi-Bendetsky/Quiz-to-build) + Azure DevOps

---

## PRODUCT DEFINITION

Quiz2Biz is a SaaS platform where users describe their business idea through a conversational AI chat interface, receive a standards-benchmarked quality score, and generate professional documents calibrated to a quality slider with per-document pricing.

**The product is NOT:**
- A form-based questionnaire (the existing codebase has this — it is being replaced)
- A tech readiness assessment tool (this was the old product — deprecated)
- A subscription service (per-document pricing only)

**The product IS:**
- Chat-first: conversational AI is the primary interface
- Standards-benchmarked: quality scores measure against ISO, industry frameworks, and best practices
- Multi-provider: AI Gateway routes to Claude (Anthropic) and OpenAI, with user choice
- Pay-per-document: quality slider (0–100%) controls price (1x–5x base price)

---

## USER JOURNEY

1. **Account** → Free to create. One workspace with multiple named projects.
2. **Chat** → User talks to AI about their business idea. Provider selectable (Claude or OpenAI). 50-message hard limit on free chat.
3. **Dashboard** → Quality score (0–100) with per-dimension breakdown and gap indicators. Score updates as AI extracts facts from chat.
4. **Document Menu** → 7 document types with readiness percentage per type.
5. **Quality Slider + Pricing** → Continuous slider. Price = BasePrice × QualityMultiplier (1x–5x). Detail depth scales with slider.
6. **Fact Review** → AI-extracted facts shown for user confirmation before payment.
7. **Pay + Generate** → Stripe per-document payment. Document generates in DOCX, PDF, or Markdown.
8. **Compare** → Optional: generate same document with different AI providers and compare side-by-side.

---

## TECH STACK (KEEP)

- **Backend:** NestJS (Express 5), TypeScript, Prisma ORM, PostgreSQL 16
- **Frontend:** React 19, Vite 7, Tailwind CSS, TypeScript
- **Infra:** Azure App Service, Azure PostgreSQL, Azure Blob Storage, Azure Cache for Redis
- **Auth:** JWT + OAuth + MFA (existing module — no changes)
- **CI/CD:** GitHub Actions, Docker, Azure Pipelines
- **Payments:** Stripe (switching from subscriptions to per-document PaymentIntents)

---

## ARCHITECTURE (V1)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React SPA  │────▶│  NestJS API  │────▶│  PostgreSQL 16  │
│  (Vite 7)   │     │  (Express 5) │     │  (Prisma ORM)   │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────┴───────┐
                    │  AI Gateway  │
                    │  (Router)    │
                    ├──────────────┤
                    │ Claude       │  ← Adapter pattern
                    │ OpenAI       │  ← Same interface
                    └──────────────┘
```

### API Modules — Current State vs Target

| Module | Status | Action |
|--------|--------|--------|
| auth | KEEP | No changes |
| users | KEEP | No changes |
| adaptive-logic | KEEP | No changes |
| admin | KEEP | No changes |
| notifications | KEEP | No changes |
| payment | MODIFY | Switch from subscriptions to per-document PaymentIntents |
| scoring-engine | REPLACE | → quality-scoring (standards-benchmarked) |
| document-generator | REPLACE | → document-generation (AI-powered with quality calibration) |
| questionnaire | REPLACE | → chat-engine (conversational AI) |
| session | REPLACE | → absorbed into Project model |
| heatmap | REPLACE | → absorbed into Dashboard (quality score visualisation) |
| ai-gateway | NEW | Provider-agnostic AI routing |
| chat-engine | NEW | Conversational AI interface |
| fact-extraction | NEW | Extract structured facts from chat |
| document-commerce | NEW | Document menu, quality slider, pricing |
| evidence-registry | DEFER | Hide from nav, keep code for V2 |
| decision-log | DEFER | Hide from nav, keep code for V2 |
| policy-pack | DEFER | Hide from nav, keep code for V2 |
| standards | DEFER | Hide from nav, keep code for V2 |
| adapters | DEFER | Hide from nav, keep code for V2 |
| qpg | REMOVE | Remove import from app.module.ts |

---

## NEW DATA MODELS (Phase 2)

Add these to prisma/schema.prisma. All additions are additive — no destructive changes to existing models.

### New Enums
```prisma
enum ProjectType {
  BUSINESS_PLAN
  TECH_ARCHITECTURE
  MARKETING_STRATEGY
  FINANCIAL_PROJECTIONS
  INVESTOR_PITCH
  AI_DEVELOPMENT
  CUSTOM
}

enum ProjectStatus {
  ACTIVE
  CHAT_LIMIT_REACHED
  DOCUMENTS_GENERATED
  ARCHIVED
}

enum ChatRole {
  USER
  ASSISTANT
  SYSTEM
}

enum DocumentFormat {
  DOCX
  PDF
  MARKDOWN
}

enum GenerationStatus {
  QUEUED
  GENERATING
  COMPLETED
  FAILED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

### New Models
```prisma
model Project {
  id            String        @id @default(uuid())
  workspaceId   String        // maps to Organization.id
  name          String
  description   String?
  projectType   ProjectType
  qualityScore  Float         @default(0)
  messageCount  Int           @default(0)
  status        ProjectStatus @default(ACTIVE)
  aiProvider    String        @default("claude") // user's preferred provider
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  workspace     Organization  @relation(fields: [workspaceId], references: [id])
  messages      ChatMessage[]
  facts         ExtractedFact[]
  scores        DimensionScore[]
  documents     GeneratedDocument[]

  @@index([workspaceId])
}

model ChatMessage {
  id          String    @id @default(uuid())
  projectId   String
  role        ChatRole
  content     String
  metadata    Json?     // token count, provider, latency
  createdAt   DateTime  @default(now())

  project     Project   @relation(fields: [projectId], references: [id])
  facts       ExtractedFact[] @relation("SourceMessage")

  @@index([projectId, createdAt])
}

model ExtractedFact {
  id              String    @id @default(uuid())
  projectId       String
  fieldName       String    // e.g. "company_name", "target_market"
  fieldValue      String
  confidence      Float     @default(0.5) // 0–1
  confirmedByUser Boolean   @default(false)
  sourceMessageId String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  project         Project       @relation(fields: [projectId], references: [id])
  sourceMessage   ChatMessage?  @relation("SourceMessage", fields: [sourceMessageId], references: [id])

  @@index([projectId])
  @@unique([projectId, fieldName])
}

model QualityDimension {
  id                String    @id @default(uuid())
  projectType       ProjectType
  name              String    // e.g. "Market Analysis", "Financial Viability"
  description       String
  weight            Float     @default(1.0)
  benchmarkCriteria Json      // array of criteria with references to standards
  sortOrder         Int       @default(0)

  scores            DimensionScore[]

  @@unique([projectType, name])
}

model DimensionScore {
  id              String    @id @default(uuid())
  projectId       String
  dimensionId     String
  score           Float     @default(0) // 0–100
  coveredCriteria Int       @default(0)
  totalCriteria   Int       @default(0)
  updatedAt       DateTime  @updatedAt

  project         Project           @relation(fields: [projectId], references: [id])
  dimension       QualityDimension  @relation(fields: [dimensionId], references: [id])

  @@unique([projectId, dimensionId])
}

model DocumentType {
  id                  String    @id @default(uuid())
  slug                String    @unique
  name                String
  description         String
  basePrice           Float     // in AUD
  qualitySliderEnabled Boolean  @default(true)
  formatOptions       Json      // ["DOCX", "PDF", "MARKDOWN"]
  projectTypes        Json      // which project types this doc applies to
  sortOrder           Int       @default(0)

  documents           GeneratedDocument[]
}

model GeneratedDocument {
  id              String           @id @default(uuid())
  projectId       String
  documentTypeId  String
  qualityLevel    Float            // 0–1 (slider position)
  price           Float            // calculated: basePrice × multiplier
  providerId      String           // "claude" or "openai"
  status          GenerationStatus @default(QUEUED)
  format          DocumentFormat
  fileUrl         String?          // Azure Blob URL after generation
  comparisonGroup String?          // UUID grouping docs for comparison
  tokenCount      Int?
  generatedAt     DateTime?
  createdAt       DateTime         @default(now())

  project         Project      @relation(fields: [projectId], references: [id])
  documentType    DocumentType @relation(fields: [documentTypeId], references: [id])
  payment         Payment?

  @@index([projectId])
}

model AiProvider {
  id          String    @id @default(uuid())
  slug        String    @unique // "claude", "openai"
  name        String    // "Claude (Anthropic)", "GPT-4o (OpenAI)"
  apiEndpoint String
  modelMap    Json      // { "chat": "model-id", "extract": "model-id", "generate": "model-id" }
  isActive    Boolean   @default(true)
  config      Json?     // rate limits, fallback settings
  createdAt   DateTime  @default(now())
}

model Payment {
  id                    String        @id @default(uuid())
  userId                String
  generatedDocumentId   String        @unique
  amount                Float
  currency              String        @default("AUD")
  stripePaymentIntentId String?
  status                PaymentStatus @default(PENDING)
  createdAt             DateTime      @default(now())

  user                  User          @relation(fields: [userId], references: [id])
  document              GeneratedDocument @relation(fields: [generatedDocumentId], references: [id])
}
```

---

## DOCUMENT TYPES (V1)

| # | Slug | Name | Formats |
|---|------|------|---------|
| 1 | business-plan | Business Plan | DOCX, PDF |
| 2 | tech-architecture | CTO / Architecture Pack | DOCX, PDF, MD |
| 3 | marketing-strategy | Marketing Strategy | DOCX, PDF |
| 4 | financial-projections | Financial Projections | DOCX, PDF |
| 5 | investor-pitch | Investor Pitch Content | DOCX, PDF |
| 6 | ai-dev-prompts | AI Development Prompts | MD |
| 7 | custom | Custom Document | DOCX, PDF, MD |

---

## QUALITY SLIDER → PRICE MAPPING

```
Slider Position → Quality Multiplier → Price
0–25%           → 1.0x (Essential)   → Base price
25–50%          → 2.0x (Standard)    → 2× base
50–75%          → 3.5x (Professional)→ 3.5× base
75–100%         → 5.0x (Enterprise)  → 5× base
```

Continuous interpolation between breakpoints. Formula:
`Price = BasePrice × lerp(breakpoints, sliderPosition)`

---

## EXECUTION RULES (AVI-OS)

These rules apply to ALL work on this project:

1. **No implied work.** If you haven't produced it, it doesn't exist. Never say "I've set up" or "I've configured" without showing the output.
2. **No analysis loops.** If you've spent more than 2 prompts discussing how to do something, stop talking and start doing.
3. **Phase-gated delivery.** Each phase has acceptance criteria. Do not start the next phase until the current phase is verified.
4. **File-level specificity.** Every task names exact files to create or modify. If a task is ambiguous, ask — don't guess.
5. **Test everything.** No phase is complete without its tests passing.
6. **Additive changes only.** Never delete existing working models or modules. Add alongside, then switch references.
7. **Git discipline.** Commit after each completed task. Branch per phase: `phase-1/fix-deployment`, `phase-2/data-model`, etc.

---

## PHASE EXECUTION

Phase kits are in `/docs/phase-kits/`. Each kit contains:
- Exact tasks with file paths
- Code specifications where needed
- Acceptance criteria
- Dependencies on prior phases

Execute phases in order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

**Current phase:** Phase 1 (Fix Deployment)

---

## KEY REFERENCE DOCUMENTS

| Document | Location | Purpose |
|----------|----------|---------|
| PRD v1.0 | docs/Quiz2Biz-PRD-v1.docx | What to build (approved) |
| SOW v2.0 | docs/Quiz2Biz-Revised-SOW-v2.docx | How to build it (approved) |
| Phase Kits | docs/phase-kits/*.md | Execution instructions per phase |
| This file | CLAUDE.md | Persistent context for Claude Code |

---

## V2 DEFERRED FEATURES (DO NOT BUILD)

- Public API for coding agents
- Microsoft Teams / Marketplace integration
- Mobile app
- Evidence Registry (keep code, hide nav)
- Decision Log (keep code, hide nav)
- Team collaboration features
- Adapters (GitHub/GitLab/Jira)

---

## ENVIRONMENT VARIABLES REQUIRED

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# AI Providers (NEW)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Stripe (modify from subscription to per-document)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=...

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://quiz2biz.com
```
