# V1 Alignment Execution TODO

Date: 2026-02-18
Source of truth: Quiz2Biz-Change-Specification.docx
Legacy reference: Quiz2Biz qoder explain.docx (non-authoritative where conflicting)

## Locked Product Decisions
- Product direction: Idea-to-documents pivot (Change Specification)
- Legacy readiness modules: hidden/deferred in default V1 UX (feature-flag retained)
- Project type selection: AI recommendation + user override; conversational discovery when confidence < 0.70
- V1 project types (day-1): Business Plan, Technical Architecture, Marketing Strategy, AI Prompts, Custom Project
- Quality bar: 100+ questions and 6+ document outputs per project type
- Output formats: DOCX + PDF + Markdown + XLSX
- Generation gating: per-document thresholds; 95% hard gate only for Technical Architecture
- Billing V1: existing tiers (Free/Pro/Enterprise), limits 2/30/unlimited documents per month
- Billing evolution: per-document purchase in V1.1
- Legacy data: existing sessions/docs remain read-only
- Launch gating: hard gate all acceptance criteria and critical E2E
- Execution strategy: platform-first

## Phase 1: Platform Contract Stabilization (In Progress)
Objective: Remove broken routes/contracts before feature expansion.

- [x] P1.1 Normalize frontend navigation routes to valid app routes
  - Acceptance: No default nav links to dead routes
  - Files: `apps/web/src/components/layout/MainLayout.tsx`, route-related tests/components
- [ ] P1.2 Align billing API contracts (frontend to current backend endpoints) (partial: frontend side complete)
  - Acceptance: Billing page can load subscription, usage, invoices, and checkout initiation without 404/422 contract errors
  - Files: `apps/web/src/api/billing.ts`, `apps/api/src/modules/payment/*`
- [ ] P1.3 Add missing billing endpoints required by current UX (usage/cancel/resume)
  - Acceptance: Endpoints documented in OpenAPI and covered by integration tests
- [ ] P1.4 Resolve breadcrumb/nav inconsistencies (`/questionnaires`, `/settings`, etc.)
  - Acceptance: Breadcrumb mappings match active routes
- [ ] P1.5 Verify auth/me and users/me usage for org context in billing
  - Acceptance: billing functions consistently resolve organization context

## Phase 2: Idea Capture and Project Type Selection
Objective: Implement idea-first onboarding flow.

- [ ] P2.1 Add idea capture endpoint(s)
  - Acceptance: user can submit free-form idea text and receive analysis payload
- [ ] P2.2 Add AI recommendation + confidence score + fallback trigger
  - Acceptance: confidence threshold (<0.70) activates conversational discovery path
- [ ] P2.3 Build idea-capture UI + project-type selection UI
  - Acceptance: user can accept recommendation or override project type
- [ ] P2.4 Session model wiring for `projectTypeId` and `ideaCaptureId`
  - Acceptance: selected project type persists into session/question loading

## Phase 3: Project-Type-Aware Engine
Objective: Make core runtime fully project-type driven.

- [ ] P3.1 Scope scoring dimensions by project type
  - Acceptance: scoring engine no longer uses global active dimensions for non-technical flows
- [ ] P3.2 Implement per-document readiness thresholds
  - Acceptance: each document exposes readiness status and generation eligibility
- [ ] P3.3 Keep 95% gate only for Technical Architecture type
  - Acceptance: other project types can complete based on document thresholds
- [ ] P3.4 Disable deferred legacy modules from default V1 navigation
  - Acceptance: Evidence/Decision/Policy/QPG hidden unless feature-flag enabled

## Phase 4: Content and Template Expansion
Objective: Meet launch quality bar for all 5 project types.

- [ ] P4.1 Build 100+ question sets for each project type
- [ ] P4.2 Build 6-8 curated document outputs per project type
- [ ] P4.3 Implement generation for DOCX/PDF/Markdown/XLSX
- [ ] P4.4 Ensure best-practice guidance and practical explainers per question

## Phase 5: Validation and Launch Gate
Objective: hard-gated launch readiness.

- [ ] P5.1 Contract tests for web <-> API paths/payloads
- [ ] P5.2 Critical E2E suite for full user flow
- [ ] P5.3 Performance validation against existing benchmarks
- [ ] P5.4 Final acceptance matrix (PASS/FAIL/BLOCKED)

## Phase 6: V1.1 Monetization Evolution
Objective: Add per-document purchasing.

- [ ] P6.1 Introduce per-document checkout model
- [ ] P6.2 Keep existing tier limits while add-on purchases are enabled
- [ ] P6.3 Reporting + guardrails for document purchase consumption

## Execution Log
- 2026-02-18: backlog created; Phase 1 execution started.
- 2026-02-18: P1.1 implemented in main navigation and related route-mapping/test files.
- 2026-02-18: P1.2 frontend-side billing contract alignment implemented with org resolution and endpoint/path fixes; backend endpoint completion still pending.
