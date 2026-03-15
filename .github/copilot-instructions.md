This repository is a TypeScript monorepo for Quiz2Biz using Turbo + npm workspaces.

## Development workflow

- Install dependencies: `npm install`
- Build all packages/apps: `npm run build`
- Lint all packages/apps: `npm run lint`
- Run all tests: `npm run test`
- Run API tests only: `npm run test:api`
- Run web E2E tests: `npm run test:e2e`

## Project structure

- `apps/api`: NestJS backend API
- `apps/web`: React + Vite frontend
- `apps/cli`: CLI application
- `libs/*`: Shared libraries (database, redis, shared utilities, orchestrator)
- `prisma`: Schema, migrations, and seed scripts

## Coding expectations

- Keep changes minimal and scoped to the issue.
- Follow existing TypeScript strict typing; avoid `any`.
- Reuse existing patterns and libraries already used in the touched area.
- Add or update tests when behavior changes.
- Do not commit build artifacts or dependency folders.

## Validation expectations before finishing

- Run targeted tests for changed code first.
- Run relevant lint/build checks for changed areas.
- If possible, run `npm run lint`, `npm run build`, and `npm run test` before final handoff.
