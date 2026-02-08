# Branch Synchronization Guide

This document explains how to synchronize all feature branches with the `main` branch in this repository.

## Why Sync Branches?

When changes are merged into `main`, feature branches can become outdated. Syncing branches ensures:
- All branches have the latest commits from `main`
- Reduced merge conflicts when creating pull requests
- Everyone works with the latest stable code
- Easier collaboration across branches

## Current Status

As of the latest check, the following branches need to be synced with `main`:

- `copilot/review-software-health` - 1 commit behind main
- `eslint-fixes-clean` - 1 commit behind main
- `qoder/adaptive-client-questionnaire-tool-LR22kj` - 1 commit behind main
- `qoder/quiz-build-deployment-eUsiDf` - 1 commit behind main
- `qoder/quiz-builder-kBVnJv` - 1 commit behind main
- `claude/repository-analysis-4puQN` - 1 commit behind main

## Methods to Sync Branches

### Method 1: GitHub Actions Workflow (Recommended)

The easiest way to sync all branches is using the automated GitHub Actions workflow:

1. Go to the **Actions** tab in GitHub
2. Select **"Sync All Branches with Main"** workflow from the left sidebar
3. Click **"Run workflow"** button
4. Choose whether to do a dry run (preview only) or actual sync
5. Click **"Run workflow"** to start

The workflow will:
- Automatically merge `main` into each branch
- Use the `-X ours` strategy to prefer each branch's content when there are conflicts
- Push the updated branches to the repository
- Provide a detailed summary of successes and failures

### Method 2: Local Script

If you prefer to sync branches locally, use the provided script:

```bash
# Make the script executable
chmod +x scripts/sync-all-branches.sh

# Run the script
./scripts/sync-all-branches.sh
```

**Requirements:**
- Git push access to the repository
- All branches fetched locally (`git fetch --all`)

### Method 3: Manual Sync (Individual Branches)

To manually sync a single branch:

```bash
# Checkout the branch
git checkout <branch-name>

# Fetch latest changes
git fetch origin

# Merge main into the branch (prefer branch's content on conflicts)
git merge main --no-edit --allow-unrelated-histories -X ours

# Push the changes
git push origin <branch-name>
```

**Example:**
```bash
git checkout copilot/review-software-health
git fetch origin
git merge main --no-edit --allow-unrelated-histories -X ours
git push origin copilot/review-software-health
```

## Important Notes

### About `-X ours` Strategy

We use the `-X ours` merge strategy to:
- Automatically resolve conflicts by preferring the branch's version
- Avoid manual conflict resolution for hundreds of files
- Preserve each branch's unique work while incorporating main's history

This is appropriate for this repository because:
- Branches have diverged significantly
- The repository has a grafted/shallow history
- We want to bring in main's commit history without overwriting branch work

### About `--allow-unrelated-histories`

This flag is necessary because the repository has a grafted history (shallow clone). Without it, git will refuse to merge branches that appear to have unrelated histories.

### Verification

After syncing, verify the sync was successful:

```bash
git checkout <branch-name>
git merge-base --is-ancestor main HEAD && echo "✓ Synced" || echo "✗ Not synced"
```

## Troubleshooting

### Merge Conflicts

If you encounter conflicts that can't be auto-resolved:

1. The automated tools will abort the merge
2. You'll need to manually resolve conflicts:
   ```bash
   git checkout <branch-name>
   git merge main --no-edit
   # Resolve conflicts in your editor
   git add .
   git commit
   git push origin <branch-name>
   ```

### Push Permission Denied

If you can't push to a branch:
- Ensure you have write access to the repository
- Check that the branch isn't protected
- Try using SSH instead of HTTPS for git operations

### "Already up to date" but Branch Still Behind

This can happen with grafted repositories. Use the `--no-ff` flag to force a merge commit:

```bash
git merge main --no-ff --allow-unrelated-histories -X ours
```

## After Syncing

Once all branches are synced:

1. Verify each branch contains all commits from main
2. Update BRANCH-SYNC-STATUS.md if needed
3. Notify team members about the sync
4. Consider establishing a regular sync schedule

## Questions?

For issues or questions about branch synchronization:
- Check existing GitHub Issues
- Review the merge conflict documentation
- Consult the repository maintainers
