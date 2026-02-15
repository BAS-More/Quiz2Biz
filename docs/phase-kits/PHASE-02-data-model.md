# Phase 2: Data Model

> **Objective:** Create new database entities for chat-first architecture. All migrations additive — no destructive changes.
> **Branch:** `phase-2/data-model`
> **Dependencies:** Phase 1 complete (site running)
> **Acceptance:** All new models exist. Seeds run. Existing data unaffected. All existing tests pass.

---

## Pre-flight

```bash
git checkout main
git pull origin main
git merge phase-1/fix-deployment  # only after Phase 1 verified
git checkout -b phase-2/data-model
```

---

## Task 2.1–2.9 — Add New Models to Prisma Schema

**File:** `prisma/schema.prisma`

**Action:** Add ALL enums and models specified in CLAUDE.md under "NEW DATA MODELS (Phase 2)". Copy them exactly as specified. Do NOT modify any existing models.

**Critical rules:**
- Add new enums AFTER existing enums
- Add new models AFTER existing models
- The `Project.workspaceId` references the existing `Organization.id` — add the relation to the Organization model: `projects Project[]`
- The `Payment.userId` references the existing `User.id` — add the relation to the User model: `payments Payment[]`
- Do NOT rename, drop, or alter any existing model, enum, or field

**Verify after editing:**
```bash
npx prisma validate
```

Must return: "The schema is valid."

---

## Task 2.10 — Generate and Run Migration

```bash
# Generate migration (review SQL before applying)
npx prisma migrate dev --name add-chat-first-models --create-only

# Review the generated SQL file in prisma/migrations/
# Verify it's purely additive (CREATE TABLE, ALTER TABLE ADD)
# NO DROP TABLE, NO DROP COLUMN, NO ALTER TABLE DROP

# Apply migration
npx prisma migrate dev

# Generate updated Prisma client
npx prisma generate
```

**Output:** Migration applied. `npx prisma migrate status` shows all migrations applied.

---

## Task 2.11 — Seed: Project Types with Quality Dimensions (Business Plan + Tech Architecture)

**Create file:** `prisma/seeds/project-types.seed.ts`

