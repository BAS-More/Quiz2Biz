# ADR-008: API Versioning Strategy

**Status:** ACCEPTED  
**Date:** 2026-02-25  
**Deciders:** Engineering Team  
**Technical Story:** GAP-A4 — Gap Remediation Phase 4

---

## Context

Quiz2Biz exposes a REST API consumed by the web frontend and future third-party integrations. As the API evolves, breaking changes are inevitable. A versioning strategy is needed to allow concurrent support of old and new contract shapes while clients migrate.

Currently all routes are served under `/api/v1/` via NestJS global prefix. No formal versioning mechanism or deprecation policy is documented.

## Decision Drivers

- Must allow non-breaking evolution of existing endpoints
- Must support at least two concurrent API versions during migration windows
- Must be simple for frontend and CLI consumers to adopt
- Must align with NestJS built-in versioning support
- Must not increase infrastructure cost (no duplicate deployments)

## Considered Options

### Option 1: URI Path Versioning (`/api/v1/`, `/api/v2/`)

**Description:** Version identifier embedded in the URL path. NestJS supports this via `VersioningType.URI`.

**Pros:**
- Explicit — version visible in every request
- Easy to route, cache, and log per version
- Native NestJS support with `@Version()` decorator
- Simple for consumers — just change the base URL

**Cons:**
- URL pollution — every endpoint duplicated per version
- Can lead to large controller surface if many versions maintained

### Option 2: Header-Based Versioning (`Accept-Version: 2`)

**Description:** Version sent as a custom HTTP header. NestJS supports via `VersioningType.HEADER`.

**Pros:**
- Clean URLs
- Version negotiation without URL changes

**Cons:**
- Hidden — not visible in browser, logs, or cURL without headers
- Harder to test and share links
- Proxy/CDN caching more complex

### Option 3: Media Type Versioning (`Accept: application/vnd.quiz2biz.v2+json`)

**Description:** Version embedded in the `Accept` header media type.

**Pros:**
- RESTful purist approach
- Allows content negotiation

**Cons:**
- Complex to implement and consume
- Poor tooling support (Swagger, Postman)
- Overkill for a single-frontend product

## Decision Outcome

**Chosen Option:** "URI Path Versioning"

### Rationale

URI Path Versioning is the simplest, most explicit approach and aligns with:
1. Current implementation (already using `/api/v1/` prefix)
2. NestJS native `VersioningType.URI` support
3. Easy adoption for frontend (change base URL)
4. Clear log/trace separation by version
5. Industry standard (GitHub, Stripe, Twilio all use URI versioning)

### Positive Consequences

- Zero migration effort — current `/api/v1/` prefix is already in place
- New versions added incrementally with `@Version('2')` decorator
- Clear deprecation path per endpoint

### Negative Consequences

- URL duplication when maintaining multiple versions
- Must ensure v1 and v2 controllers don't conflict on shared routes

## Implementation Notes

1. **Enable NestJS versioning** in `main.ts`:
   ```typescript
   app.enableVersioning({
     type: VersioningType.URI,
     defaultVersion: '1',
   });
   ```

2. **Version new endpoints** using `@Version('2')` on controllers or individual routes.

3. **Deprecation policy**:
   - Announce deprecation 90 days before removal
   - Add `Sunset` header to deprecated endpoints
   - Add `Deprecation` header with ISO 8601 date
   - Remove deprecated version only after migration confirmed

4. **Version lifecycle**:
   - `CURRENT` — actively developed, receives all fixes
   - `SUPPORTED` — receives security/critical fixes only
   - `DEPRECATED` — returns Sunset header, 90-day countdown
   - `RETIRED` — returns 410 Gone

## Links

- [NestJS Versioning Documentation](https://docs.nestjs.com/techniques/versioning)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- ADR-001: Authentication & Authorization
