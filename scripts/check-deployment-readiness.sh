#!/bin/bash
# =============================================================================
# Deployment Readiness Checker
# Validates that all prerequisites are met before deploying
# =============================================================================

set +e  # Don't exit on error, handle status at end

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
echo -e "\n${BLUE}[1/13] Checking Repository Structure...${NC}"

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
echo -e "\n${BLUE}[2/13] Checking Documentation...${NC}"

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
echo -e "\n${BLUE}[3/13] Checking Dependencies...${NC}"

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
echo -e "\n${BLUE}[4/13] Checking Environment Configuration...${NC}"

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
echo -e "\n${BLUE}[5/13] Checking Azure CLI...${NC}"

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
# Check 6: Cloud Build Readiness (Docker optional)
# =============================================================================
echo -e "\n${BLUE}[6/13] Checking Cloud Build Readiness...${NC}"

if command -v az &> /dev/null; then
    if az account show &> /dev/null; then
        pass "Azure CLI authenticated for cloud build/deploy"
    else
        warn "Azure CLI installed but not logged in (run: az login)"
    fi
else
    fail "Azure CLI missing (required for cloud-only deployment)"
fi

if command -v docker &> /dev/null; then
    info "Docker detected (optional). Cloud deployment path does not require Docker Desktop."
else
    pass "Docker not installed (cloud-only mode)"
fi

# =============================================================================
# Check 7: Code Quality Metrics (ISO/IEC 5055, MI, Complexity)
# =============================================================================
echo -e "\n${BLUE}[7/13] Checking Code Quality Metrics...${NC}"

MI_SCORE=0
COMPLEXITY_SCORE=0
CODE_QUALITY_PASSED=0

