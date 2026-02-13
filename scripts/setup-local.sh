#!/bin/bash
# =============================================================================
# Local Development Setup Script
# Sets up the Adaptive Questionnaire System for local Docker development
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Local Development Setup                     ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed.${NC}"
        echo -e "Please install $1 and try again."
        return 1
    fi
    echo -e "${GREEN}  [OK] $1 found${NC}"
    return 0
}

PREREQ_FAILED=0
check_command "docker" || PREREQ_FAILED=1
check_command "docker" && {
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: docker compose is not available.${NC}"
        PREREQ_FAILED=1
    else
        echo -e "${GREEN}  [OK] docker compose found${NC}"
    fi
}

if [ $PREREQ_FAILED -eq 1 ]; then
    echo -e "\n${RED}Prerequisites check failed. Please install missing tools.${NC}"
    exit 1
fi

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo -e "Please start Docker Desktop or the Docker service."
    exit 1
fi
echo -e "${GREEN}  [OK] Docker daemon is running${NC}"

# =============================================================================
# Step 2: Stop any existing containers
# =============================================================================
echo -e "\n${YELLOW}Step 2: Stopping existing containers...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}  [OK] Existing containers stopped${NC}"

# =============================================================================
# Step 3: Start infrastructure services
# =============================================================================
echo -e "\n${YELLOW}Step 3: Starting PostgreSQL and Redis...${NC}"
docker compose up -d postgres redis

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    PG_HEALTHY=$(docker compose ps postgres --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | grep -c "healthy" || echo "0")
    REDIS_HEALTHY=$(docker compose ps redis --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | grep -c "healthy" || echo "0")
    
    if [ "$PG_HEALTHY" = "1" ] && [ "$REDIS_HEALTHY" = "1" ]; then
        break
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done
echo ""

# Verify health
docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && echo -e "${GREEN}  [OK] PostgreSQL is healthy${NC}" || echo -e "${YELLOW}  [WARN] PostgreSQL health check pending${NC}"
docker compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo -e "${GREEN}  [OK] Redis is healthy${NC}" || echo -e "${YELLOW}  [WARN] Redis health check pending${NC}"

# =============================================================================
# Step 4: Build and start API
# =============================================================================
echo -e "\n${YELLOW}Step 4: Building and starting API...${NC}"
docker compose up -d --build api
echo -e "${GREEN}  [OK] API container started${NC}"

# =============================================================================
# Step 5: Run database migrations
# =============================================================================
echo -e "\n${YELLOW}Step 5: Running database migrations...${NC}"
sleep 5  # Give API container time to fully start

docker compose exec -T api npx prisma migrate deploy 2>/dev/null && {
    echo -e "${GREEN}  [OK] Migrations applied${NC}"
} || {
    echo -e "${YELLOW}  [INFO] Retrying migrations...${NC}"
    sleep 10
    docker compose exec -T api npx prisma migrate deploy || echo -e "${YELLOW}  [WARN] Migration may need manual review${NC}"
}

# =============================================================================
# Step 6: Seed database (optional)
# =============================================================================
echo -e "\n${YELLOW}Step 6: Seeding database...${NC}"
docker compose exec -T api npx prisma db seed 2>/dev/null && {
    echo -e "${GREEN}  [OK] Database seeded${NC}"
} || {
    echo -e "${YELLOW}  [INFO] Seeding skipped or already complete${NC}"
}

# =============================================================================
# Step 7: Health check
# =============================================================================
echo -e "\n${YELLOW}Step 7: Performing health check...${NC}"
sleep 5

HEALTH_OK=0
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=1
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

if [ $HEALTH_OK -eq 1 ]; then
    echo -e "${GREEN}  [OK] API health check passed${NC}"
else
    echo -e "${YELLOW}  [WARN] Health check did not return 200. Check logs with: docker compose logs api${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup Complete!                             ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Services:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${BLUE}Access URLs:${NC}"
echo -e "  API Health:    http://localhost:3000/api/v1/health"
echo -e "  API Docs:      http://localhost:3000/docs"
echo -e "  API v1:        http://localhost:3000/api/v1"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  View logs:     docker compose logs -f api"
echo -e "  Stop all:      docker compose down"
echo -e "  Restart API:   docker compose restart api"
echo -e "  DB Studio:     docker compose exec api npx prisma studio"
echo -e "  Run tests:     docker compose exec api npm test"
#!/bin/bash
# =============================================================================
# Local Development Setup Script
# Sets up the Adaptive Questionnaire System for local Docker development
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Local Development Setup                     ${NC}"
echo -e "${GREEN}  Adaptive Questionnaire System               ${NC}"
echo -e "${GREEN}=============================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed.${NC}"
        echo -e "Please install $1 and try again."
        return 1
    fi
    echo -e "${GREEN}  [OK] $1 found${NC}"
    return 0
}

