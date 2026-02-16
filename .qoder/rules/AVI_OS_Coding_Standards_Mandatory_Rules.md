---# AVI-OS Coding Standards — Mandatory Rules

## Pre-Flight Validation (EVERY TASK)

Before executing ANY task:
1. Audit ALL dependencies, files, configs, and services the task touches
2. Identify every failure point and whether it blocks execution
3. Walk through the full execution sequence end-to-end — verify each step produces what downstream steps need
4. Run verification commands (file existence, service status, config values) BEFORE making changes
5. Only then execute. Never "fix this, then see what breaks"

PROHIBITED: Running commands to "see what happens", fixing one error without checking downstream, assuming files/configs exist without verification, claiming work done without evidence.

## ISO/IEC 25010 Quality Model

All code assessable against: functional suitability, reliability, performance efficiency, operability, security, compatibility, maintainability, portability.

## ISO/IEC 5055 Source Code Quality

Zero critical weaknesses in:
- Security: no SQL injection, path traversal, hardcoded credentials, buffer overflow
- Reliability: no null pointer dereference, improper resource shutdown, race conditions
- Performance: no memory leaks, excessive resource consumption, unbounded loops
- Maintainability: cyclomatic complexity ≤10/function, no dead code, no duplication >3%

## OWASP Top 10:2025

Defend against: broken access control, security misconfiguration, supply chain failures, vulnerable components, injection, cryptographic failures, authentication failures, integrity failures, logging failures, mishandled exceptions.

## SOLID Principles

- Single Responsibility: one class/module = one reason to change
- Open/Closed: extend via abstraction, never modify working code
- Liskov Substitution: subtypes fully substitutable for base types
- Interface Segregation: no client depends on unused methods
- Dependency Inversion: depend on abstractions, never concretions

## Clean Code

- Meaningful names, no abbreviations
- Functions ≤30 lines, one thing, one abstraction level
- Files ≤400 lines
- Parameters ≤3 per function
- Nesting ≤3 levels
- Zero dead code, zero commented-out code
- DRY, KISS, YAGNI
- Comments explain "why", never "what"

## TypeScript Rules

- Strict mode: strict, noImplicitAny, strictNullChecks, strictFunctionTypes
- No `any` unless justified with comment
- Use enums/union types over raw strings
- Use readonly where mutation not required
- All async operations must have error handling
- DTOs with class-validator for all API input
- Guards/Interceptors/Pipes per NestJS conventions

## Security by Default

- Parameterised queries ONLY
- Input validation on all external data
- Output encoding for rendered content
- Least privilege permissions
- Secrets in Key Vault/env vars — ZERO hardcoded credentials
- Zero critical/high CVEs in dependencies
- HTTPS only, TLS 1.2+
- JWT short-lived tokens + refresh rotation
- CORS explicit allowlist, never wildcard in production

## Error Handling

- All errors caught — no unhandled promise rejections
- Fail fast, fail loud at the boundary
- Structured logging with correlation IDs
- Graceful shutdown: drain connections, finish in-flight, exit
- Never expose stack traces to API consumers

## Testing

- 80% line coverage, 70% branch coverage minimum
- Unit tests: isolate business logic, mock externals
- Integration tests: real/containerised dependencies
- No order-dependent tests
- Edge cases: null, undefined, empty, boundaries, error paths

## Infrastructure as Code

- All infra through Terraform — zero manual changes
- Plan before apply
- Docker: multi-stage builds, non-root user, health checks, no secrets in images

## Code Review (Every PR / Every Quest)

Before accepting: SOLID followed? No injection/hardcoded secrets? All error paths covered? Coverage met? Naming clear? No N+1 queries? APIs documented? No new CVEs?

## Enforcement

If generated code does not meet these standards, flag the gap and fix before delivering. No shortcuts.
trigger: always_on
---
