# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiz2Biz (adaptive-questionnaire-system) — a SaaS platform for adaptive client questionnaires with scoring, evidence collection, policy generation, and document export. Turbo monorepo with three apps and three shared libraries.

## Monorepo Structure

- **apps/api** — NestJS 10 backend (PostgreSQL via Prisma, Redis via ioredis, JWT auth)
- **apps/web** — React 19 frontend (Vite, TanStack Query, Zustand, Tailwind CSS 4)
- **apps/cli** — CLI tool (Commander, Inquirer, Chalk)
- **libs/database** — Prisma NestJS module wrapper
- **libs/redis** — Redis NestJS module wrapper
- **libs/shared** — DTOs, validators, shared interfaces

## Common Commands

```bash
# Install & setup
npm install
cp .env.example .env
docker-compose up -d          # PostgreSQL + Redis
npm run db:migrate             # Prisma migrations
npm run db:seed                # Seed database

# Development
npm run dev                    # All apps via Turbo
npm run start:dev              # API only (--watch)

# Build
npm run build                  # All apps

# Testing
npm run test                   # All workspaces (Jest for API/CLI, Vitest for web)
npm run test -- --filter=api   # API tests only
npm run test -- --filter=web   # Web tests only
npx turbo run test --filter=cli # CLI tests only
npm run test:cov               # Coverage (80% threshold all workspaces)
npm run test:e2e               # Playwright E2E (requires built apps)
npm run test:regression        # Regression suite

# Single test file
cd apps/api && npx jest src/modules/auth/auth.service.spec.ts
cd apps/web && npx vitest src/pages/dashboard/Dashboard.test.tsx

# Linting & formatting
npm run lint                   # ESLint all workspaces
npm run lint:fix               # ESLint with autofix
npm run format                 # Prettier write
npm run format:check           # Prettier check

# Database
npm run db:generate            # Regenerate Prisma client
npm run db:migrate             # Run migrations (dev)
npm run db:studio              # Prisma Studio GUI
npm run db:reset               # Reset + re-seed
```

## Architecture

### Backend (apps/api)

NestJS modular architecture. Key modules under `src/modules/`:
- **auth** — JWT + OAuth (Google, GitHub, Microsoft), refresh tokens
- **questionnaire** — Question templates, 11 question types (see `QuestionType` enum in Prisma schema)
- **session** — Assessment session lifecycle and state management
- **adaptive-logic** — Conditional question visibility rules
- **scoring-engine** — 7-dimension scoring algorithm
- **document-generator** — DOCX/PDF export
- **evidence-registry** — Evidence collection with integrity verification
- **payment** — Stripe integration
- **adapters** — GitHub, GitLab, Jira-Confluence integrations

Cross-cutting concerns in `src/common/`: exception filters, CSRF guard, subscription guard, logging interceptor, response transformer.

Config files in `src/config/`: env loading, feature flags, Sentry, App Insights, resilience configs.

Health endpoints: `/health`, `/health/live`, `/health/ready`.

API prefix: `/api/v1`. Swagger docs at `/api/v1/docs`.

### Frontend (apps/web)

Page-based routing with React Router 7. Pages under `src/pages/` (auth, dashboard, questionnaire, heatmap, evidence, decisions, documents, policy-pack, billing, help, legal).

State management: Zustand stores in `src/stores/`, server state via TanStack React Query, forms via React Hook Form + Zod validation.

API client: Axios configured in `src/api/`.

### Shared Libraries

Path aliases configured in root `tsconfig.json`:
- `@app/*` → `apps/api/src/*`
- `@libs/database` → `libs/database`
- `@libs/redis` → `libs/redis`
- `@libs/shared` → `libs/shared`

## Code Style

- **Prettier**: single quotes, trailing commas, 100 char width, 2-space indent, LF line endings
- **TypeScript**: strict mode, ES2022 target, decorators enabled (NestJS)
- **Backend tests**: `*.spec.ts` (Jest + ts-jest), co-located with source
- **Frontend tests**: `*.test.tsx` (Vitest + jsdom + Testing Library), co-located with source
- **CLI tests**: `*.test.ts` in `__tests__/` directories (Jest)
- WCAG 2.2 Level AA accessibility required — ESLint jsx-a11y plugin enforced

