#!/usr/bin/env node
/**
 * Quiz2Biz CI Pipeline Validation Script
 * 
 * Validates that all required CI/CD gates and components are in place
 * and properly configured for production deployment.
 * 
 * Usage: node scripts/validate-ci-pipeline.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REQUIRED_STAGES = [
    'Build',
    'Test',
    'Security',
    'ScoreGate',
    'Deploy',
];

const REQUIRED_SECURITY_TOOLS = [
    { name: 'SAST', pattern: /eslint|semgrep|sonarqube/i },
    { name: 'SCA', pattern: /npm audit|snyk|dependabot/i },
    { name: 'Secrets Detection', pattern: /gitleaks|trufflehog|detect-secrets/i },
    { name: 'Container Scanning', pattern: /trivy|grype|clair/i },
    { name: 'SBOM Generation', pattern: /syft|cyclonedx|spdx/i },
    { name: 'Container Signing', pattern: /cosign|sigstore|notary/i },
];

const REQUIRED_TESTS = [
    { name: 'Unit Tests', pattern: /jest|mocha|vitest/i },
    { name: 'Integration Tests', pattern: /supertest|e2e|integration/i },
    { name: 'Coverage Threshold', pattern: /coverage.*threshold|--coverage/i },
];

class PipelineValidator {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: [],
        };
    }

    log(status, message) {
        const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
        console.log(`${icons[status]} ${message}`);

        if (status === 'pass') this.results.passed.push(message);
        else if (status === 'fail') this.results.failed.push(message);
        else this.results.warnings.push(message);
    }

    async validateAzurePipelines() {
        console.log('\n📋 Validating Azure Pipelines Configuration\n');

        const pipelinePath = path.join(process.cwd(), 'azure-pipelines.yml');

        if (!fs.existsSync(pipelinePath)) {
            this.log('fail', 'azure-pipelines.yml not found');
            return;
        }

        const content = fs.readFileSync(pipelinePath, 'utf-8');

        // Check for required stages
        console.log('Checking required stages...');
        for (const stage of REQUIRED_STAGES) {
            if (content.includes(`stage: ${stage}`) || content.includes(`- ${stage}`)) {
                this.log('pass', `Stage '${stage}' found`);
            } else {
                this.log('fail', `Stage '${stage}' missing`);
            }
        }

        // Check for security tools
        console.log('\nChecking security tools...');
        for (const tool of REQUIRED_SECURITY_TOOLS) {
            if (tool.pattern.test(content)) {
                this.log('pass', `${tool.name} configured`);
            } else {
                this.log('fail', `${tool.name} not found`);
            }
        }

        // Check for test configurations
        console.log('\nChecking test configurations...');
        for (const test of REQUIRED_TESTS) {
            if (test.pattern.test(content)) {
                this.log('pass', `${test.name} configured`);
            } else {
                this.log('warn', `${test.name} may not be configured`);
            }
        }

        // Check for blocking security gates
        console.log('\nChecking security gate configuration...');
        if (content.includes('continueOnError: false') || !content.includes('continueOnError: true')) {
            this.log('pass', 'Security gates are blocking (not continue on error)');
        } else {
            this.log('warn', 'Some security gates may be non-blocking');
        }

        // Check for Score Gate
        if (content.includes('readiness-score') || content.includes('ScoreGate')) {
            this.log('pass', 'Readiness Score Gate configured');
        } else {
            this.log('fail', 'Readiness Score Gate not found');
        }

        // Check for provenance attestation
        if (content.includes('attest') || content.includes('provenance') || content.includes('slsa')) {
            this.log('pass', 'Provenance attestation configured');
        } else {
            this.log('warn', 'Provenance attestation may not be configured');
        }
    }

    async validateDockerfiles() {
        console.log('\n📦 Validating Docker Configuration\n');

        const dockerfilePath = path.join(process.cwd(), 'docker', 'api', 'Dockerfile');

        if (!fs.existsSync(dockerfilePath)) {
            this.log('fail', 'API Dockerfile not found');
            return;
        }

        const content = fs.readFileSync(dockerfilePath, 'utf-8');

        // Check for multi-stage build
        const stageCount = (content.match(/^FROM/gm) || []).length;
        if (stageCount >= 2) {
            this.log('pass', `Multi-stage build detected (${stageCount} stages)`);
        } else {
            this.log('warn', 'Consider using multi-stage builds for smaller images');
        }

        // Check for non-root user
        if (content.includes('USER') && !content.includes('USER root')) {
            this.log('pass', 'Non-root user configured');
        } else {
            this.log('warn', 'Container may run as root');
        }

        // Check for health check
        if (content.includes('HEALTHCHECK')) {
            this.log('pass', 'Health check configured');
        } else {
            this.log('warn', 'HEALTHCHECK not found in Dockerfile');
        }
    }

    async validateTerraform() {
        console.log('\n🏗️ Validating Terraform Configuration\n');

        const terraformDir = path.join(process.cwd(), 'infrastructure', 'terraform');

        if (!fs.existsSync(terraformDir)) {
            this.log('fail', 'Terraform directory not found');
            return;
        }

        const requiredFiles = ['main.tf', 'variables.tf', 'outputs.tf', 'backend.tf'];
        for (const file of requiredFiles) {
            if (fs.existsSync(path.join(terraformDir, file))) {
                this.log('pass', `${file} exists`);
            } else {
                this.log('fail', `${file} missing`);
            }
        }

        // Check for required modules
        const requiredModules = ['database', 'container-apps', 'keyvault', 'monitoring'];
        const modulesDir = path.join(terraformDir, 'modules');

        if (fs.existsSync(modulesDir)) {
            for (const module of requiredModules) {
                if (fs.existsSync(path.join(modulesDir, module))) {
                    this.log('pass', `Module '${module}' exists`);
                } else {
                    this.log('fail', `Module '${module}' missing`);
                }
            }
        } else {
            this.log('fail', 'Terraform modules directory not found');
        }
    }

    async validateSecurityDocs() {
        console.log('\n📄 Validating Security Documentation\n');

        const requiredDocs = [
            { path: 'docs/security/threat-model.md', name: 'STRIDE Threat Model' },
            { path: 'docs/security/runbook.md', name: 'Incident Response Runbook' },
            { path: 'docs/cto/08-information-security-policy.md', name: 'Information Security Policy' },
            { path: 'docs/cto/09-incident-response-plan.md', name: 'Incident Response Plan' },
            { path: 'docs/cto/10-data-protection-privacy-policy.md', name: 'Data Protection Policy' },
        ];

        for (const doc of requiredDocs) {
            const fullPath = path.join(process.cwd(), doc.path);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (content.length > 500) {
                    this.log('pass', `${doc.name} exists and has content`);
                } else {
                    this.log('warn', `${doc.name} exists but may be incomplete`);
                }
            } else {
                this.log('fail', `${doc.name} not found`);
            }
        }
    }

    async validateADRs() {
        console.log('\n📝 Validating Architecture Decision Records\n');

        const adrDir = path.join(process.cwd(), 'docs', 'adr');

        if (!fs.existsSync(adrDir)) {
            this.log('fail', 'ADR directory not found');
            return;
        }

        const requiredADRs = [
            '001-authentication-authorization.md',
            '002-secrets-management.md',
            '003-data-residency.md',
            '004-monolith-vs-microservices.md',
            '005-database-selection.md',
            '006-multi-tenancy-strategy.md',
            '007-key-rotation-policy.md',
        ];

        for (const adr of requiredADRs) {
            if (fs.existsSync(path.join(adrDir, adr))) {
                this.log('pass', `ADR ${adr.replace('.md', '')} exists`);
            } else {
                this.log('warn', `ADR ${adr.replace('.md', '')} not found`);
            }
        }
    }

    async validatePrismaSchema() {
        console.log('\n🗃️ Validating Database Schema\n');

        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

        if (!fs.existsSync(schemaPath)) {
            this.log('fail', 'Prisma schema not found');
            return;
        }

        const content = fs.readFileSync(schemaPath, 'utf-8');

        const requiredModels = [
            'User',
            'Session',
            'Question',
            'Response',
            'EvidenceRegistry',
            'DecisionLog',
        ];

        for (const model of requiredModels) {
            if (content.includes(`model ${model}`)) {
                this.log('pass', `Model '${model}' defined`);
            } else {
                this.log('fail', `Model '${model}' missing`);
            }
        }

        // Check for audit fields
        if (content.includes('createdAt') && content.includes('updatedAt')) {
            this.log('pass', 'Audit timestamps configured');
        } else {
            this.log('warn', 'Some models may be missing audit timestamps');
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 VALIDATION SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n✅ Passed: ${this.results.passed.length}`);
        console.log(`❌ Failed: ${this.results.failed.length}`);
        console.log(`⚠️  Warnings: ${this.results.warnings.length}`);

        const total = this.results.passed.length + this.results.failed.length;
        const score = total > 0 ? Math.round((this.results.passed.length / total) * 100) : 0;

        console.log(`\n🎯 Compliance Score: ${score}%`);

        if (this.results.failed.length > 0) {
            console.log('\n❌ Failed Checks:');
            this.results.failed.forEach((f) => console.log(`   - ${f}`));
        }

        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.warnings.forEach((w) => console.log(`   - ${w}`));
        }

        console.log('\n' + '='.repeat(60));

        // Exit with appropriate code
        if (score >= 95 && this.results.failed.length === 0) {
            console.log('🎉 Pipeline validation PASSED!\n');
            return 0;
        } else if (score >= 80) {
            console.log('⚠️  Pipeline validation PASSED with warnings.\n');
            return 0;
        } else {
            console.log('❌ Pipeline validation FAILED.\n');
            return 1;
        }
    }

    async run() {
        console.log('🔍 Quiz2Biz CI Pipeline Validator');
        console.log('='.repeat(60));

        await this.validateAzurePipelines();
        await this.validateDockerfiles();
        await this.validateTerraform();
        await this.validateSecurityDocs();
        await this.validateADRs();
        await this.validatePrismaSchema();

        const exitCode = this.printSummary();
        process.exit(exitCode);
    }
}

// Run validator
const validator = new PipelineValidator();
validator.run().catch((err) => {
    console.error('Validation failed with error:', err);
    process.exit(1);
});
