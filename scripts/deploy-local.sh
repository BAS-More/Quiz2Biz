#!/bin/bash
# =============================================================================
# Adaptive Questionnaire System - Local Deployment Script
# =============================================================================
# This script automates the full local deployment process.
# 
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Node.js 20+ installed
#   - npm 10+ installed
#
# Usage:
#   chmod +x scripts/deploy-local.sh
#   ./scripts/deploy-local.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+ first."
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        error "Node.js version 20+ is required. Current version: $(node -v)"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
    fi
    
    success "All prerequisites met!"
}

# Setup environment file
setup_env() {
    log "Setting up environment..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        success "Created .env file from .env.example"
        warn "Please review .env and update values if needed"
    else
        success ".env file already exists"
    fi
}

# Install dependencies
install_deps() {
    log "Installing npm dependencies..."
    npm ci
    
    log "Installing document generator dependencies..."
    npm install docx @azure/storage-blob @azure/identity
    
    success "Dependencies installed!"
}

# Start infrastructure
start_infrastructure() {
    log "Starting Docker infrastructure (PostgreSQL, Redis)..."
    
    # Start only postgres and redis, not the api (we'll run that locally)
    docker-compose up -d postgres redis
    
    # Wait for services to be healthy
    log "Waiting for PostgreSQL to be ready..."
    until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        sleep 1
    done
    
    log "Waiting for Redis to be ready..."
    until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
        sleep 1
    done
    
    success "Infrastructure is running!"
}

# Setup database
setup_database() {
    log "Generating Prisma client..."
    npm run db:generate
    
    log "Running database migrations..."
    npm run db:migrate
    
    log "Seeding database..."
    npm run db:seed || warn "Seed may have already been applied"
    
    success "Database setup complete!"
}

# Build application
build_app() {
    log "Building application..."
    npm run build
    success "Build complete!"
}

# Start application
start_app() {
    log "Starting API server..."
    echo ""
    echo "=============================================="
    echo "  Deployment Complete!"
    echo "=============================================="
    echo ""
    echo "  API URL:     http://localhost:3000"
    echo "  Health:      http://localhost:3000/health"
    echo "  Swagger:     http://localhost:3000/api"
    echo ""
    echo "  PostgreSQL:  localhost:5432"
    echo "  Redis:       localhost:6379"
    echo ""
    echo "  To stop: Ctrl+C, then 'docker-compose down'"
    echo "=============================================="
    echo ""
    
    npm run start:dev
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "  Adaptive Questionnaire System"
    echo "  Local Deployment Script"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    setup_env
    install_deps
    start_infrastructure
    setup_database
    build_app
    start_app
}

# Run main function
main "$@"
#!/bin/bash
# =============================================================================
# Adaptive Questionnaire System - Local Deployment Script
# =============================================================================
# This script automates the full local deployment process.
# 
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Node.js 20+ installed
#   - npm 10+ installed
#
# Usage:
#   chmod +x scripts/deploy-local.sh
#   ./scripts/deploy-local.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+ first."
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        error "Node.js version 20+ is required. Current version: $(node -v)"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
    fi
    
    success "All prerequisites met!"
}

# Setup environment file
setup_env() {
    log "Setting up environment..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        success "Created .env file from .env.example"
        warn "Please review .env and update values if needed"
    else
        success ".env file already exists"
    fi
}

# Install dependencies
install_deps() {
    log "Installing npm dependencies..."
    npm ci
    
    log "Installing document generator dependencies..."
    npm install docx @azure/storage-blob @azure/identity
    
    success "Dependencies installed!"
}

# Start infrastructure
start_infrastructure() {
    log "Starting Docker infrastructure (PostgreSQL, Redis)..."
    
    # Start only postgres and redis, not the api (we'll run that locally)
    docker-compose up -d postgres redis
    
    # Wait for services to be healthy
    log "Waiting for PostgreSQL to be ready..."
    until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        sleep 1
    done
    
    log "Waiting for Redis to be ready..."
    until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
        sleep 1
    done
    
    success "Infrastructure is running!"
}

# Setup database
setup_database() {
    log "Generating Prisma client..."
    npm run db:generate
    
    log "Running database migrations..."
    npm run db:migrate
    
    log "Seeding database..."
    npm run db:seed || warn "Seed may have already been applied"
    
    success "Database setup complete!"
}

# Build application
build_app() {
    log "Building application..."
    npm run build
    success "Build complete!"
}

# Start application
start_app() {
    log "Starting API server..."
    echo ""
    echo "=============================================="
    echo "  Deployment Complete!"
    echo "=============================================="
    echo ""
    echo "  API URL:     http://localhost:3000"
    echo "  Health:      http://localhost:3000/health"
    echo "  Swagger:     http://localhost:3000/api"
    echo ""
    echo "  PostgreSQL:  localhost:5432"
    echo "  Redis:       localhost:6379"
    echo ""
    echo "  To stop: Ctrl+C, then 'docker-compose down'"
    echo "=============================================="
    echo ""
    
    npm run start:dev
}

# Main execution
main() {
    echo ""
    echo "=============================================="
    echo "  Adaptive Questionnaire System"
    echo "  Local Deployment Script"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    setup_env
    install_deps
    start_infrastructure
    setup_database
    build_app
    start_app
}

# Run main function
main "$@"
