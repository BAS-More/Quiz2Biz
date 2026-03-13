/**
 * E2E Test Seed Script
 * Creates test users and data matching e2e/fixtures.ts credentials.
 * Uses upsert() for idempotency -- safe to run multiple times.
 * Gated by NODE_ENV === 'test'.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Test users matching e2e/fixtures.ts
// Role mapping:  fixtures.ADMIN     → UserRole.ADMIN
//                fixtures.MODERATOR → UserRole.DEVELOPER (closest match)
//                fixtures.USER      → UserRole.CLIENT
// ---------------------------------------------------------------------------
const fixtureUsers = [
  {
    id: 'usr_admin_001',
    email: 'admin@quiz2biz.test',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: UserRole.ADMIN,
  },
  {
    id: 'usr_mod_001',
    email: 'moderator@quiz2biz.test',
    password: 'ModeratorPassword123!',
    name: 'Moderator User',
    role: UserRole.DEVELOPER,
  },
  {
    id: 'usr_user_001',
    email: 'user@quiz2biz.test',
    password: 'UserPassword123!',
    name: 'Regular User',
    role: UserRole.CLIENT,
  },
  {
    id: 'usr_pro_001',
    email: 'pro@quiz2biz.test',
    password: 'ProPassword123!',
    name: 'Professional User',
    role: UserRole.CLIENT,
  },
  {
    id: 'usr_ent_001',
    email: 'enterprise@quiz2biz.test',
    password: 'EnterprisePassword123!',
    name: 'Enterprise User',
    role: UserRole.CLIENT,
  },
];

// Role-based test files (registration, session-flow, chat-flow, generation-flow)
// use this shared credential set:
const roleBasedTestUser = {
  email: 'test@quiz2biz.com',
  password: 'Test@Password123!',
  name: 'E2E Test User',
  role: UserRole.CLIENT,
};

// ---------------------------------------------------------------------------
// Test questionnaires matching e2e/fixtures.ts IDs
// ---------------------------------------------------------------------------
const fixtureQuestionnaires = [
  { id: 'q_security_001', name: 'Security Assessment', industry: 'security' },
  { id: 'q_arch_001', name: 'Architecture Review', industry: 'technology' },
  { id: 'q_privacy_001', name: 'Data Privacy & Compliance', industry: 'compliance' },
  { id: 'q_ops_001', name: 'Operational Readiness', industry: 'operations' },
  { id: 'q_finance_001', name: 'Financial Health', industry: 'finance' },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
export async function seedE2eTestData(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  E2E seed requires NODE_ENV=test. Skipping.');
    return;
  }

  console.log('🌱 Seeding E2E test data...');

  // 1. Ensure a test organization exists
  const org = await prisma.organization.upsert({
    where: { slug: 'e2e-test' },
    update: {},
    create: {
      name: 'E2E Test Organization',
      slug: 'e2e-test',
      settings: {},
      subscription: { plan: 'ENTERPRISE', status: 'ACTIVE' },
    },
  });

  // 2. Upsert fixture users
  for (const u of fixtureUsers) {
    const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, role: u.role, name: u.name },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: hash,
        name: u.name,
        role: u.role,
        emailVerified: true,
        organizationId: org.id,
        profile: { name: u.name },
      },
    });
    console.log(`  ✅ ${u.email} (${u.role})`);
  }

  // 3. Upsert role-based test user (shared across multiple test files)
  const rbHash = await bcrypt.hash(roleBasedTestUser.password, BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: roleBasedTestUser.email },
    update: { passwordHash: rbHash, role: roleBasedTestUser.role, name: roleBasedTestUser.name },
    create: {
      email: roleBasedTestUser.email,
      passwordHash: rbHash,
      name: roleBasedTestUser.name,
      role: roleBasedTestUser.role,
      emailVerified: true,
      organizationId: org.id,
      profile: { name: roleBasedTestUser.name },
    },
  });
  console.log(`  ✅ ${roleBasedTestUser.email} (role-based shared user)`);

  // 4. Upsert test questionnaires
  for (const q of fixtureQuestionnaires) {
    await prisma.questionnaire.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        name: q.name,
        description: `E2E test questionnaire: ${q.name}`,
        industry: q.industry,
        version: 1,
        isActive: true,
        estimatedTime: 30,
        metadata: { e2e: true },
      },
    });
    console.log(`  ✅ Questionnaire ${q.id}`);
  }

  console.log('✅ E2E test data seeded successfully');
}

// ---------------------------------------------------------------------------
// Cleanup function (used by global-teardown)
// ---------------------------------------------------------------------------
export async function cleanupE2eTestData(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  E2E cleanup requires NODE_ENV=test. Skipping.');
    return;
  }

  console.log('🧹 Cleaning up E2E test data...');

  const testEmails = [
    ...fixtureUsers.map((u) => u.email),
    roleBasedTestUser.email,
  ];

  // Delete in dependency order: tokens → sessions → users
  // Delete refresh tokens for test users
  await prisma.refreshToken.deleteMany({
    where: { user: { email: { in: testEmails } } },
  });

  // Delete sessions for test users
  await prisma.session.deleteMany({
    where: { user: { email: { in: testEmails } } },
  });

  // Delete audit logs for test users
  await prisma.auditLog.deleteMany({
    where: { user: { email: { in: testEmails } } },
  });

  // Delete test users
  await prisma.user.deleteMany({
    where: { email: { in: testEmails } },
  });

  // Delete test questionnaires
  await prisma.questionnaire.deleteMany({
    where: { id: { in: fixtureQuestionnaires.map((q) => q.id) } },
  });

  // Delete test organization
  await prisma.organization.deleteMany({
    where: { slug: 'e2e-test' },
  });

  console.log('✅ E2E test data cleaned up');
}

// ---------------------------------------------------------------------------
// Direct execution support
// ---------------------------------------------------------------------------
if (require.main === module) {
  const action = process.argv[2] || 'seed';

  const run = action === 'cleanup' ? cleanupE2eTestData : seedE2eTestData;

  run()
    .catch((e) => {
      console.error(`E2E ${action} failed:`, e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
