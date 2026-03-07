# Repository Transfer Risk Analysis

**From:** `Avi-Bendetsky/Quiz-to-build`
**To:** `BAS-More/Quiz-to-build`
**Method:** GitHub Settings → Danger Zone → Transfer ownership
**Date:** 2026-03-07

---

## Executive Summary

**Overall Risk Level: LOW ✅**

GitHub's Transfer ownership feature is the recommended approach for moving repositories between owners/organisations. This analysis audited every integration point in the repository to confirm the transfer can proceed safely.

---

## What GitHub Handles Automatically

These items are **automatically preserved** during a repository transfer — no action required:

| Item | Auto-Preserved | Notes |
|------|---------------|-------|
| All source code & branches | ✅ Yes | Complete git history transferred |
| Open/closed issues | ✅ Yes | Issue numbers preserved |
| Open/closed pull requests | ✅ Yes | PR numbers preserved |
| Stars & watchers | ✅ Yes | Community engagement preserved |
| Forks | ✅ Yes | Fork network maintained |
| Wiki content | ✅ Yes | If enabled |
| URL redirects | ✅ Yes | `Avi-Bendetsky/Quiz-to-build` → `BAS-More/Quiz-to-build` automatically |
| Git clone/fetch redirects | ✅ Yes | Existing clones continue to work |
| GitHub Pages (if enabled) | ✅ Yes | Not currently enabled |
| Dependabot config | ✅ Yes | `.github/dependabot.yml` transfers as-is |
| Branch protection rules | ✅ Yes | Rules transfer with the repo |
| Deploy keys | ✅ Yes | Transferred automatically |

---

## Risk Assessment by Category

### 1. GitHub Actions Workflows — LOW RISK ✅

**12 workflow files audited.** All use dynamic GitHub context variables that automatically resolve to the new owner:

| Workflow | Dynamic Variables Used | Risk |
|----------|----------------------|------|
| `ci.yml` | `secrets.GITHUB_TOKEN` | ✅ None |
| `coverage-gate.yml` | `context.repo.owner`, `context.repo.repo` | ✅ None |
| `security-scan.yml` | `context.repo.owner`, `context.repo.repo` | ✅ None |
| `pr-size-check.yml` | `context.repo.owner`, `context.repo.repo` | ✅ None |
| `deploy.yml` | `secrets.*`, env vars | ✅ None |
| `deploy-web.yml` | `secrets.*`, env vars | ✅ None |
| `sonarcloud.yml` | `secrets.SONAR_TOKEN`, `secrets.GITHUB_TOKEN` | ✅ None |
| `dora-metrics.yml` | `secrets.GITHUB_TOKEN` | ✅ None |
| `sync-branches.yml` | `secrets.GITHUB_TOKEN` | ✅ None |
| `seed-database.yml` | `secrets.DATABASE_URL` | ✅ None |
| `swagger-check.yml` | Standard actions only | ✅ None |
| `docker-hub.yml` | Disabled workflow, env var updated in this PR | ✅ None |

**Key finding:** No workflow hardcodes the repository owner. All use `${{ github.repository }}`, `context.repo`, or secrets.

### 2. GitHub Actions Secrets — MEDIUM RISK ⚠️

**GitHub Actions secrets do NOT transfer automatically.** The following 14 secrets must be re-created in the `BAS-More` organisation:

| Secret | Used In | Priority |
|--------|---------|----------|
| `AZURE_CREDENTIALS` | deploy.yml, deploy-web.yml | 🔴 Critical |
| `AZURE_ACR_USERNAME` | deploy.yml, deploy-web.yml | 🔴 Critical |
| `AZURE_ACR_PASSWORD` | deploy.yml, deploy-web.yml | 🔴 Critical |
| `DATABASE_URL` | deploy.yml, seed-database.yml | 🔴 Critical |
| `JWT_SECRET` | deploy.yml | 🔴 Critical |
| `JWT_REFRESH_SECRET` | deploy.yml | 🔴 Critical |
| `REDIS_HOST` | deploy.yml | 🔴 Critical |
| `REDIS_PORT` | deploy.yml | 🔴 Critical |
| `REDIS_PASSWORD` | deploy.yml | 🔴 Critical |
| `SONAR_TOKEN` | sonarcloud.yml | 🟡 Medium |
| `DOCKERHUB_USERNAME` | docker-hub.yml (disabled) | 🟢 Low |
| `DOCKERHUB_TOKEN` | docker-hub.yml (disabled) | 🟢 Low |
| `VITE_MICROSOFT_CLIENT_ID` | deploy-web.yml | 🟡 Medium |
| `VITE_GOOGLE_CLIENT_ID` | deploy-web.yml | 🟡 Medium |

**Mitigation:** Document all secret names before transfer. Re-add them immediately after. `GITHUB_TOKEN` is auto-provisioned and requires no action.

### 3. CODEOWNERS — LOW RISK ✅

The CODEOWNERS file references team names (`@BAS-More/core-team`, etc.). These teams must exist in the `BAS-More` organisation. If they don't exist yet, CODEOWNERS will be silently ignored (no errors, no breakage — reviews just won't be auto-assigned).

