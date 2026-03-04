# PR Green Status - Operational Tasks Requiring Manual Action

This document outlines tasks from the main audit that require manual intervention by repository maintainers. These cannot be automated through code changes.

## F) `action_required` Workflow Runs

**PRs affected:** #103, #104

**Root cause:** Workflow runs require maintainer approval before execution due to repository security policies (fork protection, draft PR restrictions, or bot-initiated workflows).

**Actions required:**
1. Navigate to the Actions tab for each PR
2. Review pending workflow runs showing `action_required` status
3. Click "Approve and run" if the source is trusted
4. Monitor workflow execution to ensure checks complete

**Documentation:** Document which policy caused the approval requirement:
- Fork source protection
- Draft PR status triggering approval gate
- Bot/automation source requiring review

**Acceptance criteria:** No required workflows remain in `action_required` state after manual approval.

---

## G) Draft/WIP PR State and Merge-Readiness

**PRs affected:** #103, #104 (and any others marked as draft)

**Root cause:** PRs are intentionally kept in draft state during development. This is not a failure but requires deliberate management.

**Actions required:**
1. Keep PRs as draft until all required checks are green
2. Verify all CI/CD workflows complete successfully
3. Ensure branch is up-to-date with base branch
4. Review PR content and ensure it's ready for review
5. Click "Ready for review" button when all criteria are met

**Workflow:**
```
Draft → Fix all issues → All checks green → Branch up-to-date → Ready for review
```

**Branch protection checklist per PR:**
- [ ] All required status checks passed
- [ ] Branch is up-to-date with base
- [ ] No merge conflicts
- [ ] Required reviewers assigned (if applicable)
- [ ] PR description is complete and accurate

**Acceptance criteria:** Each PR is either:
- **(a)** Intentionally draft with documented rationale, or
- **(b)** Ready for review with all required checks green

---

## Multi-Branch Rollout Process

Since the fixes in this PR address workflow file issues, they need to be propagated to other active branches that have the same problems.

### Recommended Approach:

1. **Merge this PR first** (after validation)
   - This establishes the fixed workflows in the main/develop branch

2. **Rebase affected PRs**
   - For PRs #73, #77, #78, #81, #82, #97: rebase onto latest main/develop
   - This will automatically pick up the workflow fixes
   - Alternative: merge main/develop into the PR branch

3. **Per-branch lockfile fixes**
   - For PRs #75, #99, #100: run `npm install --legacy-peer-deps` on each branch
   - Commit only the updated `package-lock.json`
   - Re-run workflows after lockfile update

4. **Re-run failed workflows**
   - Navigate to Actions tab for each PR
   - Click "Re-run failed jobs" or "Re-run all jobs"
   - Monitor results to confirm green status

5. **Verify each PR**
   - Confirm all required checks are passing
   - Confirm no `action_required` runs remain (after approval)
   - Confirm no lockfile mismatch errors
   - Confirm no CodeQL conflicts

### Alternative Approach (if rebasing is not feasible):

Cherry-pick specific workflow file changes:
```bash
git checkout <target-branch>
git cherry-pick <commit-hash-of-workflow-fixes>
# Resolve any conflicts
git push
```

---

## Validation Checklist for Repository-Wide Green Status

After completing code fixes and operational tasks, verify:

- [ ] No failed required checks on any open PR
- [ ] No required checks pending indefinitely
- [ ] No required workflows in `action_required` (or approved if policy-gated)
- [ ] No `npm ci` lockfile mismatch errors across all active branches
- [ ] No PR Size 403 permission errors
- [ ] No CodeQL default/custom conflict errors
- [ ] Security scan failures (if any) are policy-based and explicitly triaged, not infrastructure failures
- [ ] All draft PRs have documented rationale for draft status
- [ ] All ready-for-review PRs have green checks

---

## Next Steps

1. **Merge this PR** after validation to establish baseline fixes
2. **Execute operational tasks** documented above for PRs #103, #104
3. **Propagate fixes** to other affected PRs via rebase or merge
4. **Fix per-branch lockfiles** on PRs #75, #99, #100
5. **Validate green status** using the checklist above
6. **Update PR descriptions** to reflect current status

---

**Maintenance note:** This document should be archived once all PRs reach green status. Consider converting key validation points into a reusable checklist template for future PR health audits.
