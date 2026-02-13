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
