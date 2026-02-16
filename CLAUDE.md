# CLAUDE.md — Quiz2Biz

## Project
Quiz2Biz — AI-powered adaptive questionnaire platform that generates business documents through conversational chat.

## Stack
TypeScript strict mode, React 19, NestJS, PostgreSQL 16, Redis, Prisma ORM, Azure Container Apps, Terraform.

## Mandatory Skills — Read Before Every Task
- Read and follow `.avi-os-SKILL.md` for all tasks (pre-flight validation protocol).
- Read and follow `.avi-os-coding-quality-SKILL.md` for all code generation (ISO/OWASP/SOLID/Clean Code enforcement).

## Pre-Flight Validation (MANDATORY)
Before executing ANY task, audit ALL dependencies and failure points first. Never do incremental "fix and see." Diagnose the full problem, validate the complete plan, then execute once.

## Coding Quality
All code must comply with ISO 25010/5055, OWASP Top 10:2025, SOLID, Clean Code. TypeScript strict mode, no `any`, 80% test coverage, zero hardcoded secrets, structured error handling.

## Repository Structure
- `apps/api/` — NestJS API (port 3000, prefix /api/v1)
- `apps/web/` — React frontend (Vite)
- `apps/cli/` — CLI tool
- `libs/database/` — Prisma database library
- `libs/redis/` — Redis library
- `libs/shared/` — Shared utilities
- `prisma/` — Schema and migrations
- `docker/` — Dockerfiles (api, web)
- `infrastructure/terraform/` — Azure infrastructure as code

## Git Remotes
- `azure` — Azure DevOps (primary CI/CD)
- `github` — GitHub (backup/collaboration)

## Infrastructure
- Resource Group: rg-questionnaire-prod (australiasoutheast)
- API: ca-questionnaire-api-prod.politestone-1ebeaca3.australiasoutheast.azurecontainerapps.io
- PostgreSQL: psql-questionnaire-prod.postgres.database.azure.com
- Redis: redis-questionnaire-prod.redis.cache.windows.net:6380
- Key Vault: kv-quest-prod-oq2wyq
- ACR: acrquestionnaireprod.azurecr.io

## Shell Scripts
All .sh files use LF line endings (enforced by .gitattributes). Never commit CRLF to shell scripts.

## Build Commands
npm ci, npx turbo run build, npx prisma generate, npx prisma migrate deploy

## Docker Build (via ACR Tasks)
az acr build --registry acrquestionnaireprod --image questionnaire-api:latest --file docker/api/Dockerfile .
