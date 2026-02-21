# V1 Gap Analysis (2026-02-21)

Source checklist: `docs/phase-kits/V1-ALIGNMENT-EXECUTION-TODO.md`
Audit basis: repository state in `main` worktree + live endpoint spot checks.

## 1) Current Snapshot

- Branch/worktree: `main` is very dirty locally (456 modified files).
- Upstream tracking: local `main` tracks `azure/main`.
- V1 groundwork exists: ProjectType + IdeaCapture schema/migration + Idea Capture API/UI are present.
- Live endpoint checks (today):
  - `https://www.quiz2biz.com/` -> `200`
  - `https://www.quiz2biz.com/health` -> `404`
  - `https://www.quiz2biz.com/api/v1/health` -> `200`
- Deploy workflow health-path mismatch was identified during audit and is now patched in workspace (pending CI rerun).

## 2) Status Summary (V1 TODO)

- Done: 10
- Partial: 4
- Missing: 10
- Total tracked items: 24

## 3) Detailed Gap Matrix

### Phase 1: Platform Contract Stabilization

- `P1.1` Normalize frontend navigation routes -> **DONE**
  - Evidence: `apps/web/src/components/layout/MainLayout.tsx` uses `/dashboard`, `/questionnaire/new`, `/documents`, `/billing`.
- `P1.2` Align billing API contracts -> **DONE**
  - Evidence: Frontend calls `/api/v1/payment/subscription/:org`, `/usage/:org`, `/invoices/:customer`, `/checkout`, `/portal` in `apps/web/src/api/billing.ts`.
- `P1.3` Add usage/cancel/resume endpoints -> **DONE**
  - Evidence: `@Get('usage/:organizationId')`, `@Post('cancel/:organizationId')`, `@Post('resume/:organizationId')` in `apps/api/src/modules/payment/payment.controller.ts`.
- `P1.4` Resolve breadcrumb/nav inconsistencies -> **PARTIAL**
  - Evidence: active layout routes are valid, but legacy breadcrumb mappings and references to `/settings` and older paths still exist in `apps/web/src/components/ux/Breadcrumbs.tsx`.
- `P1.5` Verify org context resolution for billing -> **DONE**
  - Evidence: billing resolves org via `/api/v1/users/me` in `apps/web/src/api/billing.ts`; backend exposes `GET /users/me` in `apps/api/src/modules/users/users.controller.ts`.

### Phase 2: Idea Capture and Project Type Selection

- `P2.1` Idea capture endpoint(s) -> **DONE**
  - Evidence: `POST /sessions/idea`, `GET /sessions/idea/:id`, `PATCH /sessions/idea/:id/confirm`, `POST /sessions/idea/:id/session` in `apps/api/src/modules/idea-capture/idea-capture.controller.ts`.
- `P2.2` AI recommendation + confidence + fallback trigger (<0.70 discovery) -> **PARTIAL**
  - Evidence: confidence exists and fallback analysis exists in `apps/api/src/modules/idea-capture/services/claude-ai.service.ts`.
  - Gap: no explicit low-confidence conversational-discovery trigger path implemented.
- `P2.3` Idea-capture UI + project-type selection UI -> **DONE**
  - Evidence: full page exists in `apps/web/src/pages/idea-capture/IdeaCapturePage.tsx`.
  - Evidence: override path now confirms selection before session creation.
- `P2.4` Session model wiring (`projectTypeId`, `ideaCaptureId`) -> **DONE**
  - Evidence: models/relations in `prisma/schema.prisma`, additive migration in `prisma/migrations/20260215000000_project_type_idea_capture_v1/migration.sql`, and session creation from idea in `apps/api/src/modules/idea-capture/services/idea-capture.service.ts`.

### Phase 3: Project-Type-Aware Engine

- `P3.1` Scope scoring dimensions by project type -> **DONE**
  - Evidence: projectType filter in `apps/api/src/modules/scoring-engine/scoring-engine.service.ts` and `apps/api/src/modules/heatmap/heatmap.service.ts`.
- `P3.2` Per-document readiness thresholds -> **MISSING**
  - Evidence: generation checks required questions only; no per-document threshold model/logic in `apps/api/src/modules/document-generator/services/document-generator.service.ts`.
- `P3.3` Keep 95% gate only for Technical Architecture -> **DONE**
  - Evidence: both completion and `continueSession.canComplete` apply gate conditionally by readiness-gated project type in `apps/api/src/modules/session/session.service.ts`.
- `P3.4` Hide deferred legacy modules by default -> **DONE**
  - Evidence: backend legacy modules are feature-flagged in `apps/api/src/app.module.ts`; frontend legacy routes gated by `featureFlags.legacyModules` in `apps/web/src/App.tsx`.

