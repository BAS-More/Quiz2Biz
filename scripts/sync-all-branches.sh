#!/bin/bash
# Script to sync all branches with main
# This script merges main into all branches that need syncing

set +e  # Don't exit on errors, we want to continue with other branches

echo "Branch Synchronization Script"
echo "=============================="
echo ""

# List of branches that need syncing (identified from analysis)
BRANCHES_TO_SYNC=(
  "copilot/review-software-health"
  "eslint-fixes-clean"
  "qoder/adaptive-client-questionnaire-tool-LR22kj"
  "qoder/quiz-build-deployment-eUsiDf"
  "qoder/quiz-builder-kBVnJv"
  "claude/repository-analysis-4puQN"
)

# Store current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Function to sync a branch
sync_branch() {
  local branch=$1
  echo "Syncing branch: $branch"
  echo "----------------------------"
  
  # Fetch latest
  git fetch origin "$branch"
  
  # Checkout the branch
  git checkout "$branch" 2>/dev/null || git checkout -b "$branch" "origin/$branch"
  
  # Check if already synced
  if git merge-base --is-ancestor main HEAD 2>/dev/null; then
    echo "✓ Branch already contains all commits from main"
    echo "✓ No sync needed"
    return 0
  fi
  
  # Merge main
  echo "Merging main into $branch..."
  if git merge main --no-edit --allow-unrelated-histories -X ours; then
    echo "✓ Merge successful"
    
    # Verify the merge
    if git merge-base --is-ancestor main HEAD; then
      echo "✓ Verified: branch now contains all commits from main"
      
      # Push the changes
      echo "Pushing changes to origin..."
      if git push origin "$branch"; then
        echo "✓ Push successful"
      else
        echo "✗ Push failed - you may need appropriate permissions"
        echo "  (Changes were merged locally but not pushed to remote)"
        return 1
      fi
    else
      echo "✗ Merge verification failed"
      return 1
    fi
  else
    echo "✗ Merge failed - conflicts may need manual resolution"
    git merge --abort 2>/dev/null || true
    return 1
  fi
  
  echo ""
}

# Sync all branches
SUCCESS_COUNT=0
FAIL_COUNT=0

for branch in "${BRANCHES_TO_SYNC[@]}"; do
  if sync_branch "$branch"; then
    ((SUCCESS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
done

# Return to original branch
echo "Returning to original branch: $CURRENT_BRANCH"
git checkout "$CURRENT_BRANCH"

echo ""
echo "=============================="
echo "Sync Summary:"
echo "  Successful: $SUCCESS_COUNT branches"
echo "  Failed: $FAIL_COUNT branches"
echo "=============================="

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✓ All branches synced successfully!"
  exit 0
else
  echo "✗ Some branches failed to sync. Check the output above for details."
  exit 1
fi