```typescript
import { PrismaClient, ProjectType } from '@prisma/client';

const prisma = new PrismaClient();

const businessPlanDimensions = [
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Executive Summary',
    description: 'Clear articulation of business concept, value proposition, and market opportunity',
    weight: 1.2,
    sortOrder: 1,
    benchmarkCriteria: JSON.stringify([
      { id: 'es-1', criterion: 'Business concept defined in one paragraph', standard: 'SBA Business Plan Guide', required: true },
      { id: 'es-2', criterion: 'Value proposition clearly stated', standard: 'Lean Canvas Framework', required: true },
      { id: 'es-3', criterion: 'Target market identified', standard: 'ISO 20671 Brand Evaluation', required: true },
      { id: 'es-4', criterion: 'Revenue model defined', standard: 'Business Model Canvas', required: true },
      { id: 'es-5', criterion: 'Funding requirements stated (if applicable)', standard: 'Investor Due Diligence Standards', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Market Analysis',
    description: 'Market size, segmentation, competition, and positioning',
    weight: 1.3,
    sortOrder: 2,
    benchmarkCriteria: JSON.stringify([
      { id: 'ma-1', criterion: 'Total Addressable Market (TAM) quantified', standard: 'McKinsey Market Sizing Framework', required: true },
      { id: 'ma-2', criterion: 'Serviceable Addressable Market (SAM) defined', standard: 'McKinsey Market Sizing Framework', required: true },
      { id: 'ma-3', criterion: 'Target customer segments identified with demographics', standard: 'ISO 20671', required: true },
      { id: 'ma-4', criterion: 'Competitive landscape mapped (direct + indirect)', standard: 'Porter Five Forces', required: true },
      { id: 'ma-5', criterion: 'Competitive advantages articulated', standard: 'Blue Ocean Strategy Framework', required: true },
      { id: 'ma-6', criterion: 'Market trends and growth projections cited', standard: 'Industry analyst reports', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Operations Plan',
    description: 'How the business will operate day-to-day',
    weight: 1.0,
    sortOrder: 3,
    benchmarkCriteria: JSON.stringify([
      { id: 'op-1', criterion: 'Key processes defined', standard: 'ISO 9001 Process Approach', required: true },
      { id: 'op-2', criterion: 'Supply chain or service delivery model described', standard: 'SCOR Model', required: true },
      { id: 'op-3', criterion: 'Technology stack or tools identified', standard: 'Best practice', required: false },
      { id: 'op-4', criterion: 'Quality control measures defined', standard: 'ISO 9001', required: false },
      { id: 'op-5', criterion: 'Scalability approach described', standard: 'Best practice', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Financial Viability',
    description: 'Revenue model, cost structure, projections, and funding',
    weight: 1.4,
    sortOrder: 4,
    benchmarkCriteria: JSON.stringify([
      { id: 'fv-1', criterion: 'Revenue streams identified with pricing model', standard: 'Business Model Canvas', required: true },
      { id: 'fv-2', criterion: 'Cost structure broken down (fixed vs variable)', standard: 'Managerial Accounting Standards', required: true },
      { id: 'fv-3', criterion: 'Break-even analysis provided', standard: 'Financial Analysis Best Practice', required: true },
      { id: 'fv-4', criterion: '12-month cash flow projection', standard: 'AASB 107 Cash Flow Statements', required: true },
      { id: 'fv-5', criterion: '3-year P&L projection', standard: 'AASB Framework', required: false },
      { id: 'fv-6', criterion: 'Funding requirements and use of funds', standard: 'Investor Due Diligence', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Team & Leadership',
    description: 'Founders, key hires, advisors, and organisational structure',
    weight: 0.8,
    sortOrder: 5,
    benchmarkCriteria: JSON.stringify([
      { id: 'tl-1', criterion: 'Founder backgrounds and relevant experience', standard: 'Best practice', required: true },
      { id: 'tl-2', criterion: 'Key roles identified with hiring timeline', standard: 'Organisational Design', required: true },
      { id: 'tl-3', criterion: 'Advisory board or mentors (if any)', standard: 'Best practice', required: false },
      { id: 'tl-4', criterion: 'Equity structure or partnership terms', standard: 'Legal best practice', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Risk Assessment',
    description: 'Risk identification, mitigation strategies, and contingencies',
    weight: 0.9,
    sortOrder: 6,
    benchmarkCriteria: JSON.stringify([
      { id: 'ra-1', criterion: 'Top 5 risks identified with probability and impact', standard: 'ISO 31000 Risk Management', required: true },
      { id: 'ra-2', criterion: 'Mitigation strategy per risk', standard: 'ISO 31000', required: true },
      { id: 'ra-3', criterion: 'Regulatory and compliance risks addressed', standard: 'Industry-specific regulations', required: true },
      { id: 'ra-4', criterion: 'Contingency plans for critical failures', standard: 'Business Continuity ISO 22301', required: false },
    ]),
  },
  {
    projectType: ProjectType.BUSINESS_PLAN,
    name: 'Legal & Compliance',
    description: 'Business structure, IP, regulatory requirements',
    weight: 0.7,
    sortOrder: 7,
    benchmarkCriteria: JSON.stringify([
      { id: 'lc-1', criterion: 'Business structure defined (Pty Ltd, sole trader, etc.)', standard: 'ASIC requirements', required: true },
      { id: 'lc-2', criterion: 'IP protection strategy (if applicable)', standard: 'IP Australia Guidelines', required: false },
      { id: 'lc-3', criterion: 'Privacy and data obligations identified', standard: 'Australian Privacy Act 1988', required: false },
      { id: 'lc-4', criterion: 'Industry-specific licences or permits', standard: 'Regulatory requirements', required: false },
    ]),
  },
];

const techArchitectureDimensions = [
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'System Architecture',
    description: 'High-level architecture, patterns, and technology choices',
    weight: 1.3,
    sortOrder: 1,
    benchmarkCriteria: JSON.stringify([
      { id: 'sa-1', criterion: 'Architecture pattern selected and justified (monolith, microservices, serverless)', standard: 'IEEE 42010 Architecture Description', required: true },
      { id: 'sa-2', criterion: 'Component diagram with interfaces', standard: 'UML 2.5 / C4 Model', required: true },
      { id: 'sa-3', criterion: 'Technology stack fully specified with versions', standard: 'Best practice', required: true },
      { id: 'sa-4', criterion: 'Deployment architecture (cloud, hybrid, on-prem)', standard: 'AWS/Azure/GCP Well-Architected', required: true },
      { id: 'sa-5', criterion: 'Scalability strategy (horizontal/vertical, auto-scaling)', standard: 'Cloud Well-Architected Frameworks', required: true },
    ]),
  },
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'Data Architecture',
    description: 'Database design, data flow, storage, and access patterns',
    weight: 1.2,
    sortOrder: 2,
    benchmarkCriteria: JSON.stringify([
      { id: 'da-1', criterion: 'Data model (ERD or equivalent) documented', standard: 'IEEE 42010', required: true },
      { id: 'da-2', criterion: 'Database technology selected with justification', standard: 'CAP Theorem analysis', required: true },
      { id: 'da-3', criterion: 'Data retention and archiving policy', standard: 'GDPR/Privacy Act requirements', required: true },
      { id: 'da-4', criterion: 'Backup and recovery strategy', standard: 'ISO 27001 A.12.3', required: true },
      { id: 'da-5', criterion: 'Data migration plan (if applicable)', standard: 'Best practice', required: false },
    ]),
  },
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'Security Architecture',
    description: 'Authentication, authorization, encryption, and threat modelling',
    weight: 1.4,
    sortOrder: 3,
    benchmarkCriteria: JSON.stringify([
      { id: 'sec-1', criterion: 'Authentication mechanism defined (OAuth2, JWT, MFA)', standard: 'OWASP ASVS Level 2', required: true },
      { id: 'sec-2', criterion: 'Authorization model (RBAC, ABAC) defined', standard: 'NIST AC-3', required: true },
      { id: 'sec-3', criterion: 'Data encryption at rest and in transit', standard: 'ISO 27001 A.10', required: true },
      { id: 'sec-4', criterion: 'OWASP Top 10 mitigations addressed', standard: 'OWASP Top 10 (latest)', required: true },
      { id: 'sec-5', criterion: 'Secrets management approach', standard: 'CIS Benchmark', required: true },
      { id: 'sec-6', criterion: 'Threat model documented', standard: 'STRIDE/DREAD', required: false },
    ]),
  },
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'API Design',
    description: 'API strategy, documentation, versioning, and contracts',
    weight: 1.0,
    sortOrder: 4,
    benchmarkCriteria: JSON.stringify([
      { id: 'api-1', criterion: 'API style defined (REST, GraphQL, gRPC)', standard: 'Best practice', required: true },
      { id: 'api-2', criterion: 'API documentation standard (OpenAPI/Swagger)', standard: 'OpenAPI 3.x', required: true },
      { id: 'api-3', criterion: 'Versioning strategy defined', standard: 'Semantic Versioning', required: true },
      { id: 'api-4', criterion: 'Rate limiting and throttling', standard: 'API Gateway Best Practice', required: false },
      { id: 'api-5', criterion: 'Error handling contract', standard: 'RFC 7807 Problem Details', required: false },
    ]),
  },
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'DevOps & CI/CD',
    description: 'Build, test, deploy, and monitoring pipeline',
    weight: 1.1,
    sortOrder: 5,
    benchmarkCriteria: JSON.stringify([
      { id: 'dev-1', criterion: 'CI pipeline defined (lint, test, build)', standard: 'DORA Metrics Framework', required: true },
      { id: 'dev-2', criterion: 'CD pipeline with staging and production', standard: 'DORA Metrics Framework', required: true },
      { id: 'dev-3', criterion: 'Infrastructure as Code (Terraform, Pulumi)', standard: 'Best practice', required: true },
      { id: 'dev-4', criterion: 'Monitoring and alerting strategy', standard: 'Google SRE Handbook', required: true },
      { id: 'dev-5', criterion: 'Incident response process', standard: 'ISO 27035', required: false },
    ]),
  },
  {
    projectType: ProjectType.TECH_ARCHITECTURE,
    name: 'Testing Strategy',
    description: 'Test levels, automation, coverage targets',
    weight: 0.9,
    sortOrder: 6,
    benchmarkCriteria: JSON.stringify([
      { id: 'ts-1', criterion: 'Test pyramid defined (unit, integration, e2e)', standard: 'ISTQB Foundation', required: true },
      { id: 'ts-2', criterion: 'Coverage targets per level', standard: 'Best practice', required: true },
      { id: 'ts-3', criterion: 'Test automation framework selected', standard: 'Best practice', required: true },
      { id: 'ts-4', criterion: 'Performance/load testing approach', standard: 'ISO 25010 Performance Efficiency', required: false },
      { id: 'ts-5', criterion: 'Security testing (SAST, DAST)', standard: 'OWASP Testing Guide', required: false },
    ]),
  },
];

export async function seedProjectTypes() {
  const allDimensions = [...businessPlanDimensions, ...techArchitectureDimensions];

  for (const dim of allDimensions) {
    await prisma.qualityDimension.upsert({
      where: {
        projectType_name: {
          projectType: dim.projectType,
          name: dim.name,
        },
      },
      update: dim,
      create: dim,
    });
  }

  console.log(`Seeded ${allDimensions.length} quality dimensions`);
}
```