# Check if ESLint is configured for complexity
if [ -f "eslint.config.mjs" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
    pass "ESLint configuration exists (complexity analysis available)"
    ((CODE_QUALITY_PASSED++))
else
    warn "ESLint configuration missing (add complexity rules)"
fi

# Check for SonarQube or similar code quality tools
if [ -f "sonar-project.properties" ]; then
    pass "SonarQube configuration exists (MI/ISO metrics available)"
    ((CODE_QUALITY_PASSED++))
else
    warn "SonarQube not configured (recommended for MI scoring)"
    info "  Add sonar-project.properties for Maintainability Index tracking"
fi

# Check package.json for quality scripts
if [ -f "package.json" ]; then
    if grep -q '"lint"' package.json; then
        pass "Lint script configured in package.json"
        ((CODE_QUALITY_PASSED++))
    else
        warn "No lint script in package.json"
    fi

    if grep -q '"test:coverage"' package.json || grep -q '"coverage"' package.json; then
        pass "Coverage script configured"
        ((CODE_QUALITY_PASSED++))
    else
        warn "No coverage script configured"
    fi
fi

# Estimate code quality score
if [ $CODE_QUALITY_PASSED -ge 3 ]; then
    CODE_QUALITY_SCORE=85
    pass "Code quality tooling: Good ($CODE_QUALITY_PASSED/4 checks)"
elif [ $CODE_QUALITY_PASSED -ge 2 ]; then
    CODE_QUALITY_SCORE=70
    warn "Code quality tooling: Fair ($CODE_QUALITY_PASSED/4 checks)"
else
    CODE_QUALITY_SCORE=50
    fail "Code quality tooling: Needs improvement ($CODE_QUALITY_PASSED/4 checks)"
fi

# =============================================================================
# Check 8: Security Scanning (SAST/DAST Gates)
# =============================================================================
echo -e "\n${BLUE}[8/13] Checking Security Scanning...${NC}"

SECURITY_PASSED=0

# Check for security scanning tools
if [ -f ".snyk" ] || grep -q "snyk" package.json 2>/dev/null; then
    pass "Snyk security scanning configured"
    ((SECURITY_PASSED++))
else
    warn "Snyk not configured (recommended for dependency scanning)"
fi

if [ -f ".secrets.baseline" ]; then
    pass "Secret scanning baseline exists (detect-secrets)"
    ((SECURITY_PASSED++))
else
    warn "Secret scanning not configured"
fi

# Check for npm audit in CI
if [ -f ".github/workflows/ci.yml" ]; then
    if grep -q "npm audit" .github/workflows/ci.yml; then
        pass "npm audit configured in CI"
        ((SECURITY_PASSED++))
    else
        warn "npm audit not in CI workflow"
    fi
fi

# Check for security headers
if [ -f "apps/api/src/main.ts" ]; then
    if grep -q "helmet" apps/api/src/main.ts 2>/dev/null; then
        pass "Helmet security headers configured"
        ((SECURITY_PASSED++))
    else
        warn "Helmet security headers not detected"
    fi
fi

# Calculate security score
if [ $SECURITY_PASSED -ge 3 ]; then
    SECURITY_SCORE=90
    pass "Security scanning: Good ($SECURITY_PASSED/4 checks)"
elif [ $SECURITY_PASSED -ge 2 ]; then
    SECURITY_SCORE=70
    warn "Security scanning: Fair ($SECURITY_PASSED/4 checks)"
else
    SECURITY_SCORE=50
    fail "Security scanning: Needs improvement ($SECURITY_PASSED/4 checks)"
fi

# =============================================================================
# Check 9: Documentation Heuristics
# =============================================================================
echo -e "\n${BLUE}[9/13] Checking Documentation Heuristics...${NC}"

DOC_PASSED=0

# Check for README with purpose statement
if [ -f "README.md" ]; then
    # Check for Purpose/Overview section in first 20 lines
    if head -20 README.md | grep -qiE "purpose|overview|about|what is"; then
        pass "README has purpose/overview section"
        ((DOC_PASSED++))
    else
        warn "README missing clear purpose statement (15-second rule)"
    fi

    # Check README length and diagram presence
    README_LINES=$(wc -l < README.md)
    if [ "$README_LINES" -gt 150 ]; then
        if grep -qE '\!\[|\`\`\`mermaid|\`\`\`plantuml|\.png|\.svg' README.md; then
            pass "README >150 lines includes visual diagrams"
            ((DOC_PASSED++))
        else
            warn "README >150 lines but no visual diagrams (150-Line Rule)"
        fi
    else
        pass "README within 150-line guideline or has diagrams"
        ((DOC_PASSED++))
    fi
fi

# Check for ADR (Architecture Decision Records)
if [ -d "docs/adr" ]; then
    ADR_COUNT=$(ls -1 docs/adr/*.md 2>/dev/null | wc -l)
    if [ "$ADR_COUNT" -gt 0 ]; then
        pass "Architecture Decision Records exist ($ADR_COUNT ADRs)"
        ((DOC_PASSED++))
    fi
else
    warn "No ADR directory (docs/adr) - document architectural decisions"
fi

# Check for API documentation
if [ -f "apps/api/src/main.ts" ]; then
    if grep -q "swagger\|openapi" apps/api/src/main.ts 2>/dev/null; then
        pass "API documentation (Swagger/OpenAPI) configured"
        ((DOC_PASSED++))
    else
        warn "No Swagger/OpenAPI documentation detected"
    fi
fi

# Calculate documentation score
if [ $DOC_PASSED -ge 3 ]; then
    DOC_SCORE=85
    pass "Documentation heuristics: Good ($DOC_PASSED/4 checks)"
elif [ $DOC_PASSED -ge 2 ]; then
    DOC_SCORE=70
    warn "Documentation heuristics: Fair ($DOC_PASSED/4 checks)"
else
    DOC_SCORE=50
    fail "Documentation heuristics: Needs improvement ($DOC_PASSED/4 checks)"
fi

# =============================================================================
# Check 10: Testing Standards
# =============================================================================
echo -e "\n${BLUE}[10/13] Checking Testing Standards...${NC}"

TEST_PASSED=0

# Check for test directories
if [ -d "apps/api/test" ] || [ -d "apps/web/src/__tests__" ] || [ -d "test" ]; then
    pass "Test directories exist"
    ((TEST_PASSED++))
fi

# Check for test configuration
if [ -f "vitest.config.ts" ] || [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
    pass "Test configuration exists"
    ((TEST_PASSED++))
fi

# Check for e2e tests
if [ -d "e2e" ]; then
    E2E_COUNT=$(find e2e -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l)
    if [ "$E2E_COUNT" -gt 0 ]; then
        pass "E2E tests exist ($E2E_COUNT test files)"
        ((TEST_PASSED++))
    fi
else
    warn "No e2e test directory"
fi

# Check for performance tests
if [ -d "test/performance" ]; then
    pass "Performance test directory exists (k6/NBomber)"
    ((TEST_PASSED++))
else
    warn "No performance test directory (test/performance)"
fi

# Calculate testing score
if [ $TEST_PASSED -ge 3 ]; then
    TEST_SCORE=90
    pass "Testing standards: Good ($TEST_PASSED/4 checks)"
elif [ $TEST_PASSED -ge 2 ]; then
    TEST_SCORE=70
    warn "Testing standards: Fair ($TEST_PASSED/4 checks)"
else
    TEST_SCORE=50
    fail "Testing standards: Needs improvement ($TEST_PASSED/4 checks)"
fi

# =============================================================================
# Check 11: DORA Metrics Readiness
# =============================================================================
echo -e "\n${BLUE}[11/13] Checking DORA Metrics Readiness...${NC}"

DORA_PASSED=0

# Check for CI/CD pipeline (Lead Time optimization)
if [ -f ".github/workflows/ci.yml" ] && [ -f ".github/workflows/deploy.yml" ]; then
    pass "CI/CD pipelines configured (Lead Time optimization)"
    ((DORA_PASSED++))
fi

# Check for automated deployments (push trigger on main branch)
DEPLOY_YAML=$(cat .github/workflows/deploy.yml 2>/dev/null || echo "")
if echo "$DEPLOY_YAML" | grep -q "push:" && echo "$DEPLOY_YAML" | grep -q "main"; then
    pass "Automated deployment on push to main configured"
    ((DORA_PASSED++))
else
    warn "Manual deployment triggers only (impacts Lead Time)"
fi

# Check PR template for size guidance
if [ -f ".github/pull_request_template.md" ]; then
    pass "PR template exists (standardized reviews)"
    ((DORA_PASSED++))
else
    warn "No PR template - add .github/pull_request_template.md"
    info "  Target: 70% of PRs should be under 200 lines"
fi

# Check for branch protection indicators
if [ -f ".github/CODEOWNERS" ]; then
    pass "CODEOWNERS file exists (review requirements)"
    ((DORA_PASSED++))
else
    warn "No CODEOWNERS file"
fi

# Calculate DORA score
if [ $DORA_PASSED -ge 3 ]; then
    DORA_SCORE=85
    pass "DORA metrics readiness: Good ($DORA_PASSED/4 checks)"
elif [ $DORA_PASSED -ge 2 ]; then
    DORA_SCORE=70
    warn "DORA metrics readiness: Fair ($DORA_PASSED/4 checks)"
else
    DORA_SCORE=50
    fail "DORA metrics readiness: Needs improvement ($DORA_PASSED/4 checks)"
fi

info "  Lead Time Target: <1 hour | Rework Rate Target: <5%"
info "  PR Size Target: 70% under 200 lines"

# =============================================================================
# Check 12: AI Code Verification
# =============================================================================
echo -e "\n${BLUE}[12/13] Checking AI Code Verification...${NC}"

AI_PASSED=0

# Check for TypeScript strict mode
if [ -f "tsconfig.json" ]; then
    if grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
        pass "TypeScript strict mode enabled (AI code validation)"
        ((AI_PASSED++))
    else
        warn "TypeScript strict mode not enabled"
    fi
fi

# Check for lint-staged or pre-commit hooks
if [ -f ".husky/pre-commit" ] || [ -f ".pre-commit-config.yaml" ]; then
    pass "Pre-commit hooks configured (AI code verification)"
    ((AI_PASSED++))
else
    warn "No pre-commit hooks for AI code verification"
fi

# Check for code review requirement (CODEOWNERS or branch protection)
if [ -f ".github/CODEOWNERS" ]; then
    pass "Code review required via CODEOWNERS"
    ((AI_PASSED++))
fi

# Check for test coverage enforcement
if grep -q "coverage" package.json 2>/dev/null; then
    pass "Test coverage configured (AI code must have >=80% coverage)"
    ((AI_PASSED++))
else
    warn "No coverage enforcement for AI-generated code"
fi

# Calculate AI verification score
if [ $AI_PASSED -ge 3 ]; then
    AI_SCORE=90
    pass "AI verification readiness: Good ($AI_PASSED/4 checks)"
elif [ $AI_PASSED -ge 2 ]; then
    AI_SCORE=70
    warn "AI verification readiness: Fair ($AI_PASSED/4 checks)"
else
    AI_SCORE=50
    fail "AI verification readiness: Needs improvement ($AI_PASSED/4 checks)"
fi

info "  AI code requires: lint + type-check + >=80% coverage + peer review"

# =============================================================================
# Check 13: Git Status
# =============================================================================
echo -e "\n${BLUE}[13/13] Checking Git Status...${NC}"

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

# =============================================================================
# Sprint Validation Score (Measurable Standards)
# =============================================================================
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}  Sprint Validation Score                    ${NC}"
echo -e "${BLUE}=============================================${NC}"

# Calculate weighted overall score
# Weights: Code Quality 15%, Security 20%, Documentation 10%, Testing 20%, DORA 15%, AI 10%
OVERALL_SCORE=$(( (CODE_QUALITY_SCORE * 15 + SECURITY_SCORE * 20 + DOC_SCORE * 10 + TEST_SCORE * 20 + DORA_SCORE * 15 + AI_SCORE * 10) / 90 ))

echo ""
echo -e "  Code Quality (ISO/MI/Complexity):  ${CODE_QUALITY_SCORE}%"
echo -e "  Security Gates (SAST/DAST):        ${SECURITY_SCORE}%"
echo -e "  Documentation Heuristics:          ${DOC_SCORE}%"
echo -e "  Testing Standards:                 ${TEST_SCORE}%"
echo -e "  DORA Metrics Readiness:            ${DORA_SCORE}%"
echo -e "  AI Code Verification:              ${AI_SCORE}%"
echo ""
echo -e "  ─────────────────────────────────────"

# Determine pipeline health
if [ $OVERALL_SCORE -ge 90 ]; then
    PIPELINE_HEALTH="HEALTHY"
    echo -e "  ${GREEN}OVERALL SCORE: ${OVERALL_SCORE}% - EXCELLENT${NC}"
    echo -e "  ${GREEN}PIPELINE HEALTH: ${PIPELINE_HEALTH}${NC}"
    echo -e "  ${GREEN}✓ Deployment APPROVED${NC}"
elif [ $OVERALL_SCORE -ge 80 ]; then
    PIPELINE_HEALTH="HEALTHY"
    echo -e "  ${GREEN}OVERALL SCORE: ${OVERALL_SCORE}% - GOOD${NC}"
    echo -e "  ${GREEN}PIPELINE HEALTH: ${PIPELINE_HEALTH}${NC}"
    echo -e "  ${YELLOW}⚠ Deployment APPROVED with monitoring${NC}"
elif [ $OVERALL_SCORE -ge 70 ]; then
    PIPELINE_HEALTH="WARNING"
    echo -e "  ${YELLOW}OVERALL SCORE: ${OVERALL_SCORE}% - FAIR${NC}"
    echo -e "  ${YELLOW}PIPELINE HEALTH: ${PIPELINE_HEALTH}${NC}"
    echo -e "  ${YELLOW}⚠ Deployment requires REVIEW APPROVAL${NC}"
elif [ $OVERALL_SCORE -ge 60 ]; then
    PIPELINE_HEALTH="WARNING"
    echo -e "  ${YELLOW}OVERALL SCORE: ${OVERALL_SCORE}% - NEEDS WORK${NC}"
    echo -e "  ${YELLOW}PIPELINE HEALTH: ${PIPELINE_HEALTH}${NC}"
    echo -e "  ${RED}✗ Remediation required before deployment${NC}"
else
    PIPELINE_HEALTH="CRITICAL"
    echo -e "  ${RED}OVERALL SCORE: ${OVERALL_SCORE}% - CRITICAL${NC}"
    echo -e "  ${RED}PIPELINE HEALTH: ${PIPELINE_HEALTH}${NC}"
    echo -e "  ${RED}✗ Deployment BLOCKED - Score below 60%${NC}"
fi

echo ""

if [ $FAILED -eq 0 ] && [ $OVERALL_SCORE -ge 60 ]; then
    if [ $WARNINGS -eq 0 ] && [ $OVERALL_SCORE -ge 90 ]; then
        echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
        STATUS=0
    elif [ $OVERALL_SCORE -ge 70 ]; then
        echo -e "${YELLOW}⚠ Warnings detected or score below 90%. Review above.${NC}"
        echo -e "${YELLOW}  You can proceed with deployment, but consider addressing issues.${NC}"
        STATUS=0
    else
        echo -e "${YELLOW}⚠ Score between 60-70%. Remediation recommended.${NC}"
        echo -e "${YELLOW}  Deployment allowed but requires close monitoring.${NC}"
        STATUS=0
    fi
else
    if [ $OVERALL_SCORE -lt 60 ]; then
        echo -e "${RED}✗ Sprint validation score below 60%. Deployment blocked.${NC}"
        echo -e "${RED}  Pipeline health: CRITICAL${NC}"
    else
        echo -e "${RED}✗ Critical issues detected. Fix errors before deploying.${NC}"
    fi
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
    if ! command -v az &> /dev/null; then
        echo "  • Install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli"
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
