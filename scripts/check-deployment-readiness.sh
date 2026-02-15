#!/bin/bash
# =============================================================================
# Deployment Readiness Checker
# Validates that all prerequisites are met before deploying
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Symbols
CHECK="✓"
CROSS="✗"
WARN="⚠"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Deployment Readiness Checker              ${NC}"
echo -e "${BLUE}  Quiz2Biz Platform                         ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}${CHECK}${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}${CROSS}${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}${WARN}${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# =============================================================================
# Check 1: Repository Structure
# =============================================================================
echo -e "\n${BLUE}[1/7] Checking Repository Structure...${NC}"

if [ -f ".github/workflows/deploy.yml" ]; then
    pass "Deployment workflow exists"
else
    fail "Deployment workflow missing: .github/workflows/deploy.yml"
fi

if [ -f ".github/workflows/ci.yml" ]; then
    pass "CI workflow exists"
else
    fail "CI workflow missing: .github/workflows/ci.yml"
fi

if [ -f "docker/api/Dockerfile" ]; then
    pass "API Dockerfile exists"
else
    fail "API Dockerfile missing: docker/api/Dockerfile"
fi

if [ -f "prisma/schema.prisma" ]; then
    pass "Prisma schema exists"
else
    fail "Prisma schema missing"
fi

# =============================================================================
# Check 2: Documentation
# =============================================================================
echo -e "\n${BLUE}[2/7] Checking Documentation...${NC}"

REQUIRED_DOCS=(
    "DEPLOYMENT.md"
    "FIRST-DEPLOYMENT.md"
    "DEPLOYMENT-CHECKLIST.md"
    "GITHUB-SECRETS.md"
    "README.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        pass "Documentation: $doc"
    else
        warn "Documentation missing: $doc"
    fi
done

# =============================================================================
# Check 3: Dependencies
# =============================================================================
echo -e "\n${BLUE}[3/7] Checking Dependencies...${NC}"

if [ -f "package.json" ]; then
    pass "package.json exists"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        pass "Dependencies installed (node_modules exists)"
    else
        warn "Dependencies not installed (run: npm install)"
    fi
else
    fail "package.json missing"
fi

if [ -f "package-lock.json" ]; then
    pass "package-lock.json exists"
else
    warn "package-lock.json missing"
fi

# =============================================================================
# Check 4: Environment Configuration
# =============================================================================
echo -e "\n${BLUE}[4/7] Checking Environment Configuration...${NC}"

if [ -f ".env.example" ]; then
    pass ".env.example exists"
else
    warn ".env.example missing"
fi

if [ -f ".env.production.example" ]; then
    pass ".env.production.example exists"
else
    warn ".env.production.example missing"
fi

# Check if .env.production has placeholders
if [ -f ".env.production" ]; then
    if grep -q "YOUR_" ".env.production"; then
        warn ".env.production contains placeholders (YOUR_*)"
        info "  Note: Azure Container Apps uses secretrefs, not .env.production"
    else
        pass ".env.production configured"
    fi
else
    warn ".env.production not found (optional, uses Azure secrets)"
fi

# =============================================================================
# Check 5: Azure CLI and Authentication
# =============================================================================
echo -e "\n${BLUE}[5/7] Checking Azure CLI...${NC}"

if command -v az &> /dev/null; then
    pass "Azure CLI installed"
    
    # Check if logged in
    if az account show &> /dev/null; then
        SUBSCRIPTION_NAME=$(az account show --query name -o tsv 2>/dev/null)
        pass "Logged in to Azure (Subscription: $SUBSCRIPTION_NAME)"
    else
        warn "Not logged in to Azure (run: az login)"
    fi
else
    warn "Azure CLI not installed (required for manual deployment only)"
    info "  Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
fi

# =============================================================================
# Check 6: Docker
# =============================================================================
echo -e "\n${BLUE}[6/7] Checking Docker...${NC}"

if command -v docker &> /dev/null; then
    pass "Docker installed"
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        pass "Docker daemon running"
    else
        warn "Docker daemon not running (start Docker Desktop or dockerd)"
    fi
else
    warn "Docker not installed (required for local builds/testing)"
    info "  Install from: https://docs.docker.com/get-docker/"
fi

# =============================================================================
# Check 7: Git Status
# =============================================================================
echo -e "\n${BLUE}[7/7] Checking Git Status...${NC}"

if [ -d ".git" ]; then
    pass "Git repository initialized"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$CURRENT_BRANCH" ]; then
        info "Current branch: $CURRENT_BRANCH"
        
        if [ "$CURRENT_BRANCH" = "main" ]; then
            pass "On main branch (deployment will trigger on push)"
        else
            info "Not on main branch (merge to main to deploy)"
        fi
    fi
    
    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        pass "No uncommitted changes"
    else
        warn "Uncommitted changes detected"
        info "  Commit changes before deploying"
    fi
else
    fail "Not a git repository"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}  Summary                                    ${NC}"
echo -e "${BLUE}=============================================${NC}"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "\nTotal Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
        STATUS=0
    else
        echo -e "${YELLOW}⚠ Warnings detected. Review warnings above.${NC}"
        echo -e "${YELLOW}  You can proceed with deployment, but consider addressing warnings.${NC}"
        STATUS=0
    fi
else
    echo -e "${RED}✗ Critical issues detected. Fix errors before deploying.${NC}"
    STATUS=1
fi

# =============================================================================
# Next Steps
# =============================================================================
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}  Next Steps                                 ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "To deploy the application:"
    echo ""
    echo "  Option 1: Automatic (via GitHub Actions)"
    echo "    1. Ensure GitHub secrets are configured"
    echo "    2. Push or merge to 'main' branch"
    echo "    3. Monitor deployment in GitHub Actions"
    echo ""
    echo "  Option 2: Manual workflow dispatch"
    echo "    1. Go to GitHub repository > Actions"
    echo "    2. Select 'Deploy to Azure' workflow"
    echo "    3. Click 'Run workflow'"
    echo "    4. Select environment and run"
    echo ""
    echo "  Option 3: First-time setup"
    echo "    1. Follow: FIRST-DEPLOYMENT.md"
    echo "    2. Time required: 30-40 minutes"
    echo ""
    echo "Documentation:"
    echo "  • Quick Start: DEPLOY-NOW.md"
    echo "  • Full Guide: DEPLOYMENT.md"
    echo "  • First Time: FIRST-DEPLOYMENT.md"
    echo "  • Checklist: DEPLOYMENT-CHECKLIST.md"
else
    echo "Fix the following before deploying:"
    echo ""
    if ! [ -f ".github/workflows/deploy.yml" ]; then
        echo "  • Create deployment workflow: .github/workflows/deploy.yml"
    fi
    if ! [ -f "docker/api/Dockerfile" ]; then
        echo "  • Create Dockerfile: docker/api/Dockerfile"
    fi
    if ! [ -f "package.json" ]; then
        echo "  • Initialize Node.js project: npm init"
    fi
    if ! [ -d ".git" ]; then
        echo "  • Initialize git repository: git init"
    fi
fi

echo ""
exit $STATUS