**Output:** 13 quality dimensions seeded (7 Business Plan + 6 Tech Architecture).

---

## Task 2.12 — Seed: Document Types

**Create file:** `prisma/seeds/document-types-v2.seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const documentTypes = [
  {
    slug: 'business-plan',
    name: 'Business Plan',
    description: 'Comprehensive business plan covering market analysis, operations, financials, and strategy.',
    basePrice: 29.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF']),
    projectTypes: JSON.stringify(['BUSINESS_PLAN', 'CUSTOM']),
    sortOrder: 1,
  },
  {
    slug: 'tech-architecture',
    name: 'CTO / Architecture Pack',
    description: 'Technical architecture documentation including system design, data models, security, and DevOps.',
    basePrice: 39.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF', 'MARKDOWN']),
    projectTypes: JSON.stringify(['TECH_ARCHITECTURE', 'CUSTOM']),
    sortOrder: 2,
  },
  {
    slug: 'marketing-strategy',
    name: 'Marketing Strategy',
    description: 'Go-to-market strategy, channel plan, content strategy, and growth projections.',
    basePrice: 25.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF']),
    projectTypes: JSON.stringify(['MARKETING_STRATEGY', 'CUSTOM']),
    sortOrder: 3,
  },
  {
    slug: 'financial-projections',
    name: 'Financial Projections',
    description: 'Revenue model, cost structure, cash flow projections, break-even analysis.',
    basePrice: 35.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF']),
    projectTypes: JSON.stringify(['FINANCIAL_PROJECTIONS', 'CUSTOM']),
    sortOrder: 4,
  },
  {
    slug: 'investor-pitch',
    name: 'Investor Pitch Content',
    description: 'Pitch deck content, executive summary, and investor-facing materials.',
    basePrice: 35.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF']),
    projectTypes: JSON.stringify(['INVESTOR_PITCH', 'CUSTOM']),
    sortOrder: 5,
  },
  {
    slug: 'ai-dev-prompts',
    name: 'AI Development Prompts',
    description: 'Structured prompts for AI-assisted development: CLAUDE.md, system prompts, agent specs.',
    basePrice: 19.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['MARKDOWN']),
    projectTypes: JSON.stringify(['AI_DEVELOPMENT', 'TECH_ARCHITECTURE', 'CUSTOM']),
    sortOrder: 6,
  },
  {
    slug: 'custom',
    name: 'Custom Document',
    description: 'User-defined document type. AI generates based on chat context and user instructions.',
    basePrice: 25.00,
    qualitySliderEnabled: true,
    formatOptions: JSON.stringify(['DOCX', 'PDF', 'MARKDOWN']),
    projectTypes: JSON.stringify(['BUSINESS_PLAN', 'TECH_ARCHITECTURE', 'MARKETING_STRATEGY', 'FINANCIAL_PROJECTIONS', 'INVESTOR_PITCH', 'AI_DEVELOPMENT', 'CUSTOM']),
    sortOrder: 7,
  },
];

export async function seedDocumentTypes() {
  for (const dt of documentTypes) {
    await prisma.documentType.upsert({
      where: { slug: dt.slug },
      update: dt,
      create: dt,
    });
  }

  console.log(`Seeded ${documentTypes.length} document types`);
}
```

