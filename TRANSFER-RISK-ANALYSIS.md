# Transfer Ownership: Avi-Bendetsky → BAS-More

## TL;DR — Just Transfer It ✅

**Yes, you can just transfer the repository. It's safe.**

Go to **Settings → Danger Zone → Transfer ownership**, type `BAS-More`, and confirm. That's it. GitHub handles everything instantly — zero downtime, all URLs auto-redirect, all code/issues/PRs/branches preserved.

**The only thing you MUST do after transfer:** re-add your 14 GitHub Actions secrets (they don't transfer). That takes ~15 minutes. Everything else works automatically.

---

## How to Transfer (3 minutes)

1. Go to `https://github.com/Avi-Bendetsky/Quiz-to-build/settings`
2. Scroll to **Danger Zone** → click **Transfer**
3. Type `BAS-More` as the new owner
4. Type the repository name to confirm
5. Click **I understand, transfer this repository**

Done. The repo is now at `github.com/BAS-More/Quiz-to-build`. Old URLs redirect automatically.

---

## After Transfer — Required Actions (~15 min)

### 1. Re-add GitHub Actions Secrets (REQUIRED ⚠️)

GitHub Actions secrets do **not** transfer. Re-create these 14 secrets in the transferred repo's Settings → Secrets:

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

> **Note:** `GITHUB_TOKEN` is auto-provisioned by GitHub — no action needed for it.

### 2. Verify CI Works

Push a test commit or manually trigger a workflow to confirm secrets are correctly configured.

---

## After Transfer — Optional Cleanup

These are **not blockers**. Everything works without them due to GitHub's automatic URL redirects.

| Task | Why | When |
|------|-----|------|
| Create teams in BAS-More org | CODEOWNERS auto-assignment won't work without teams (no errors, just no auto-assignment) | When you want auto-review-assignment |
| Reconfigure SonarCloud | Need new project under `bas-more` org | When you need SonarCloud scans |
| Merge this PR | Updates hardcoded references in scripts, docs, Docker labels | Whenever convenient |
| Update local git remotes | `git remote set-url origin https://github.com/BAS-More/Quiz-to-build.git` | Optional — old URLs auto-redirect |

---

## What This PR Does (Optional Cleanup)

This PR pre-updates hardcoded owner references so they point to `BAS-More` instead of `Avi-Bendetsky`. **This is cosmetic cleanup, not a prerequisite for transfer.** GitHub's URL redirects mean everything works either way.

**Code/config changes (needed for correctness in API calls and external services):**
- `.github/CODEOWNERS` — team references `@quiz2biz/*` → `@BAS-More/*`
- `sonar-project.properties` — project key/org for SonarCloud
- `scripts/track-dora-metrics.js` — `REPO_OWNER` used in GitHub API calls
- `scripts/setup-branch-protection.ps1` — `$Owner` default parameter
- `scripts/validate-workflows.ps1` — `$Owner` default parameter
- `.github/workflows/docker-hub.yml` — Docker Hub repo name
- `docker-test.js` — Docker Hub username
- `docker/api/Dockerfile`, `docker/web/Dockerfile` — OCI `image.source` labels

**Documentation URL updates (purely cosmetic — old URLs auto-redirect):**
- 20 markdown files with `github.com/Avi-Bendetsky/...` URLs updated

---

## Full Audit Details

<details>
<summary>Click to expand full risk assessment (for reference)</summary>

### What GitHub Handles Automatically

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

### GitHub Actions Workflows — No Risk ✅

12 workflow files audited. All use dynamic GitHub context variables (`${{ github.repository }}`, `context.repo`, secrets) that automatically resolve to the new owner. No workflow hardcodes the repository owner.

### External Services — No Impact ✅

| Service | Impact | Reason |
|---------|--------|--------|
| Azure Container Apps | ✅ None | Independent of GitHub org |
| Azure Container Registry | ✅ None | Independent of GitHub org |
| Azure DevOps | ✅ None | Uses Azure credentials, not GitHub org |
| Snyk | ✅ None | Uses API token, not org name |
| Microsoft Teams | ✅ None | Webhook URLs independent of GitHub org |

### Package Configuration — No Risk ✅

All 8 `package.json` files audited — no `repository`, `homepage`, `bugs` fields, no `.npmrc` files, no npm publish configuration.

### Risk Summary Matrix

| Category | Risk | Auto-Handled | Action |
|----------|------|-------------|--------|
| Source code & git history | ✅ None | Yes | None |
| Issues & PRs | ✅ None | Yes | None |
| URL redirects | ✅ None | Yes | None |
| GitHub Actions workflows | ✅ None | Yes | None |
| GitHub Actions secrets | ⚠️ Medium | **No** | Re-add 14 secrets |
| Branch protection | ✅ None | Yes | Verify after |
| CODEOWNERS | ✅ Low | Yes | Create teams in new org (optional) |
| Dependabot | ✅ None | Yes | None |
| Azure infrastructure | ✅ None | N/A | Independent of GitHub |
| SonarCloud | ⚠️ Low | No | Reconfigure (optional) |
| Docker Hub | ✅ None | N/A | Disabled workflow |
| Existing clones | ✅ None | Yes | Auto-redirected |
| npm packages | ✅ None | N/A | No publish config |

</details>

---

## Bottom Line

**Just transfer it.** Re-add secrets after. Everything else is optional cleanup.

Estimated downtime: **Zero.** Estimated post-transfer setup: **~15 minutes** (re-adding secrets).
