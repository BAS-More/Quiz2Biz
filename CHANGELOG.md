# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-25

### Added
- MFA module unit tests: `mfa.service.spec.ts` and `mfa.controller.spec.ts` covering TOTP generation, verification, enable/disable flows, and controller endpoints (Phase 1, Step 1.3)
- Chat engine controller tests: 16 tests covering message handling, streaming, error paths (Phase 3, Step 3.1)
- Prompt builder service tests: 16 tests covering template rendering, variable injection, edge cases (Phase 3, Step 3.2)
- Markdown renderer service tests: 43 tests covering heading generation, list formatting, table rendering, escaping (Phase 3, Step 3.3)
- Session reminder job tests: 16 tests covering cron scheduling, email dispatch, retry logic (Phase 3, Step 3.4)
- Scoring engine extracted modules: `scoring-types.ts`, `scoring-calculator.ts`, `scoring-analytics.ts` for separation of concerns (Phase 4, Step 4.4)
- Deliverables compiler extracted modules: `compiler-types.ts`, `compiler-utils.ts`, and four section builders (`technical`, `security`, `operations`, `governance`) (Phase 4, Step 4.3)
- Session service extracted modules: `session-query.service.ts`, `session-mutation.service.ts`, `session-types.ts`, `session-utils.ts` (Phase 4, Step 4.2)

### Changed
- JWT configuration now validates secret length (≥32 chars) and rejects the default placeholder `change-me-in-production` at startup in production mode (Phase 1, Step 1.1)
- CORS configuration rejects wildcard origin (`*`) when credentials mode is enabled, preventing insecure cross-origin configurations (Phase 1, Step 1.2)
- Replaced all `console.log` calls with NestJS `Logger` across 5+ source files for structured, leveled logging (Phase 2, Step 2.1)
- Eliminated all unused variable/import TypeScript errors (TS6133/TS6138) outside of pre-existing DTO class property warnings (Phase 2, Step 2.2)
- Reduced `any` type usage to zero outside of deliverables-compiler dynamic content generation (Phase 2, Step 2.3)
- Refactored `session.service.ts` from 1,764 lines to five focused modules (largest: 437 lines), preserving full public API and all 257 existing tests (Phase 4, Step 4.2)
- Refactored `deliverables-compiler.service.ts` from 1,386 lines to eight focused modules (largest: 262 lines), preserving full public API and all 707 existing tests (Phase 4, Step 4.3)
- Refactored `scoring-engine.service.ts` from 979 lines to four focused modules (largest: 307 lines), preserving full public API and all 144 existing tests (Phase 4, Step 4.4)

### Fixed
- Added `take` limits to all 30 unbounded Prisma `findMany` queries: `take: 1000` for user-facing, `take: 10000` for GDPR/scoring batch, `take: 100` for Stripe organisation lookups (Phase 4, Step 4.1)
- Fixed 6 test spec files that asserted on Prisma calls without matching the new `take` parameter (Phase 4, Step 4.1)

### Security
- Production startup guard rejects weak/default JWT secrets, preventing token forgery in deployed environments (Phase 1, Step 1.1)
- CORS credential-with-wildcard guard prevents browsers from sending cookies to arbitrary origins (Phase 1, Step 1.2)
- Prisma `findMany` safety caps prevent unbounded result sets that could cause memory exhaustion or denial-of-service (Phase 4, Step 4.1)

## Test Coverage (Final)

| Metric     | Value  |
|------------|--------|
| Statements | 92.03% |
| Lines      | 92.03% |
| Functions  | 88.19% |
| Branches   | 84.74% |
| Suites     | 145    |
| Tests      | 4,363  |
