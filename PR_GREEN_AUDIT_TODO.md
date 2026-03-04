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
   - Error: `npm ci` fails (`minimatch@9.0.8` vs `9.0.9`, missing `brace-expansion`, `balanced-match@1.0.2`).
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

## Comprehensive root-cause remediation to-do list

### A) PR Size Check permission failures (403)
- [ ] Update `.github/workflows/pr-size-check.yml` in each affected branch to include:
  - [ ] `permissions: { contents: read, issues: write, pull-requests: read }`
- [ ] Re-validate target PR numbers are still open before rerunning workflows.
- [ ] Re-run failed PR Size workflows on PRs `#73, #77, #78, #81, #97`.
- [ ] Verify logs no longer show `Resource not accessible by integration`.
- [ ] Acceptance criteria: PR Size job is green on all affected PRs.

### B) Lockfile drift (`npm ci` fails)
- [ ] On each affected branch (`#75, #99, #100`):
  - [ ] If additional PRs hit the same lockfile error, append them to the parent bullet list above.
  - [ ] Run `npm install --legacy-peer-deps`.
  - [ ] Commit updated `package-lock.json` only (plus strictly required manifest changes if any).
- [ ] Re-run workflows that failed in dependency install steps (CI/Sonar/Security).
- [ ] Verify `npm ci` passes in workflow logs.
- [ ] Acceptance criteria: no workflow fails with lock mismatch (`minimatch`/`brace-expansion`/`balanced-match`) errors.

### C) Security scan container SARIF pipeline failures
- [ ] Update `security-scan.yml` logic so SARIF upload runs only when SARIF file exists.
- [ ] Ensure Trivy SARIF generation step has deterministic output path and consistent failure handling.
- [ ] Keep JSON artifact generation independent for summary reporting.
- [ ] Re-run Security Scanning workflow on branches where container scan failed with SARIF/missing-file pipeline errors (`#75, #76, #99`).
- [ ] Acceptance criteria: container-scan job either succeeds or fails only on actual vulnerability threshold, not missing-file plumbing.

### D) Security summary downstream hard-fails
- [ ] Keep summary gate but align it to true policy:
  - [ ] Fail only on configured severity/required jobs.
  - [ ] Treat intentionally skipped jobs as non-fatal when expected by event type.
- [ ] Add explicit output text in summary to distinguish "policy failure" vs "infrastructure/config failure".
- [ ] Re-run Security Scan Summary on previously failed runs.
- [ ] Acceptance criteria: summary failure always points to a real policy breach, not a misconfigured pipeline step.

### E) CodeQL conflict with default setup
- [ ] Choose one strategy and apply consistently:
  - [ ] Option 1: keep GitHub default CodeQL and remove custom advanced CodeQL execution from `security-scan.yml`.
  - [ ] Option 2: disable default setup and keep custom workflow (only if GitHub org/repo Code Scanning policy settings allow it).
- [ ] Re-run security workflows for PRs showing error `advanced configurations cannot be processed when default setup is enabled`.
- [ ] Acceptance criteria: no CodeQL processing conflicts in logs.

### F) `action_required` workflow runs
- [ ] Maintainer approves pending runs for draft branches (`#103`, `#104`) where required by repo policy.
- [ ] Re-run blocked workflows after approval.
- [ ] Document which policy caused approval requirement (fork/draft/bot restrictions).
- [ ] Acceptance criteria: no required workflows left in `action_required` state.

### G) Draft/WIP state and merge-readiness
- [ ] Keep PRs as draft until all required checks are green.
- [ ] Convert to ready-for-review only after green checks and up-to-date branch status.
- [ ] Ensure branch protection required checks list is satisfied per PR.
- [ ] Acceptance criteria: each PR is either (a) intentionally draft with rationale or (b) ready with all required checks green.

## Cross-PR rollout checklist (execution order)
- [ ] 1. Create and merge a new small dedicated PR for shared workflow fixes (PR size permissions + security workflow robustness + CodeQL mode).
  - [ ] Suggested branch name: `fix/shared-ci-green-blockers`.
  - [ ] Record the shared-fixes PR number here once created: `PR #TBD` (update immediately after PR creation).
- [ ] 2. Rebase/sync active PR branches on top of shared fixes.
- [ ] 3. Create and merge lockfile synchronization commits per affected branch.
- [ ] 4. Re-run failed workflows in this order: PR Size → Dependency/Sonar CI → Security Scan.
- [ ] 5. Resolve any residual branch-specific failures.
- [ ] 6. Confirm required checks pass for each PR and update PR descriptions/checklists.

## Verification checklist for final green status
- [ ] No failed required checks on any open PR.
- [ ] No required checks pending indefinitely.
- [ ] No required workflows in `action_required`.
- [ ] No `npm ci` lockfile mismatch errors.
- [ ] No PR Size 403 permission errors.
- [ ] No CodeQL default/custom conflict errors.
- [ ] Security scan failures (if any) are vulnerability-policy based and explicitly triaged.