### Phase 4: Content and Template Expansion

- `P4.1` 100+ questions per project type -> **MISSING**
  - Evidence: `prisma/seeds/business-incubator.seed.ts` header claims 330, but current seed contains 21 question definitions (`type: QuestionType.*` occurrences).
- `P4.2` 6-8 curated docs per project type -> **MISSING**
  - Evidence: `prisma/seeds/project-types.seed.ts` defines 7 document types total across 3 project types (none for `tech-assessment`).
- `P4.3` Generate DOCX/PDF/Markdown/XLSX -> **MISSING**
  - Evidence: request DTO allows DOCX only in `apps/api/src/modules/document-generator/dto/request-generation.dto.ts`; builder/storage are DOCX-specific in `apps/api/src/modules/document-generator/services/document-builder.service.ts` and `apps/api/src/modules/document-generator/services/storage.service.ts`.
- `P4.4` Best-practice guidance per question -> **PARTIAL**
  - Evidence: model mapping supports `bestPractice` + `practicalExplainer`; seed files contain many entries.
  - Gap: not validated for full coverage across all V1 project types/question sets.

### Phase 5: Validation and Launch Gate

- `P5.1` Web/API contract tests -> **PARTIAL**
  - Evidence: extensive unit/spec tests exist, but no dedicated contract test suite tied to V1 checklist found.
- `P5.2` Critical E2E full user flow -> **MISSING**
  - Gap: no verified idea-first full-flow E2E gate tied to acceptance matrix.
- `P5.3` Performance validation -> **MISSING**
  - Gap: scripts exist, but no current V1 benchmark pass artifact.
- `P5.4` Final acceptance matrix -> **MISSING**
  - Gap: no PASS/FAIL/BLOCKED matrix for current V1 scope.

### Phase 6: V1.1 Monetization Evolution

- `P6.1` Per-document checkout -> **MISSING**
- `P6.2` Tier limits + add-ons -> **MISSING**
- `P6.3` Purchase consumption reporting -> **MISSING**

## 4) Critical Blockers (Immediate)

1. Deploy verification pending rerun
- Health-path mismatch has been patched to `/api/v1/health`, but workflow success still needs confirmation after rerun.
- File: `.github/workflows/deploy.yml`.

2. Readiness gating inconsistency
- Completion endpoint is project-type aware, but `continueSession.canComplete` still enforces 95% globally.
- File: `apps/api/src/modules/session/session.service.ts`.

3. Idea-capture selection not fully committed when user overrides recommendation
- UI has confirm API available but does not call it before session creation.
- Files: `apps/web/src/pages/idea-capture/IdeaCapturePage.tsx`, `apps/web/src/api/idea-capture.ts`.

## 5) Prioritized Execution TODO

### P0 (Do first: unblock production + core flow)

- [x] Fix deployment health path to `/api/v1/health` in `.github/workflows/deploy.yml`.
- [ ] Re-run deploy workflow and verify health check passes.
- [x] Fix `continueSession.canComplete` to apply 95% threshold only for readiness-gated project types.
- [x] Wire `confirmProjectType()` call in Idea Capture UI when user selects a non-recommended type.

### P1 (Complete V1 functional scope)

- [ ] Add explicit low-confidence discovery path (<0.70) from idea analysis to guided follow-up questions.
- [ ] Implement per-document readiness thresholds and generation eligibility in backend + UI.
- [ ] Expand project types to the locked V1 set (Business Plan, Technical Architecture, Marketing Strategy, AI Prompts, Custom Project).
- [ ] Expand question banks to meet quality bar (100+ questions per project type).
- [ ] Expand doc catalog to >=6 outputs per project type.

### P2 (Launch gate)

- [ ] Add contract tests for critical web->API paths used by idea-first and billing flows.
- [ ] Add critical E2E for: idea capture -> project type confirm -> questionnaire -> score -> doc generation.
- [ ] Produce benchmark report (API latency, page load, generation latency).
- [ ] Publish acceptance matrix with PASS/FAIL/BLOCKED and owner signoff.

## 6) Recommended Next Commit Scope

Keep first commit small and high-leverage:

1. Deploy health path fix
2. Session gating consistency fix
3. Idea capture override confirmation wiring

This closes the top 3 blockers with minimal blast radius.

## 7) Execution Update (Applied in this workspace)

- [x] Deploy health path updated to `/api/v1/health` in `.github/workflows/deploy.yml`.
- [x] `continueSession.canComplete` now applies 95% gate only for readiness-gated project types in `apps/api/src/modules/session/session.service.ts`.
- [x] Idea Capture override now confirms selected project type before session creation in `apps/web/src/pages/idea-capture/IdeaCapturePage.tsx`.
- [ ] Workflow rerun + production verification still required.
