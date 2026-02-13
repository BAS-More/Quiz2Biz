import { PrismaClient, QuestionType, VisibilityAction, UserRole } from '@prisma/client';
import { seedStandards } from './seeds/standards.seed';
import { seedBusinessIncubator } from './seeds/business-incubator.seed';
import { seedDimensions } from './seeds/dimensions.seed';
import { seedReadinessQuestions } from './seeds/questions.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starting database seed...');

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      settings: {},
      subscription: { plan: 'FREE', status: 'ACTIVE' },
    },
  });
  console.log('Created organization:', org.id);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@questionnaire.app' },
    update: {},
    create: {
      email: 'admin@questionnaire.app',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4eVqX7/Iq3Y.Jtby', // "Admin123!"
      role: UserRole.ADMIN,
      emailVerified: true,
      organizationId: org.id,
      profile: { name: 'System Admin' },
    },
  });
  console.log('Created admin user:', adminUser.id);

  // Create the main questionnaire
  const questionnaire = await prisma.questionnaire.upsert({
    where: { id: 'quest-main-001' },
    update: {},
    create: {
      id: 'quest-main-001',
      name: 'Business Plan Questionnaire',
      description:
        'Comprehensive questionnaire for generating business plans and technical documentation',
      industry: 'general',
      version: 1,
      isActive: true,
      isDefault: true,
      estimatedTime: 45,
      metadata: {
        tags: ['business', 'startup', 'planning'],
        difficulty: 'intermediate',
      },
    },
  });
  console.log('Created questionnaire:', questionnaire.id);

  // Create sections
  const sections = [
    {
      id: 'sec-bf-001',
      name: 'Business Foundation',
      description: 'Basic information about your business',
      orderIndex: 1,
      icon: 'building',
      estimatedTime: 5,
    },
    {
      id: 'sec-ps-001',
      name: 'Product/Service Definition',
      description: 'Define what you are building',
      orderIndex: 2,
      icon: 'box',
      estimatedTime: 8,
    },
    {
      id: 'sec-tm-001',
      name: 'Target Market',
      description: 'Identify your customers and market',
      orderIndex: 3,
      icon: 'users',
      estimatedTime: 6,
    },
    {
      id: 'sec-tr-001',
      name: 'Technology Requirements',
      description: 'Technical platform and infrastructure needs',
      orderIndex: 4,
      icon: 'code',
      estimatedTime: 7,
    },
    {
      id: 'sec-sc-001',
      name: 'Security & Compliance',
      description: 'Data security and regulatory requirements',
      orderIndex: 5,
      icon: 'shield',
      estimatedTime: 5,
    },
    {
      id: 'sec-bm-001',
      name: 'Business Model',
      description: 'Revenue and pricing strategy',
      orderIndex: 6,
      icon: 'dollar',
      estimatedTime: 6,
    },
    {
      id: 'sec-to-001',
      name: 'Team & Operations',
      description: 'Team structure and operations',
      orderIndex: 7,
      icon: 'team',
      estimatedTime: 4,
    },
    {
      id: 'sec-tl-001',
      name: 'Timeline & Milestones',
      description: 'Project timeline and key milestones',
      orderIndex: 8,
      icon: 'calendar',
      estimatedTime: 3,
    },
    {
      id: 'sec-sm-001',
      name: 'Support & Maintenance',
      description: 'Ongoing support requirements',
      orderIndex: 9,
      icon: 'headset',
      estimatedTime: 3,
    },
  ];

  for (const section of sections) {
    await prisma.section.upsert({
      where: { id: section.id },
      update: section,
      create: {
        ...section,
        questionnaireId: questionnaire.id,
        metadata: {},
      },
    });
  }
  console.log('Created', sections.length, 'sections');

  // Create questions for Business Foundation section
  const bfQuestions = [
    {
      id: 'q-bf-001',
      text: 'What is your company or project name?',
      type: QuestionType.TEXT,
      helpText: 'Enter the legal or operating name of your business',
      isRequired: true,
      orderIndex: 1,
      validationRules: { minLength: 2, maxLength: 100 },
    },
    {
      id: 'q-bf-002',
      text: 'Do you have an existing business, or is this a new venture?',
      type: QuestionType.SINGLE_CHOICE,
      helpText: 'This helps us tailor the questionnaire to your situation',
      isRequired: true,
      orderIndex: 2,
      options: [
        { id: 'opt-bf-002-1', label: 'Existing business (operating)', value: 'existing' },
        { id: 'opt-bf-002-2', label: 'New startup (pre-launch)', value: 'startup' },
        { id: 'opt-bf-002-3', label: 'Existing business pivoting to new product', value: 'pivot' },
        {
          id: 'opt-bf-002-4',
          label: 'Internal project within larger organization',
          value: 'internal',
        },
      ],
    },
    {
      id: 'q-bf-003',
      text: 'When was your company founded (or when do you plan to launch)?',
      type: QuestionType.DATE,
      isRequired: true,
      orderIndex: 3,
    },
    {
      id: 'q-bf-004',
      text: "What is your company's legal structure?",
      type: QuestionType.SINGLE_CHOICE,
      helpText: 'Select the legal entity type for your business',
      isRequired: true,
      orderIndex: 4,
      options: [
        { id: 'opt-bf-004-1', label: 'Sole Proprietorship', value: 'sole_prop' },
        { id: 'opt-bf-004-2', label: 'Limited Liability Company (LLC)', value: 'llc' },
        { id: 'opt-bf-004-3', label: 'C Corporation', value: 'c_corp' },
        { id: 'opt-bf-004-4', label: 'S Corporation', value: 's_corp' },
        { id: 'opt-bf-004-5', label: 'Partnership', value: 'partnership' },
        { id: 'opt-bf-004-6', label: 'Non-Profit Organization', value: 'nonprofit' },
        { id: 'opt-bf-004-7', label: 'Not yet decided', value: 'undecided' },
      ],
    },
    {
      id: 'q-bf-005',
      text: 'Where is your company headquartered?',
      type: QuestionType.TEXT,
      placeholder: 'City, State/Province, Country',
      isRequired: true,
      orderIndex: 5,
    },
    {
      id: 'q-bf-006',
      text: 'Describe your business in one sentence (elevator pitch).',
      type: QuestionType.TEXT,
      helpText: 'This will be used in your executive summary',
      isRequired: true,
      orderIndex: 6,
      validationRules: { minLength: 20, maxLength: 200 },
    },
    {
      id: 'q-bf-007',
      text: 'Provide a detailed description of what your business does.',
      type: QuestionType.TEXTAREA,
      helpText: 'Explain your products/services, target market, and value proposition',
      isRequired: true,
      orderIndex: 7,
      validationRules: { minLength: 100, maxLength: 2000 },
    },
  ];

  // Create questions for Product/Service section
  const psQuestions = [
    {
      id: 'q-ps-001',
      text: 'What type of product/service are you building?',
      type: QuestionType.SINGLE_CHOICE,
      isRequired: true,
      orderIndex: 1,
      options: [
        { id: 'opt-ps-001-1', label: 'Software as a Service (SaaS)', value: 'software_saas' },
        { id: 'opt-ps-001-2', label: 'Mobile Application', value: 'mobile_app' },
        { id: 'opt-ps-001-3', label: 'Marketplace/Platform', value: 'marketplace' },
        { id: 'opt-ps-001-4', label: 'E-commerce Store', value: 'ecommerce' },
        { id: 'opt-ps-001-5', label: 'API/Developer Service', value: 'api_service' },
        { id: 'opt-ps-001-6', label: 'Hardware/IoT Product', value: 'hardware_iot' },
        { id: 'opt-ps-001-7', label: 'Consulting/Professional Services', value: 'consulting' },
        { id: 'opt-ps-001-8', label: 'Content/Media Platform', value: 'content_media' },
        { id: 'opt-ps-001-9', label: 'Other', value: 'other' },
      ],
    },
    {
      id: 'q-ps-002',
      text: 'If other, please describe your product type:',
      type: QuestionType.TEXT,
      isRequired: true,
      orderIndex: 2,
      validationRules: { minLength: 10 },
    },
    {
      id: 'q-ps-003',
      text: 'What is the name of your product/service?',
      type: QuestionType.TEXT,
      isRequired: true,
      orderIndex: 3,
      validationRules: { maxLength: 50 },
    },
    {
      id: 'q-ps-004',
      text: 'Describe the core problem your product solves.',
      type: QuestionType.TEXTAREA,
      helpText: 'Focus on the pain point your customers experience',
      isRequired: true,
      orderIndex: 4,
      validationRules: { minLength: 50, maxLength: 1000 },
    },
    {
      id: 'q-ps-005',
      text: 'How does your product solve this problem?',
      type: QuestionType.TEXTAREA,
      helpText: 'Describe your unique solution approach',
      isRequired: true,
      orderIndex: 5,
      validationRules: { minLength: 50, maxLength: 1000 },
    },
    {
      id: 'q-ps-006',
      text: 'What makes your solution unique compared to alternatives?',
      type: QuestionType.TEXTAREA,
      helpText: 'Your competitive advantage or unique value proposition',
      isRequired: true,
      orderIndex: 6,
      validationRules: { minLength: 50, maxLength: 1000 },
    },
    {
      id: 'q-ps-007',
      text: 'Which features are must-have for your MVP?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: true,
      orderIndex: 7,
      options: [
        { id: 'opt-ps-007-1', label: 'User Registration/Authentication', value: 'user_auth' },
        { id: 'opt-ps-007-2', label: 'User Profiles/Accounts', value: 'user_profiles' },
        { id: 'opt-ps-007-3', label: 'Payment Processing', value: 'payments' },
        { id: 'opt-ps-007-4', label: 'Subscription Management', value: 'subscriptions' },
        { id: 'opt-ps-007-5', label: 'Search Functionality', value: 'search' },
        { id: 'opt-ps-007-6', label: 'Messaging/Chat', value: 'messaging' },
        { id: 'opt-ps-007-7', label: 'Push Notifications', value: 'notifications' },
        { id: 'opt-ps-007-8', label: 'Analytics Dashboard', value: 'analytics' },
        { id: 'opt-ps-007-9', label: 'Admin Panel', value: 'admin_panel' },
        { id: 'opt-ps-007-10', label: 'Reporting/Exports', value: 'reporting' },
      ],
    },
  ];

  // Create questions for Target Market section
  const tmQuestions = [
    {
      id: 'q-tm-001',
      text: 'Who is your primary target customer?',
      type: QuestionType.SINGLE_CHOICE,
      isRequired: true,
      orderIndex: 1,
      options: [
        { id: 'opt-tm-001-1', label: 'Individual Consumers (B2C)', value: 'b2c' },
        { id: 'opt-tm-001-2', label: 'Small/Medium Businesses (B2B SMB)', value: 'b2b_smb' },
        {
          id: 'opt-tm-001-3',
          label: 'Enterprise Companies (B2B Enterprise)',
          value: 'b2b_enterprise',
        },
        { id: 'opt-tm-001-4', label: 'Businesses serving consumers (B2B2C)', value: 'b2b2c' },
        { id: 'opt-tm-001-5', label: 'Government/Public Sector (B2G)', value: 'b2g' },
        { id: 'opt-tm-001-6', label: 'Multiple segments', value: 'mixed' },
      ],
    },
    {
      id: 'q-tm-002',
      text: 'Describe your ideal customer profile (ICP).',
      type: QuestionType.TEXTAREA,
      helpText: 'Include demographics, job titles, company size, pain points',
      isRequired: true,
      orderIndex: 2,
      validationRules: { minLength: 100, maxLength: 1500 },
    },
    {
      id: 'q-tm-003',
      text: 'What industries does your product serve?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: true,
      orderIndex: 3,
      options: [
        { id: 'opt-tm-003-1', label: 'Technology/Software', value: 'technology' },
        { id: 'opt-tm-003-2', label: 'Healthcare/Medical', value: 'healthcare' },
        { id: 'opt-tm-003-3', label: 'Finance/Banking', value: 'finance' },
        { id: 'opt-tm-003-4', label: 'Retail/E-commerce', value: 'retail' },
        { id: 'opt-tm-003-5', label: 'Education/EdTech', value: 'education' },
        { id: 'opt-tm-003-6', label: 'Manufacturing', value: 'manufacturing' },
        { id: 'opt-tm-003-7', label: 'Real Estate/PropTech', value: 'real_estate' },
        { id: 'opt-tm-003-8', label: 'Professional Services', value: 'professional_services' },
        { id: 'opt-tm-003-9', label: 'Industry Agnostic', value: 'all_industries' },
      ],
    },
    {
      id: 'q-tm-004',
      text: 'What is the geographic scope of your target market?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: true,
      orderIndex: 4,
      options: [
        { id: 'opt-tm-004-1', label: 'Local (City/Region)', value: 'local' },
        { id: 'opt-tm-004-2', label: 'National (Single Country)', value: 'national' },
        { id: 'opt-tm-004-3', label: 'North America', value: 'north_america' },
        { id: 'opt-tm-004-4', label: 'Europe', value: 'europe' },
        { id: 'opt-tm-004-5', label: 'Asia-Pacific', value: 'apac' },
        { id: 'opt-tm-004-6', label: 'Global', value: 'global' },
      ],
    },
  ];

  // Create questions for Security section
  const scQuestions = [
    {
      id: 'q-sc-001',
      text: 'What type of data will your system handle?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: true,
      orderIndex: 1,
      options: [
        { id: 'opt-sc-001-1', label: 'Personal Identifiable Information (PII)', value: 'pii' },
        { id: 'opt-sc-001-2', label: 'Protected Health Information (PHI)', value: 'phi' },
        { id: 'opt-sc-001-3', label: 'Financial/Payment Data', value: 'financial' },
        { id: 'opt-sc-001-4', label: "Children's Data (COPPA)", value: 'children' },
        { id: 'opt-sc-001-5', label: 'Business/Corporate Data', value: 'business' },
        { id: 'opt-sc-001-6', label: 'Public/Non-sensitive Data Only', value: 'public' },
      ],
    },
    {
      id: 'q-sc-002',
      text: 'What compliance standards must you meet?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: false,
      orderIndex: 2,
      options: [
        { id: 'opt-sc-002-1', label: 'GDPR (EU Privacy)', value: 'gdpr' },
        { id: 'opt-sc-002-2', label: 'CCPA (California Privacy)', value: 'ccpa' },
        { id: 'opt-sc-002-3', label: 'HIPAA (Healthcare)', value: 'hipaa' },
        { id: 'opt-sc-002-4', label: 'PCI-DSS (Payment Card)', value: 'pci' },
        { id: 'opt-sc-002-5', label: 'SOC 2 (Service Organization)', value: 'soc2' },
        { id: 'opt-sc-002-6', label: 'ISO 27001 (Information Security)', value: 'iso27001' },
        { id: 'opt-sc-002-7', label: 'No specific requirements', value: 'none' },
      ],
    },
    {
      id: 'q-sc-003',
      text: 'What authentication methods do you need?',
      type: QuestionType.MULTIPLE_CHOICE,
      isRequired: true,
      orderIndex: 3,
      options: [
        { id: 'opt-sc-003-1', label: 'Email/Password', value: 'email_password' },
        { id: 'opt-sc-003-2', label: 'Social Login (Google, Facebook, etc.)', value: 'social' },
        { id: 'opt-sc-003-3', label: 'Single Sign-On (SSO)', value: 'sso' },
        { id: 'opt-sc-003-4', label: 'Multi-Factor Authentication (MFA)', value: 'mfa' },
        { id: 'opt-sc-003-5', label: 'Biometric (Face ID, Touch ID)', value: 'biometric' },
        { id: 'opt-sc-003-6', label: 'Passwordless (Magic Links)', value: 'passwordless' },
      ],
    },
  ];

  // Create all questions
  const allQuestions = [
    ...bfQuestions.map((q) => ({ ...q, sectionId: 'sec-bf-001' })),
    ...psQuestions.map((q) => ({ ...q, sectionId: 'sec-ps-001' })),
    ...tmQuestions.map((q) => ({ ...q, sectionId: 'sec-tm-001' })),
    ...scQuestions.map((q) => ({ ...q, sectionId: 'sec-sc-001' })),
  ];

  for (const question of allQuestions) {
    await prisma.question.upsert({
      where: { id: question.id },
      update: question,
      create: {
        ...question,
        metadata: {},
        industryTags: [],
        documentMappings: {},
      },
    });
  }
  console.log('Created', allQuestions.length, 'questions');

  // Create visibility rules
  const visibilityRules = [
    {
      id: 'vr-001',
      questionId: 'q-ps-001',
      condition: { field: 'q-ps-001', operator: 'eq', value: 'other' },
      action: VisibilityAction.SHOW,
      targetQuestionIds: ['q-ps-002'],
      priority: 10,
    },
    {
      id: 'vr-002',
      questionId: 'q-ps-001',
      condition: { field: 'q-ps-001', operator: 'ne', value: 'other' },
      action: VisibilityAction.HIDE,
      targetQuestionIds: ['q-ps-002'],
      priority: 5,
    },
    {
      id: 'vr-003',
      questionId: 'q-sc-001',
      condition: { field: 'q-sc-001', operator: 'includes', value: 'phi' },
      action: VisibilityAction.REQUIRE,
      targetQuestionIds: ['q-sc-002'],
      priority: 10,
    },
  ];

  for (const rule of visibilityRules) {
    await prisma.visibilityRule.upsert({
      where: { id: rule.id },
      update: rule,
      create: {
        ...rule,
        isActive: true,
      },
    });
  }
  console.log('Created', visibilityRules.length, 'visibility rules');

  // Seed engineering standards
  await seedStandards();

  // Seed Business Startup Incubator questionnaire
  await seedBusinessIncubator();

  // Seed Quiz2Biz dimensions and readiness questions
  await seedDimensions();
  await seedReadinessQuestions();

  console.log('Database seed completed successfully!');
}

void main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