**Output:** 7 document types seeded with base prices in AUD.

---

## Task 2.13 — Seed: AI Providers

**Create file:** `prisma/seeds/ai-providers.seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const providers = [
  {
    slug: 'claude',
    name: 'Claude (Anthropic)',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    modelMap: JSON.stringify({
      chat: 'claude-sonnet-4-5-20250929',
      extract: 'claude-sonnet-4-5-20250929',
      generate: 'claude-sonnet-4-5-20250929',
    }),
    isActive: true,
    config: JSON.stringify({
      maxTokens: 8192,
      rateLimitRpm: 50,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    }),
  },
  {
    slug: 'openai',
    name: 'GPT-4o (OpenAI)',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelMap: JSON.stringify({
      chat: 'gpt-4o',
      extract: 'gpt-4o',
      generate: 'gpt-4o',
    }),
    isActive: true,
    config: JSON.stringify({
      maxTokens: 4096,
      rateLimitRpm: 60,
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
    }),
  },
];

export async function seedAiProviders() {
  for (const p of providers) {
    await prisma.aiProvider.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log(`Seeded ${providers.length} AI providers`);
}
```

---

## Task 2.14 — Seed: Quality Dimensions for Remaining 5 Project Types

**Create file:** `prisma/seeds/quality-dimensions.seed.ts`

