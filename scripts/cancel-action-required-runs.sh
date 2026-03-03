#!/bin/bash
# =============================================================================
# Cancel Action Required Workflow Runs
# Cancels all GitHub Actions workflow runs with status "action_required"
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Cancel Action Required Workflow Runs      ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo -e "${YELLOW}Please install it from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI is not authenticated.${NC}"
    echo -e "${YELLOW}Please run: gh auth login${NC}"
    exit 1
fi

# List action_required runs
echo -e "${YELLOW}Checking for workflow runs with status 'action_required'...${NC}"
echo ""

# Get the list of action_required run IDs
if ! RUN_IDS=$(gh run list --status action_required --limit 50 --json databaseId --jq '.[].databaseId'); then
    echo -e "${RED}Error: Failed to list workflow runs with status 'action_required'.${NC}"
    echo -e "${YELLOW}Ensure you are in a Git repository with GitHub Actions enabled and that you have sufficient permissions, then try again.${NC}"
    exit 1
fi

# Check if there are any runs to cancel
if [ -z "$RUN_IDS" ]; then
    echo -e "${GREEN}No workflow runs found with status 'action_required'.${NC}"
    echo -e "${GREEN}Nothing to cancel.${NC}"
    exit 0
fi

# Count the runs
RUN_COUNT=$(echo "$RUN_IDS" | wc -l | tr -d ' ')
echo -e "${YELLOW}Found ${RUN_COUNT} workflow run(s) with status 'action_required':${NC}"

# Display the runs with details
gh run list --status action_required --limit 50 --json databaseId,name,displayTitle \
    --jq '.[] | "  - [\(.databaseId)] \(.name): \(.displayTitle)"'

echo ""
echo -e "${YELLOW}These runs will be cancelled.${NC}"
echo -e "${YELLOW}Do you want to continue? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Cancellation aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Cancelling runs...${NC}"

# Cancel each run
CANCELLED_COUNT=0
FAILED_COUNT=0

while IFS= read -r RUN_ID; do
    if [ -n "$RUN_ID" ]; then
        if gh run cancel "$RUN_ID" 2>/dev/null; then
            echo -e "${GREEN}✓ Cancelled run $RUN_ID${NC}"
            ((++CANCELLED_COUNT))
        else
            echo -e "${RED}✗ Failed to cancel run $RUN_ID${NC}"
            ((++FAILED_COUNT))
        fi
    fi
done <<< "$RUN_IDS"

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Summary                                   ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "  Total runs: ${RUN_COUNT}"
echo -e "  ${GREEN}Cancelled: ${CANCELLED_COUNT}${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "  ${RED}Failed: ${FAILED_COUNT}${NC}"
fi
echo -e "${BLUE}=============================================${NC}"

if [ $FAILED_COUNT -eq 0 ]; then
    echo -e "${GREEN}All workflow runs cancelled successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some runs failed to cancel. Check the output above for details.${NC}"
    exit 1
fi