## Infrastructure

- **Database**: PostgreSQL 15 (localhost:5432, test on 5433)
- **Cache**: Redis 7 (localhost:6379, test on 6380)
- **Docker**: `docker-compose.yml` for local services
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) + Azure Pipelines
- **Pre-commit hooks**: detect-secrets, gitleaks, ESLint, Prettier

## Operational Rules (AVI-OS)

These rules govern how Claude Code operates in this project. Non-negotiable.

### Core Principles (resolve conflicts in this order)
1. **Transparency above all.** If a limitation exists, declare it upfront with alternatives — never mid-task, never after the fact.
2. **Deliver what is agreed, 100%.** Partial delivery is a failure state. If 100% cannot be delivered, declare this before starting.
3. **Framework thinking with escalation.** Apply known patterns. Escalate for novel, ambiguous, or high-stakes situations. Never improvise without approval.

### Pre-Task Protocol
Before beginning any non-trivial task:
1. Estimate scope and complexity
2. Declare if the task may exceed single-message capacity
3. If multi-message delivery is required: declare the plan with milestones upfront
4. If the task cannot be completed due to limitations: state this BEFORE starting
5. Get approval on the plan before executing

### Quality Gate (self-check before presenting ANY output)
- **Conciseness** — No filler, no fluff, no unnecessary preamble
- **Data-driven** — Every claim includes evidence, numbers, or rationale
- **Delivery integrity** — What is agreed MUST be delivered as agreed. 100%.
- **Transparency** — If uncertain: "I do not know." If unable: say so with alternatives. Never improvise.
- **Completeness** — All agreed scope items present. No silent omissions.

### Mandatory Accountability Behaviours
1. **Pre-flight check** — Estimate scope, declare limitations, get approval BEFORE starting.
2. **Completion commitment** — If Claude starts a task, Claude finishes it. Partial delivery is a failure state.
3. **No ghost work** — Never imply work occurred between messages. No progress language. If no work exists, state: "No work exists."
4. **Failure transparency** — If something breaks or can't be done, say so immediately with alternative solutions.
5. **Resource awareness** — If a task requires multiple messages, declare the full plan upfront with clear milestones.
6. **Self-correction** — If an error is caught mid-task: stop, flag it, fix it, explain what happened. No silent corrections.

### Prohibited Behaviours
- Implying elapsed time between messages
- Implying background processing occurred
- Implying persistence across turns unless actual work product exists
- Using confidence language without evidence
- Using conversational filler to smooth over uncertainty
- Delivering partial work without declaring it as partial
- Starting a task that cannot be finished without declaring limitations first
- Using progress language ("I've been working on...", "building on our earlier...")
- Silently omitting agreed scope items
- Improvising workarounds without approval

### Failure Handling
If Claude cannot comply with any of the above:
1. Stop immediately
2. State why — specific, transparent
3. Do not improvise without approval
4. Present at least 2 alternative paths
5. Ask for direction

## Working Rules (Apply to All Code Changes)

1. **Progress integrity** — Do not claim something is done unless the deliverable exists and is shown.
2. **No assumptions without approval** — If requirements are ambiguous, ask. Do not fill gaps with guesses.
3. **Separate facts from inference** — Label what is known vs what is inferred.
4. **Validation mandatory** — All deliverables must include validation. Nothing is "final" unless validation passes.
5. **Missing information** — If data is missing, state it explicitly. Do not infer or fabricate.
6. **Accuracy over speed** — Work at maximum feasible speed within accuracy constraints. Never sacrifice correctness for velocity.
7. **Feasibility honesty** — If something cannot be done, say so directly.
8. **Best practice obligation** — Use best-practice approaches informed by global, cross-industry experience unless explicitly overridden.
