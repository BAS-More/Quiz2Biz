#!/usr/bin/env node

/**
 * Test Database Reset Script
 * 
 * Resets the test database to a clean state by:
 * 1. Dropping all tables
 * 2. Running migrations
 * 3. Seeding with test data
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧹 Resetting test database...\n');

// Set test environment
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/questionnaire_test?schema=public';
process.env.NODE_ENV = 'test';

try {
    // Reset database (drops all tables and recreates)
    console.log('📦 Running Prisma migrate reset...');
    execSync('npx prisma migrate reset --force --skip-seed', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
    });

    console.log('\n✅ Test database reset complete!');
    console.log('💡 Database is ready for testing\n');
} catch (error) {
    console.error('\n❌ Failed to reset test database');
    console.error(error.message);
    process.exit(1);
}