PREREQ_FAILED=0
check_command "docker" || PREREQ_FAILED=1
check_command "docker" && {
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: docker compose is not available.${NC}"
        PREREQ_FAILED=1
    else
        echo -e "${GREEN}  [OK] docker compose found${NC}"
    fi
}

if [ $PREREQ_FAILED -eq 1 ]; then
    echo -e "\n${RED}Prerequisites check failed. Please install missing tools.${NC}"
    exit 1
fi

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo -e "Please start Docker Desktop or the Docker service."
    exit 1
fi
echo -e "${GREEN}  [OK] Docker daemon is running${NC}"

# =============================================================================
# Step 2: Stop any existing containers
# =============================================================================
echo -e "\n${YELLOW}Step 2: Stopping existing containers...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}  [OK] Existing containers stopped${NC}"

# =============================================================================
# Step 3: Start infrastructure services
# =============================================================================
echo -e "\n${YELLOW}Step 3: Starting PostgreSQL and Redis...${NC}"
docker compose up -d postgres redis

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    PG_HEALTHY=$(docker compose ps postgres --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | grep -c "healthy" || echo "0")
    REDIS_HEALTHY=$(docker compose ps redis --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | grep -c "healthy" || echo "0")
    
    if [ "$PG_HEALTHY" = "1" ] && [ "$REDIS_HEALTHY" = "1" ]; then
        break
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done
echo ""

# Verify health
docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && echo -e "${GREEN}  [OK] PostgreSQL is healthy${NC}" || echo -e "${YELLOW}  [WARN] PostgreSQL health check pending${NC}"
docker compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo -e "${GREEN}  [OK] Redis is healthy${NC}" || echo -e "${YELLOW}  [WARN] Redis health check pending${NC}"

# =============================================================================
# Step 4: Build and start API
# =============================================================================
echo -e "\n${YELLOW}Step 4: Building and starting API...${NC}"
docker compose up -d --build api
echo -e "${GREEN}  [OK] API container started${NC}"

# =============================================================================
# Step 5: Run database migrations
# =============================================================================
echo -e "\n${YELLOW}Step 5: Running database migrations...${NC}"
sleep 5  # Give API container time to fully start

docker compose exec -T api npx prisma migrate deploy 2>/dev/null && {
    echo -e "${GREEN}  [OK] Migrations applied${NC}"
} || {
    echo -e "${YELLOW}  [INFO] Retrying migrations...${NC}"
    sleep 10
    docker compose exec -T api npx prisma migrate deploy || echo -e "${YELLOW}  [WARN] Migration may need manual review${NC}"
}

# =============================================================================
# Step 6: Seed database (optional)
# =============================================================================
echo -e "\n${YELLOW}Step 6: Seeding database...${NC}"
docker compose exec -T api npx prisma db seed 2>/dev/null && {
    echo -e "${GREEN}  [OK] Database seeded${NC}"
} || {
    echo -e "${YELLOW}  [INFO] Seeding skipped or already complete${NC}"
}

# =============================================================================
# Step 7: Health check
# =============================================================================
echo -e "\n${YELLOW}Step 7: Performing health check...${NC}"
sleep 5

HEALTH_OK=0
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=1
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

if [ $HEALTH_OK -eq 1 ]; then
    echo -e "${GREEN}  [OK] API health check passed${NC}"
else
    echo -e "${YELLOW}  [WARN] Health check did not return 200. Check logs with: docker compose logs api${NC}"
fi

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup Complete!                             ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n${BLUE}Services:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${BLUE}Access URLs:${NC}"
echo -e "  API Health:    http://localhost:3000/api/v1/health"
echo -e "  API Docs:      http://localhost:3000/docs"
echo -e "  API v1:        http://localhost:3000/api/v1"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  View logs:     docker compose logs -f api"
echo -e "  Stop all:      docker compose down"
echo -e "  Restart API:   docker compose restart api"
echo -e "  DB Studio:     docker compose exec api npx prisma studio"
echo -e "  Run tests:     docker compose exec api npm test"