**Action needed:** Create matching teams in `BAS-More` organisation:
- `core-team`, `backend-team`, `frontend-team`, `devops-team`, `security-team`, `docs-team`, `qa-team`

### 4. External Service Integrations — LOW RISK ✅

| Service | Current Config | Transfer Impact | Action |
|---------|---------------|-----------------|--------|
| **Azure Container Apps** | Resource names in `deploy.yml` env vars | ✅ No impact | Azure infra is independent of GitHub org |
| **Azure Container Registry** | `acrquestionnaireprod.azurecr.io` | ✅ No impact | ACR is independent of GitHub org |
| **Azure DevOps** | `azure-pipelines.yml` | ✅ No impact | Service connections use Azure credentials, not GitHub org |
| **SonarCloud** | `sonar-project.properties` updated | ⚠️ Reconfigure | Need new SonarCloud org project |
| **Snyk** | `.snyk` — no owner references | ✅ No impact | Uses API token, not org name |
| **Docker Hub** | Workflow disabled, updated in this PR | ✅ No impact | Uses DOCKERHUB_USERNAME secret |
| **Microsoft Teams** | Webhook URLs via env vars | ✅ No impact | URLs are independent of GitHub org |

### 5. Docker & Container Images — NO RISK ✅

| File | Reference | Status |
|------|-----------|--------|
| `docker/api/Dockerfile` | OCI image.source label | ✅ Updated to `BAS-More` |
| `docker/web/Dockerfile` | OCI image.source label | ✅ Updated to `BAS-More` |
| `docker-compose.yml` | Local image names only | ✅ No owner references |
| `docker-compose.prod.yml` | ACR references | ✅ No owner references |

### 6. Package Configuration — NO RISK ✅

All 8 `package.json` files audited:
- ❌ No `repository` field
- ❌ No `homepage` field
- ❌ No `bugs` field
- ❌ No `.npmrc` files
- ❌ No npm publish configuration

### 7. Git Remotes — AUTOMATIC ✅

GitHub automatically updates the remote URL. Existing clones with `Avi-Bendetsky/Quiz-to-build` will be automatically redirected. Developers can optionally update their remotes:

```bash
git remote set-url origin https://github.com/BAS-More/Quiz-to-build.git
```

### 8. Dependabot — NO RISK ✅

`.github/dependabot.yml` uses relative directory paths only (`/apps/api`, `/apps/web`, `/apps/cli`). No owner references. Will continue working automatically.

---

## Pre-Transfer Checklist

Complete these steps **before** clicking Transfer:

- [ ] Merge this PR (updates all hardcoded references)
- [ ] Document all GitHub Actions secrets (listed in Section 2 above)
- [ ] Ensure you have owner/admin access to `BAS-More` organisation
- [ ] Ensure `BAS-More` org allows repository creation

## Transfer Steps

1. Go to `https://github.com/Avi-Bendetsky/Quiz-to-build/settings` → Danger Zone → **Transfer**
2. Type `BAS-More` as the new owner
3. Type repository name to confirm
4. Click **I understand, transfer this repository**

## Post-Transfer Checklist

Complete these steps **immediately after** transfer:

- [ ] **Re-add all GitHub Actions secrets** (14 secrets listed in Section 2)
- [ ] **Verify branch protection rules** transferred correctly
- [ ] **Create teams** in BAS-More org (core-team, backend-team, frontend-team, devops-team, security-team, docs-team, qa-team)
- [ ] **Reconfigure SonarCloud** for `bas-more` organisation
- [ ] **Test CI pipeline** — push a test commit or trigger workflow manually
- [ ] **Test deployment pipeline** — verify deploy.yml and deploy-web.yml work
- [ ] **Notify team members** to update their local git remotes (optional — redirects work automatically)
- [ ] **Update any external bookmarks or documentation** that references the old URL

---

## Risk Summary Matrix

| Category | Risk Level | Auto-Handled | Action Required |
|----------|-----------|-------------|-----------------|
| Source code & git history | ✅ None | Yes | None |
| Issues & PRs | ✅ None | Yes | None |
| URL redirects | ✅ None | Yes | None |
| GitHub Actions workflows | ✅ None | Yes | None |
| GitHub Actions secrets | ⚠️ Medium | **No** | Re-add 14 secrets |
| Branch protection | ✅ None | Yes | Verify after |
| CODEOWNERS | ✅ Low | Yes | Create teams in new org |
| Dependabot | ✅ None | Yes | None |
| Azure infrastructure | ✅ None | N/A | Independent of GitHub |
| SonarCloud | ⚠️ Low | No | Reconfigure project |
| Docker Hub | ✅ None | N/A | Disabled workflow |
| Existing clones | ✅ None | Yes | Auto-redirected |
| npm packages | ✅ None | N/A | No publish config |

---

## Conclusion

**The GitHub Transfer ownership approach is safe and recommended.** The repository is well-designed with minimal hardcoded owner references. All workflow files use dynamic context variables. The only required manual step after transfer is re-adding GitHub Actions secrets (which is standard for any GitHub repository transfer).

**Estimated downtime:** Zero. GitHub performs the transfer instantly with automatic URL redirects.

**Estimated post-transfer setup time:** 15–30 minutes (re-adding secrets and verifying workflows).
