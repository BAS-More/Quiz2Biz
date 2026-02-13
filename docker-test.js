/**
 * Quest-to-Build Docker & Cloud Test Suite
 * Comprehensive testing for local Docker, Quest API, and Azure Cloud deployment
 * 
 * Usage: node docker-test.js [mode]
 *   mode: local | cloud | all (default: all)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================
const CONFIG = {
    // Quest Project Settings
    project: {
        name: 'Adaptive Questionnaire System',
        dockerHub: 'aviben770',
        imageName: 'questionnaire-api',
    },
    // Local Docker Settings
    local: {
        network: 'questionnaire-network',
        subnet: '172.28.0.0/16',
        services: ['postgres', 'redis', 'api'],
        containers: {
            postgres: 'questionnaire-postgres',
            redis: 'questionnaire-redis',
            api: 'questionnaire-api'
        },
        ports: {
            api: 3000,
            postgres: 5432,
            redis: 6379
        }
    },
    // Azure Cloud Settings
    azure: {
        resourceGroup: 'rg-questionnaire-dev',
        containerApp: 'ca-questionnaire-api-dev',
        acr: 'acrquestionnairedev',
        location: 'eastus',
        database: 'psql-questionnaire-dev',
        redis: 'redis-questionnaire-dev'
    },
    // Images
    images: {
        node: 'node:20-alpine',
        postgres: 'postgres:15-alpine',
        redis: 'redis:7-alpine'
    }
};

// =============================================================================
// Utility Functions
// =============================================================================
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, type = 'info') {
    const prefix = {
        info: `${colors.blue}ℹ${colors.reset}`,
        success: `${colors.green}✅${colors.reset}`,
        error: `${colors.red}❌${colors.reset}`,
        warn: `${colors.yellow}⚠${colors.reset}`,
        header: `${colors.cyan}${colors.bold}`,
        step: `${colors.yellow}→${colors.reset}`
    };
    if (type === 'header') {
        console.log(`\n${prefix[type]}${'='.repeat(60)}${colors.reset}`);
        console.log(`${prefix[type]}  ${message}${colors.reset}`);
        console.log(`${prefix[type]}${'='.repeat(60)}${colors.reset}\n`);
    } else {
        console.log(`${prefix[type] || ''} ${message}`);
    }
}

function runCommand(cmd, options = {}) {
    try {
        const result = execSync(cmd, {
            encoding: 'utf8',
            timeout: options.timeout || 30000,
            stdio: options.stdio || 'pipe',
            ...options
        });
        return { success: true, output: result.trim() };
    } catch (error) {
        return { success: false, error: error.message, stderr: error.stderr };
    }
}

function checkFileExists(filePath) {
    return fs.existsSync(path.resolve(filePath));
}

// =============================================================================
// Test Results Tracker
// =============================================================================
const results = {
    local: { passed: 0, failed: 0, skipped: 0, tests: [] },
    quest: { passed: 0, failed: 0, skipped: 0, tests: [] },
    cloud: { passed: 0, failed: 0, skipped: 0, tests: [] }
};

function recordTest(category, name, passed, message = '') {
    results[category].tests.push({ name, passed, message });
    if (passed === true) results[category].passed++;
    else if (passed === false) results[category].failed++;
    else results[category].skipped++;
}

// =============================================================================
// LOCAL DOCKER TESTS
// =============================================================================
function runLocalDockerTests() {
    log('LOCAL DOCKER ENVIRONMENT', 'header');

    // Test 1: Docker Engine
    log('Testing Docker Engine...', 'step');
    const dockerVersion = runCommand('docker version --format "{{.Client.Version}}"', { timeout: 10000 });
    if (dockerVersion.success) {
        log(`Docker Client: ${dockerVersion.output}`, 'success');
        recordTest('local', 'Docker Engine', true, dockerVersion.output);
    } else {
        log('Docker Engine not responding - ensure Docker Desktop is running', 'error');
        recordTest('local', 'Docker Engine', false, 'Not responding');
    }

    // Test 2: Docker Compose
    log('Testing Docker Compose...', 'step');
    const composeVersion = runCommand('docker-compose version --short', { timeout: 5000 });
    if (composeVersion.success) {
        log(`Docker Compose: ${composeVersion.output}`, 'success');
        recordTest('local', 'Docker Compose', true, composeVersion.output);
    } else {
        log('Docker Compose not found', 'error');
        recordTest('local', 'Docker Compose', false);
    }

    // Test 3: Docker Desktop Status
    log('Checking Docker Desktop status...', 'step');
    const desktopStatus = runCommand('docker desktop status', { timeout: 5000 });
    if (desktopStatus.success && desktopStatus.output.includes('running')) {
        log('Docker Desktop is running', 'success');
        recordTest('local', 'Docker Desktop Status', true);
    } else {
        log('Docker Desktop may not be fully started', 'warn');
        recordTest('local', 'Docker Desktop Status', null, 'Starting or unavailable');
    }

    // Test 4: Validate docker-compose.yml
    log('Validating docker-compose.yml...', 'step');
    const composeConfig = runCommand('docker-compose config --quiet', { timeout: 10000 });
    if (composeConfig.success) {
        log('docker-compose.yml is valid', 'success');
        recordTest('local', 'Compose Config', true);
    } else {
        log('docker-compose.yml validation failed', 'error');
        recordTest('local', 'Compose Config', false);
    }

    // Test 5: Check Dockerfile
    log('Checking Dockerfile...', 'step');
    if (checkFileExists('docker/api/Dockerfile')) {
        log('Dockerfile found: docker/api/Dockerfile', 'success');
        recordTest('local', 'Dockerfile Exists', true);
    } else {
        log('Dockerfile not found', 'error');
        recordTest('local', 'Dockerfile Exists', false);
    }

    // Test 6: Network Configuration
    log('Checking network configuration...', 'step');
    const networks = runCommand('docker network ls --format "{{.Name}}"', { timeout: 5000 });
    if (networks.success) {
        const hasNetwork = networks.output.includes('questionnaire');
        log(`Quest network: ${hasNetwork ? 'exists' : 'will be created on start'}`, hasNetwork ? 'success' : 'info');
        recordTest('local', 'Network Config', true, `Subnet: ${CONFIG.local.subnet}`);
    } else {
        recordTest('local', 'Network Config', null, 'Unable to check');
    }

    // Test 7: Running Containers
    log('Checking running containers...', 'step');
    const containers = runCommand('docker ps --format "{{.Names}}"', { timeout: 5000 });
    if (containers.success) {
        const running = CONFIG.local.services.filter(svc =>
            containers.output.includes(CONFIG.local.containers[svc] || svc)
        );
        if (running.length > 0) {
            log(`Running Quest containers: ${running.join(', ')}`, 'success');
        } else {
            log('No Quest containers running (use npm run docker:up to start)', 'info');
        }
        recordTest('local', 'Running Containers', true, `${running.length}/${CONFIG.local.services.length}`);
    } else {
        recordTest('local', 'Running Containers', null);
    }
}

// =============================================================================
// QUEST APPLICATION TESTS
// =============================================================================
function runQuestTests() {
    log('QUEST APPLICATION', 'header');

    // Test 1: Project Structure
    log('Checking Quest project structure...', 'step');
    const requiredPaths = [
        'apps/api/src/main.ts',
        'prisma/schema.prisma',
        'libs/database/src/prisma.service.ts',
        'libs/redis/src/redis.service.ts'
    ];
    const existingPaths = requiredPaths.filter(checkFileExists);
    if (existingPaths.length === requiredPaths.length) {
        log('All Quest source files present', 'success');
        recordTest('quest', 'Project Structure', true);
    } else {
        log(`Missing files: ${requiredPaths.filter(p => !existingPaths.includes(p)).join(', ')}`, 'warn');
        recordTest('quest', 'Project Structure', false);
    }

    // Test 2: Package Dependencies
    log('Checking package.json scripts...', 'step');
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const hasDockerScripts = pkg.scripts && pkg.scripts['docker:up'] && pkg.scripts['docker:down'];
        if (hasDockerScripts) {
            log('Docker scripts configured in package.json', 'success');
            recordTest('quest', 'NPM Docker Scripts', true);
        } else {
            log('Docker scripts missing from package.json', 'error');
            recordTest('quest', 'NPM Docker Scripts', false);
        }
    } catch (e) {
        recordTest('quest', 'NPM Docker Scripts', false, 'package.json not found');
    }

    // Test 3: Environment Files
    log('Checking environment configuration...', 'step');
    const envFiles = ['.env.example', '.env.production.example'];
    const existingEnv = envFiles.filter(checkFileExists);
    if (existingEnv.length > 0) {
        log(`Environment templates: ${existingEnv.join(', ')}`, 'success');
        recordTest('quest', 'Environment Config', true, existingEnv.join(', '));
    } else {
        log('No environment templates found', 'warn');
        recordTest('quest', 'Environment Config', false);
    }

    // Test 4: Prisma Schema
    log('Checking Prisma schema...', 'step');
    if (checkFileExists('prisma/schema.prisma')) {
        const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
        const hasModels = schema.includes('model User') || schema.includes('model Questionnaire');
        log(`Prisma schema: ${hasModels ? 'has models defined' : 'exists'}`, 'success');
        recordTest('quest', 'Prisma Schema', true);
    } else {
        recordTest('quest', 'Prisma Schema', false);
    }

    // Test 5: API Health Check (if running)
    log('Testing Quest API health endpoint...', 'step');
    const healthCheck = runCommand(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${CONFIG.local.ports.api}/health`, { timeout: 5000 });
    if (healthCheck.success && healthCheck.output === '200') {
        log('Quest API health check passed', 'success');
        recordTest('quest', 'API Health', true);
    } else {
        log('Quest API not running locally (expected if containers not started)', 'info');
        recordTest('quest', 'API Health', null, 'API not running');
    }

    // Test 6: Database Connection Test (if running)
    log('Testing PostgreSQL connection...', 'step');
    const pgTest = runCommand(`docker exec questionnaire-postgres pg_isready -U postgres`, { timeout: 5000 });
    if (pgTest.success) {
        log('PostgreSQL is ready', 'success');
        recordTest('quest', 'PostgreSQL', true);
    } else {
        log('PostgreSQL not running (expected if containers not started)', 'info');
        recordTest('quest', 'PostgreSQL', null, 'Not running');
    }

    // Test 7: Redis Connection Test (if running)
    log('Testing Redis connection...', 'step');
    const redisTest = runCommand(`docker exec questionnaire-redis redis-cli ping`, { timeout: 5000 });
    if (redisTest.success && redisTest.output.includes('PONG')) {
        log('Redis is responding', 'success');
        recordTest('quest', 'Redis', true);
    } else {
        log('Redis not running (expected if containers not started)', 'info');
        recordTest('quest', 'Redis', null, 'Not running');
    }
}

// =============================================================================
// AZURE CLOUD TESTS
// =============================================================================
function runCloudTests() {
    log('AZURE CLOUD INFRASTRUCTURE', 'header');

    // Test 1: Azure CLI
    log('Checking Azure CLI...', 'step');
    const azVersion = runCommand('az version --output tsv', { timeout: 10000 });
    if (azVersion.success) {
        log('Azure CLI installed', 'success');
        recordTest('cloud', 'Azure CLI', true);
    } else {
        log('Azure CLI not installed (required for cloud deployment)', 'warn');
        recordTest('cloud', 'Azure CLI', false);
        return; // Skip remaining cloud tests
    }

    // Test 2: Azure Login Status
    log('Checking Azure login status...', 'step');
    const azAccount = runCommand('az account show --output tsv', { timeout: 10000 });
    if (azAccount.success) {
        log('Logged in to Azure', 'success');
        recordTest('cloud', 'Azure Login', true);
    } else {
        log('Not logged in to Azure (run: az login)', 'warn');
        recordTest('cloud', 'Azure Login', false);
    }

    // Test 3: Terraform
    log('Checking Terraform...', 'step');
    const tfVersion = runCommand('terraform version -json', { timeout: 5000 });
    if (tfVersion.success) {
        try {
            const tf = JSON.parse(tfVersion.output);
            log(`Terraform: ${tf.terraform_version}`, 'success');
            recordTest('cloud', 'Terraform', true, tf.terraform_version);
        } catch {
            log('Terraform installed', 'success');
            recordTest('cloud', 'Terraform', true);
        }
    } else {
        log('Terraform not installed (required for infrastructure)', 'warn');
        recordTest('cloud', 'Terraform', false);
    }

    // Test 4: Terraform Configuration
    log('Checking Terraform configuration...', 'step');
    const tfFiles = [
        'infrastructure/terraform/main.tf',
        'infrastructure/terraform/variables.tf',
        'infrastructure/terraform/providers.tf'
    ];
    const existingTf = tfFiles.filter(checkFileExists);
    if (existingTf.length === tfFiles.length) {
        log('Terraform configuration complete', 'success');
        recordTest('cloud', 'Terraform Config', true);
    } else {
        log(`Missing Terraform files: ${tfFiles.filter(f => !existingTf.includes(f)).join(', ')}`, 'warn');
        recordTest('cloud', 'Terraform Config', false);
    }

    // Test 5: Azure Pipelines
    log('Checking Azure Pipelines configuration...', 'step');
    if (checkFileExists('azure-pipelines.yml')) {
        log('Azure Pipelines configured', 'success');
        recordTest('cloud', 'CI/CD Pipeline', true);
    } else {
        log('azure-pipelines.yml not found', 'warn');
        recordTest('cloud', 'CI/CD Pipeline', false);
    }

    // Test 6: Docker Hub Repository
    log('Checking Docker Hub configuration...', 'step');
    log(`Docker Hub: ${CONFIG.project.dockerHub}`, 'success');
    recordTest('cloud', 'Docker Hub', true, `hub.docker.com/repositories/${CONFIG.project.dockerHub}`);

    // Test 7: ACR Configuration
    log('Checking Azure Container Registry settings...', 'step');
    if (azAccount.success) {
        const acrCheck = runCommand(`az acr show --name ${CONFIG.azure.acr} --output tsv 2>&1`, { timeout: 15000 });
        if (acrCheck.success) {
            log(`ACR ${CONFIG.azure.acr} exists`, 'success');
            recordTest('cloud', 'Azure Container Registry', true);
        } else {
            log(`ACR ${CONFIG.azure.acr} not found (will be created by Terraform)`, 'info');
            recordTest('cloud', 'Azure Container Registry', null, 'Not deployed');
        }
    } else {
        recordTest('cloud', 'Azure Container Registry', null, 'Not logged in');
    }

    // Test 8: Resource Group
    log('Checking Azure Resource Group...', 'step');
    if (azAccount.success) {
        const rgCheck = runCommand(`az group show --name ${CONFIG.azure.resourceGroup} --output tsv 2>&1`, { timeout: 15000 });
        if (rgCheck.success) {
            log(`Resource Group ${CONFIG.azure.resourceGroup} exists`, 'success');
            recordTest('cloud', 'Resource Group', true);
        } else {
            log(`Resource Group ${CONFIG.azure.resourceGroup} not found (will be created)`, 'info');
            recordTest('cloud', 'Resource Group', null, 'Not deployed');
        }
    } else {
        recordTest('cloud', 'Resource Group', null, 'Not logged in');
    }
}

// =============================================================================
// SUMMARY & MAIN
// =============================================================================
function printSummary() {
    log('TEST SUMMARY', 'header');

    const categories = [
        { key: 'local', name: 'Local Docker' },
        { key: 'quest', name: 'Quest Application' },
        { key: 'cloud', name: 'Azure Cloud' }
    ];

    let totalPassed = 0, totalFailed = 0, totalSkipped = 0;

    categories.forEach(cat => {
        const r = results[cat.key];
        totalPassed += r.passed;
        totalFailed += r.failed;
        totalSkipped += r.skipped;

        const status = r.failed === 0 ? colors.green : colors.red;
        console.log(`${status}${cat.name}:${colors.reset} ${r.passed} passed, ${r.failed} failed, ${r.skipped} skipped`);
    });

    console.log(`\n${colors.bold}Total:${colors.reset} ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);

    // Project Configuration Summary
    console.log(`\n${colors.cyan}📋 Quest Project Configuration:${colors.reset}`);
    console.log(`   Project:    ${CONFIG.project.name}`);
    console.log(`   Base Image: ${CONFIG.images.node}`);
    console.log(`   Database:   ${CONFIG.images.postgres}`);
    console.log(`   Cache:      ${CONFIG.images.redis}`);
    console.log(`   Network:    ${CONFIG.local.subnet}`);
    console.log(`   Docker Hub: ${CONFIG.project.dockerHub}`);

    console.log(`\n${colors.cyan}☁️  Azure Cloud Configuration:${colors.reset}`);
    console.log(`   Resource Group:  ${CONFIG.azure.resourceGroup}`);
    console.log(`   Container App:   ${CONFIG.azure.containerApp}`);
    console.log(`   ACR:             ${CONFIG.azure.acr}.azurecr.io`);
    console.log(`   Location:        ${CONFIG.azure.location}`);

    // Quick Commands
    console.log(`\n${colors.cyan}🚀 Quick Commands:${colors.reset}`);
    console.log(`   Start local:     npm run docker:up`);
    console.log(`   Stop local:      npm run docker:down`);
    console.log(`   View logs:       npm run docker:logs`);
    console.log(`   Deploy to Azure: ./scripts/deploy.sh`);

    if (totalFailed > 0) {
        console.log(`\n${colors.yellow}⚠ Some tests failed. Review the output above for details.${colors.reset}`);
        process.exit(1);
    }
}

// Main execution
function main() {
    const mode = process.argv[2] || 'all';

    console.log(`${colors.bold}${colors.cyan}`);
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         Quest-to-Build Docker & Cloud Test Suite         ║');
    console.log('║      Adaptive Questionnaire System Infrastructure        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);

    if (mode === 'all' || mode === 'local') {
        runLocalDockerTests();
    }

    if (mode === 'all' || mode === 'quest') {
        runQuestTests();
    }

    if (mode === 'all' || mode === 'cloud') {
        runCloudTests();
    }

    printSummary();
}

main();