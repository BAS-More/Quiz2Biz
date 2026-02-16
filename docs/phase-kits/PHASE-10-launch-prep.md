# Phase 10: Polish, Testing & Documentation

> **Objective:** Full regression testing, documentation update, performance validation, and launch readiness.
> **Branch:** `phase-10/launch-prep`
> **Dependencies:** Phase 9 complete (all features built and navigable)
> **Acceptance:** All tests pass. Performance meets benchmarks. Production deployment works. Full user journey verified on live site.

---

## Pre-flight

```bash
git checkout main
git merge phase-9/workspace-nav
git checkout -b phase-10/launch-prep
```

---

## Task 10.1 — Full Regression

Run ALL existing test suites:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (if configured)
npm run test:e2e
```

**Fix every broken test.** Tests may break because:
- Removed routes or navigation links
- Changed payment flow (subscriptions → per-document)
- Modified dashboard page
- New modules affect dependency injection

Document every fix. Do not skip or disable tests — fix them to match the new product behaviour.

---

## Task 10.2 — Write Missing Tests

**Target:** Maintain or exceed the existing 792 test count.

**Coverage gaps to fill:**
- AI Gateway: adapter routing, fallback, streaming, cost tracking
- Chat Engine: message limits, prompt building, streaming
- Fact Extraction: extraction accuracy, deduplication, confidence
- Quality Scoring: calculation, gap detection, trigger
- Document Commerce: pricing interpolation, readiness calculation, Stripe integration
- Document Generation: prompt building, quality calibration, rendering
- Workspace: project CRUD, navigation

Run coverage report:
```bash
npm run test:coverage
```

Target: ≥80% line coverage on all new modules.

---

## Task 10.3 — Performance Testing

**Benchmarks (must pass):**

| Metric | Target | How to Test |
|--------|--------|-------------|
| Page load (workspace) | < 2.1s | Lighthouse or browser profiling |
| Page load (chat) | < 2.1s | Lighthouse |
| API response (non-AI) | < 150ms | k6 or autocannon |
| Chat streaming latency | < 3s to first token | Manual test with timer |
| Document generation | < 120s | Manual test |
| Database queries | < 50ms average | Prisma query logging |

**Performance fixes if needed:**
- Add database indexes (check EXPLAIN ANALYZE on slow queries)
- Redis caching for frequently accessed data (project score, dimension list)
- Lazy loading for frontend pages
- Image and bundle optimization

---

## Task 10.4 — Update README.md

Rewrite to reflect the new product:

```markdown
# Quiz2Biz

**Chat → Benchmark → Document**

Quiz2Biz is a SaaS platform where users describe their business idea through conversational AI, receive a standards-benchmarked quality score, and generate professional documents calibrated to a quality slider.

## Features
- Conversational AI chat (Claude or OpenAI)
- Standards-based quality scoring (ISO, industry frameworks)
- 7 document types with 3 output formats (DOCX, PDF, Markdown)
- Dynamic pricing with quality slider
- Multi-provider document comparison

## Quick Start
[See QUICK-START.md]

## Tech Stack
- Backend: NestJS, TypeScript, Prisma, PostgreSQL
- Frontend: React 19, Vite 7, Tailwind CSS
- AI: Anthropic Claude, OpenAI GPT-4o
- Infrastructure: Azure App Service, Azure PostgreSQL, Azure Blob Storage
- Payments: Stripe (per-document)

## Development
[Setup instructions]
```

---

## Task 10.5 — Update PRODUCT-OVERVIEW.md

Replace the entire document with the new product description. Remove all references to:
- Adaptive Client Questionnaire System
- Tech readiness assessment
- 11 question types
- CTO/CFO/CEO/BA/Policy personas (old structure)
- Evidence Registry, Decision Log, Policy Pack (V2)

Write the new overview based on the PRD.

---

## Task 10.6 — Update QUICK-START.md

New quick start guide:
1. Clone repo
2. Copy .env.example to .env, fill in values (DATABASE_URL, REDIS_URL, API keys, Stripe keys)
3. `npm install`
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`
7. Open http://localhost:5173
8. Register, create project, start chatting

---

## Task 10.7 — Deploy to Production

```bash
# Merge to main
git checkout main
git merge phase-10/launch-prep

# Run production migration
npx prisma migrate deploy

# Run production seeds
npx prisma db seed

# Build and deploy
npm run build
# Push to Azure via CI/CD pipeline or manual deploy
```

