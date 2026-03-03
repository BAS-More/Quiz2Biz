# PR Green Status Audit & Fix Plan

Generated: 2026-03-03
Repository: `Avi-Bendetsky/Quiz-to-build`

## Open PRs audited
`#104, #103, #100, #99, #97, #94, #82, #81, #80, #79, #78, #77, #76, #75, #74, #73, #68`

## Root problems preventing green status

1. **Workflow permission misconfiguration (PR Size Check)**
   - Evidence: run `22578237923`, job `65402996989`
   - Error: `403 Resource not accessible by integration` on `issues.createComment`
   - Root cause: `GITHUB_TOKEN` missing `issues: write` and `pull-requests: write` for some branches/versions of `.github/workflows/pr-size-check.yml`.

2. **Lockfile mismatch blocks installs in CI**
   - Evidence: run `22613405221`, job `65520423044`; run `22600100431`, job `65479744838`
   - Error: `npm ci` fails (`minimatch@9.0.8` vs `9.0.9`, missing `brace-expansion@2.0.2`, `balanced-match@1.0.2`).
   - Root cause: `package-lock.json` not synchronized with `package.json` in affected PR branches.

3. **Security scan container job configuration failure**
   - Evidence: run `22577428226`, job `65402563693`
   - Error: `Path does not exist: trivy-results.sarif` during SARIF upload.
   - Root cause: Trivy step fails before SARIF output is generated, but upload step is still enforced.

4. **Security summary hard-fails after upstream scan failures**
   - Evidence: run `22577428226`, job `65403216380`
   - Error: `One or more security scans failed`
   - Root cause: summary gate correctly fails due to failed container/dependency jobs; this is a downstream symptom.

5. **CodeQL conflict with default setup in custom security workflow**
   - Evidence: run `22600100431`, job `65479744743`
   - Error: `CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled`.
   - Root cause: custom CodeQL analysis in workflow conflicts with GitHub default CodeQL setup.

6. **Runs in `action_required` state (no jobs executed)**
   - Evidence: runs on PR #104/#103 (e.g. `22615948516`, `22615948551`)
   - Root cause: workflow run requires maintainer approval/policy action before execution.

7. **Draft/WIP PRs not merge-ready**
   - Evidence: PRs `#104`, `#103` are draft and blocked.
   - Root cause: PR lifecycle state, not code execution.

## PR-by-PR triage to reach green

- [ ] **#104**: Approve `action_required` workflow runs; convert from draft only after checks pass.
- [ ] **#103**: Approve `action_required` workflow runs; convert from draft only after checks pass.
- [ ] **#100**: Regenerate `package-lock.json` from branch head and re-run SonarCloud/CI.
- [ ] **#99**: Sync lockfile; remove/disable conflicting custom CodeQL in security workflow branch; fix Trivy SARIF handling.
- [ ] **#97**: Ensure PR size workflow file includes explicit write permissions and rerun.
- [ ] **#94**: Wait for in-progress checks to complete; if failure is lockfile/PR-size related, apply corresponding fixes.
- [ ] **#82**: Rebase/sync with latest fixed workflow + lockfile baseline; rerun all required checks.
- [ ] **#81**: Fix PR-size permission mismatch in branch and rerun.
- [ ] **#80**: Rebase/sync with latest workflow + lockfile baseline; rerun all required checks.
- [ ] **#79**: Rebase/sync with latest workflow + lockfile baseline; rerun all required checks.
- [ ] **#78**: Fix PR-size permission mismatch in branch and rerun.
- [ ] **#77**: Fix PR-size permission mismatch in branch and rerun.
- [ ] **#76**: Fix security workflow (Trivy SARIF + summary gate behavior); rerun security scan.
- [ ] **#75**: Sync lockfile and rerun security + Sonar/CI checks.
- [ ] **#74**: Already has successful recent PR-size run; rebase and rerun full required checks if still blocked.
- [ ] **#73**: Fix PR-size permission mismatch in branch and rerun.
- [ ] **#68**: Rebase huge branch to latest fixed workflow baseline; run required checks in smaller follow-up PRs if needed.

## Execution plan (ordered)

- [ ] **Step 1 (global fix)**: Standardize `.github/workflows/pr-size-check.yml` permissions across active branches.
- [ ] **Step 2 (global fix)**: Regenerate and commit consistent `package-lock.json` in each affected PR branch.
- [ ] **Step 3 (global fix)**: Update `security-scan.yml` to handle Trivy SARIF generation failures safely and avoid false upload failures.
- [ ] **Step 4 (global fix)**: Remove custom CodeQL execution when default setup is enabled (or disable default setup for those branches).
- [ ] **Step 5 (ops)**: Approve `action_required` runs and re-run failed workflows.
- [ ] **Step 6 (hygiene)**: Move WIP/draft PRs to ready-for-review only after required checks are green.
- [ ] **Step 7 (verification)**: Confirm each PR has all required checks passing and no pending/action_required runs.

## Definition of done for this audit

- Every open PR has a mapped root blocker.
- Every blocker has an actionable fix task.
- Tasks are ordered so shared blockers are solved first.
