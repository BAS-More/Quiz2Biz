# Security and Reliability Remediation Checklist

## Phase P0 (in progress)

- [x] P0-A: Standardize authenticated user identity usage in OAuth controller (`user.id` instead of mixed `sub/userId`)
- [x] P0-A: Protect payment checkout and portal endpoints with JWT auth
- [x] P0-A: Enforce organization/customer ownership checks in payment controller routes
- [x] P0-A: Exempt Stripe webhook from CSRF validation
- [x] P0-A: Enable raw request body in Nest bootstrap for Stripe signature verification
- [x] P0-B: Enforce session ownership checks in scoring, heatmap, and conversation services
- [x] P0-B: Guard idea-capture retrieval/confirm/session creation by owner
- [x] P0-C: Fix `req.user.userId` legacy usage in evidence and decision modules
- [x] P0-C: Add ownership enforcement in evidence and decision services

## Phase P1 (pending)

- [ ] OAuth Code+PKCE+state/nonce migration
- [ ] Frontend OAuth endpoint contract parity (`/api/v1/...`)
- [ ] Move refresh token to secure httpOnly cookie
- [ ] Remove localStorage token persistence
- [ ] Refresh token rotation + hashing + replay detection
- [ ] Server-side logout revocation flow

## Phase P2 (pending)

- [ ] Remove fail-open security defaults (JWT/refresh/CSRF secrets)
- [ ] Startup config hard-fail validation for production
- [ ] Enforce strict credentialed CORS allowlist
- [ ] Reduce public health endpoint information disclosure

## Infra/CI hardening (pending)

- [ ] Separate Terraform backend state by environment
- [ ] Enforce private production DB networking and restrictive firewall
- [ ] Move runtime secrets to managed references, reduce state exposure
- [ ] Disable ACR admin credentials and use managed identity pull
- [ ] Pin CI actions/tools to immutable versions
- [ ] Make high/critical security scans blocking
- [ ] Add deploy approval + rollback automation

## Quality hardening (pending)

- [ ] Replace placeholder tests (`expect(true).toBe(true)`)
- [ ] Add authz regression tests for IDOR-sensitive routes
- [ ] Reduce production dependency vulnerability count