**Pre-deploy checklist:**
- [ ] All env vars set in Azure App Service (including ANTHROPIC_API_KEY, OPENAI_API_KEY)
- [ ] Stripe webhook endpoint updated for new payment flow
- [ ] Azure Blob Storage container exists for document storage
- [ ] Database migration applied to production
- [ ] Seeds run on production
- [ ] DNS pointing to Azure App Service

---

## Task 10.8 — Production Smoke Test

**Manual test the full user journey on quiz2biz.com:**

1. ☐ Navigate to quiz2biz.com → login page loads
2. ☐ Register new account → account created
3. ☐ Login → workspace page loads (empty state)
4. ☐ Create new project "Test Business Plan" (type: Business Plan) → chat opens
5. ☐ Send 3 chat messages about a business idea → AI responds, streaming works
6. ☐ Switch provider to OpenAI → AI responds from OpenAI
7. ☐ Navigate to Dashboard → quality score visible, dimensions shown
8. ☐ Click a gap → returns to chat with suggested prompt
9. ☐ Navigate to Documents → 7 document types shown with readiness
10. ☐ Select Business Plan → quality slider and pricing shown
11. ☐ Slide quality to Professional → price updates dynamically
12. ☐ Select DOCX format → proceed to fact review
13. ☐ Review facts → confirm/edit → proceed to payment
14. ☐ Pay via Stripe (test mode) → payment succeeds
15. ☐ Generation progress shows → document completes
16. ☐ Download DOCX → file opens in Word, content matches expectations
17. ☐ Navigate to My Documents → generated doc listed
18. ☐ Back to Workspace → project shows updated score and doc count
19. ☐ Logout → redirected to login

**If any step fails:** Fix, redeploy, retest.

---

## Task 10.9 — Launch Checklist Document

**Create file:** `LAUNCH-CHECKLIST.md`

```markdown
# Quiz2Biz Launch Checklist

## Infrastructure
- [ ] Azure App Service running and healthy
- [ ] Azure PostgreSQL connected and migrated
- [ ] Azure Redis connected
- [ ] Azure Blob Storage configured
- [ ] SSL certificate valid for quiz2biz.com
- [ ] DNS resolving correctly

## Application
- [ ] All tests passing (≥792)
- [ ] Performance benchmarks met
- [ ] Auth flow works (register, login, logout)
- [ ] Full user journey verified on production

## AI Providers
- [ ] Anthropic API key set and working
- [ ] OpenAI API key set and working
- [ ] Fallback triggers correctly when provider fails
- [ ] Cost tracking logging correctly

## Payments
- [ ] Stripe live keys set (switch from test to live when ready)
- [ ] Webhook endpoint registered and receiving events
- [ ] Per-document payment flow works
- [ ] Payment confirmation triggers document generation

## Content
- [ ] 7 document types seeded with correct prices
- [ ] Quality dimensions seeded for all project types
- [ ] AI providers seeded
- [ ] Help page accurate

## Documentation
- [ ] README.md updated
- [ ] PRODUCT-OVERVIEW.md updated
- [ ] QUICK-START.md updated
- [ ] DEPLOYMENT-FIX-LOG.md complete

## V2 Features
- [ ] Evidence Registry hidden from nav
- [ ] Decision Log hidden from nav
- [ ] Policy Pack hidden from nav
- [ ] Standards module hidden from nav
- [ ] QPG removed from app.module.ts
- [ ] No V2 routes accessible

## Sign-off
- [ ] Owner (Avi) has completed full smoke test
- [ ] Owner approves for public launch
```

---

## Completion

```bash
git add -A
git commit -m "Phase 10: Launch prep — regression, performance, docs, production deployment"
git push origin phase-10/launch-prep

# Final merge
git checkout main
git merge phase-10/launch-prep
git push origin main
```

**Acceptance checklist:**
- [ ] All test suites pass (≥792 tests)
- [ ] Performance benchmarks met (page < 2.1s, API < 150ms, streaming < 3s)
- [ ] README, PRODUCT-OVERVIEW, QUICK-START updated
- [ ] Production deployed and running
- [ ] Full 19-step smoke test passes on quiz2biz.com
- [ ] LAUNCH-CHECKLIST.md complete with all boxes checked
- [ ] Git history clean with phase-by-phase commits