Build quality dimensions for: MARKETING_STRATEGY, FINANCIAL_PROJECTIONS, INVESTOR_PITCH, AI_DEVELOPMENT, CUSTOM.

**Pattern:** Follow the same structure as Task 2.11. Each project type needs 4–7 dimensions with:
- Descriptive name
- Weight (0.5–1.5)
- 3–6 benchmark criteria per dimension
- Each criterion references a real standard or framework where possible

**Minimum dimensions per type:**

| Project Type | Dimensions (minimum) |
|---|---|
| MARKETING_STRATEGY | Target Audience, Channel Strategy, Content Plan, Budget & ROI, Brand Positioning |
| FINANCIAL_PROJECTIONS | Revenue Model, Cost Structure, Cash Flow, Break-Even, Funding |
| INVESTOR_PITCH | Problem & Solution, Market Opportunity, Business Model, Traction, Team, Ask |
| AI_DEVELOPMENT | Problem Definition, Data Strategy, Model Architecture, Evaluation, Deployment, Ethics |
| CUSTOM | Clarity of Purpose, Completeness, Structure, Evidence, Actionability |

**Output:** All project types have quality dimensions seeded.

---

## Task 2.15 — Update Main Seed File

**Modify file:** `prisma/seed.ts`

Add imports and calls for all new seed functions:

```typescript
import { seedProjectTypes } from './seeds/project-types.seed';
import { seedDocumentTypes } from './seeds/document-types-v2.seed';
import { seedAiProviders } from './seeds/ai-providers.seed';
import { seedQualityDimensions } from './seeds/quality-dimensions.seed';

// Add to main seed function, AFTER existing seeds:
await seedProjectTypes();
await seedDocumentTypes();
await seedAiProviders();
await seedQualityDimensions();
```

**Critical:** Do NOT remove existing seed calls. Add new ones after existing.

---

## Task 2.16 — Unit Tests for Model Relationships

**Create file:** `test/models/chat-first-models.spec.ts`

Test that:
1. Project can be created and linked to Organization (workspace)
2. ChatMessage can be created linked to Project
3. ExtractedFact can be created linked to Project and ChatMessage
4. QualityDimension can be queried by ProjectType
5. DimensionScore can be created linked to Project and QualityDimension
6. DocumentType can be queried by slug
7. GeneratedDocument can be created linked to Project and DocumentType
8. Payment can be created linked to User and GeneratedDocument
9. AiProvider can be queried by slug
10. Unique constraints work (e.g., duplicate ExtractedFact for same project+fieldName fails)

---

## Completion

```bash
npx prisma validate  # schema valid
npx prisma migrate dev  # migration applied
npx prisma db seed  # all seeds run
npm test  # all existing + new tests pass

git add -A
git commit -m "Phase 2: Data model — chat-first entities, seeds, tests"
git push origin phase-2/data-model
```

**Acceptance checklist:**
- [ ] `npx prisma validate` passes
- [ ] Migration is purely additive (no drops)
- [ ] All seeds run without errors
- [ ] All 7+ project types have quality dimensions
- [ ] All 7 document types seeded with prices
- [ ] Both AI providers seeded
- [ ] Model relationship tests pass
- [ ] ALL existing tests still pass
