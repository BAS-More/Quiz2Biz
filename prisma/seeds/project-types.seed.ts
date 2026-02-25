import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Project Types Seed
 *
 * Creates the keystone ProjectType entities that drive the entire
 * Quiz2Biz adaptive questionnaire platform.
 *
 * Each project type defines:
 * - Which dimensions are relevant for scoring
 * - Which document types can be generated
 * - Which questionnaire template to use
 */

export interface ProjectTypeSeedData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  isDefault: boolean;
  metadata: Record<string, unknown>;
}

export const projectTypes: ProjectTypeSeedData[] = [
  {
    slug: 'business-plan',
    name: 'Business Plan',
    description:
      'Comprehensive business planning for startups and new ventures. ' +
      'Covers market analysis, financial projections, operations, and go-to-market strategy.',
    icon: 'briefcase',
    isDefault: true,
    metadata: {
      category: 'business',
      targetAudience: ['entrepreneurs', 'startups', 'small-business'],
      estimatedCompletionMinutes: 60,
      documentTypes: [
        'business-plan',
        'marketing-strategy',
        'financial-projections',
        'investor-pitch',
      ],
    },
  },
  {
    slug: 'tech-assessment',
    name: 'Technology Readiness Assessment',
    description:
      'ISO/NIST-aligned technology readiness assessment across 11 dimensions. ' +
      'Evaluates architecture, security, DevOps, testing, and compliance posture.',
    icon: 'shield-check',
    isDefault: false,
    metadata: {
      category: 'technology',
      targetAudience: ['cto', 'engineering-leads', 'devops'],
      estimatedCompletionMinutes: 90,
      documentTypes: [
        'tech-roadmap',
        'security-assessment',
        'devops-maturity',
        'compliance-report',
      ],
      legacyModulesEnabled: true,
    },
  },
  {
    slug: 'marketing-strategy',
    name: 'Marketing Strategy',
    description:
      'Build a data-driven marketing strategy covering target audience, channels, ' +
      'content strategy, budget allocation, and KPI frameworks.',
    icon: 'megaphone',
    isDefault: false,
    metadata: {
      category: 'marketing',
      targetAudience: ['marketers', 'founders', 'growth-leads'],
      estimatedCompletionMinutes: 45,
      documentTypes: ['marketing-strategy', 'content-calendar', 'channel-plan'],
    },
  },
  {
    slug: 'financial-projections',
    name: 'Financial Projections',
    description:
      'Generate detailed financial models including revenue forecasts, expense budgets, ' +
      'cash flow projections, and break-even analysis.',
    icon: 'chart-line',
    isDefault: false,
    metadata: {
      category: 'finance',
      targetAudience: ['founders', 'cfo', 'investors'],
      estimatedCompletionMinutes: 40,
      documentTypes: ['financial-projections', 'budget-plan', 'investor-pitch'],
    },
  },
];

/**
 * Business Plan dimensions with weights summing to 1.0
 */
export const businessPlanDimensions = [
  {
    key: 'bp_foundation',
    displayName: 'Business Foundation',
    description: 'Company identity, mission, vision, legal structure, and core values.',
    weight: 0.12,
    orderIndex: 1,
  },
  {
    key: 'bp_product',
    displayName: 'Product/Service Definition',
    description: 'Product description, problem-solution fit, unique value proposition, and MVP features.',
    weight: 0.15,
    orderIndex: 2,
  },
  {
    key: 'bp_market',
    displayName: 'Target Market & Customers',
    description: 'Customer segments, market size (TAM/SAM/SOM), geographic focus, and competitive landscape.',
    weight: 0.14,
    orderIndex: 3,
  },
  {
    key: 'bp_business_model',
    displayName: 'Business Model & Pricing',
    description: 'Revenue streams, pricing strategy, unit economics, and monetization approach.',
    weight: 0.13,
    orderIndex: 4,
  },
  {
    key: 'bp_marketing',
    displayName: 'Marketing & Go-to-Market',
    description: 'Marketing channels, customer acquisition strategy, brand positioning, and launch plan.',
    weight: 0.11,
    orderIndex: 5,
  },
  {
    key: 'bp_operations',
    displayName: 'Operations & Team',
    description: 'Team structure, key roles, operational processes, and partnerships.',
    weight: 0.10,
    orderIndex: 6,
  },
  {
    key: 'bp_financials',
    displayName: 'Financial Planning',
    description: 'Revenue projections, expense budgets, cash flow, break-even analysis, and funding needs.',
    weight: 0.12,
    orderIndex: 7,
  },
  {
    key: 'bp_technology',
    displayName: 'Technology & Platform',
    description: 'Technical requirements, platform choices, security needs, and scalability planning.',
    weight: 0.08,
    orderIndex: 8,
  },
  {
    key: 'bp_risk',
    displayName: 'Risk & Compliance',
    description: 'Risk assessment, mitigation strategies, regulatory requirements, and contingency planning.',
    weight: 0.05,
    orderIndex: 9,
  },
];

/**
 * Marketing Strategy dimensions with weights summing to 1.0
 */
export const marketingStrategyDimensions = [
  {
    key: 'ms_audience',
    displayName: 'Target Audience',
    description: 'Customer personas, segments, behaviors, and pain points.',
    weight: 0.18,
    orderIndex: 1,
  },
  {
    key: 'ms_positioning',
    displayName: 'Brand & Positioning',
    description: 'Brand identity, value proposition, competitive positioning, and messaging.',
    weight: 0.15,
    orderIndex: 2,
  },
  {
    key: 'ms_channels',
    displayName: 'Channels & Distribution',
    description: 'Marketing channels, content distribution, partnerships, and platform strategy.',
    weight: 0.17,
    orderIndex: 3,
  },
  {
    key: 'ms_content',
    displayName: 'Content Strategy',
    description: 'Content types, editorial calendar, SEO strategy, and thought leadership.',
    weight: 0.15,
    orderIndex: 4,
  },
  {
    key: 'ms_acquisition',
    displayName: 'Customer Acquisition',
    description: 'Paid media, organic growth, referral programs, and conversion funnels.',
    weight: 0.15,
    orderIndex: 5,
  },
  {
    key: 'ms_budget',
    displayName: 'Budget & Resources',
    description: 'Marketing budget allocation, team resources, and tool stack.',
    weight: 0.10,
    orderIndex: 6,
  },
  {
    key: 'ms_metrics',
    displayName: 'Metrics & KPIs',
    description: 'Performance metrics, attribution models, reporting cadence, and success criteria.',
    weight: 0.10,
    orderIndex: 7,
  },
];

/**
 * Financial Projections dimensions with weights summing to 1.0
 */
export const financialProjectionsDimensions = [
  {
    key: 'fp_revenue',
    displayName: 'Revenue Model',
    description: 'Revenue streams, pricing tiers, growth assumptions, and conversion rates.',
    weight: 0.20,
    orderIndex: 1,
  },
  {
    key: 'fp_costs',
    displayName: 'Cost Structure',
    description: 'Fixed costs, variable costs, COGS, and operating expenses.',
    weight: 0.18,
    orderIndex: 2,
  },
  {
    key: 'fp_cashflow',
    displayName: 'Cash Flow',
    description: 'Cash flow projections, burn rate, runway, and working capital needs.',
    weight: 0.17,
    orderIndex: 3,
  },
  {
    key: 'fp_funding',
    displayName: 'Funding & Investment',
    description: 'Capital requirements, funding sources, equity structure, and use of funds.',
    weight: 0.15,
    orderIndex: 4,
  },
  {
    key: 'fp_breakeven',
    displayName: 'Break-Even & Profitability',
    description: 'Break-even analysis, margin targets, and path to profitability.',
    weight: 0.15,
    orderIndex: 5,
  },
  {
    key: 'fp_assumptions',
    displayName: 'Assumptions & Scenarios',
    description: 'Key assumptions, sensitivity analysis, and best/worst/expected scenarios.',
    weight: 0.15,
    orderIndex: 6,
  },
];

/**
 * Document type seeds for each project type
 */
export const documentTypeSeeds = [
  {
    slug: 'business-plan-doc',
    name: 'Business Plan',
    description: 'Comprehensive business plan document covering all aspects of the venture.',
    category: 'CEO',
    projectTypeSlug: 'business-plan',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 25,
    // Core questions: strategy/vision, stakeholder alignment, budget, system architecture, requirements
    requiredQuestions: ['q-strategy-001', 'q-strategy-002', 'q-finance-001', 'q-arch-001', 'q-req-001'],
  },
  {
    slug: 'marketing-strategy-doc',
    name: 'Marketing Strategy',
    description: 'Detailed marketing strategy with channel plans and budget allocation.',
    category: 'BA',
    projectTypeSlug: 'business-plan',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 15,
    // Core questions: strategy/vision, requirements definition, market requirements, people/team
    requiredQuestions: ['q-strategy-001', 'q-req-001', 'q-req-002', 'q-people-001', 'q-people-002'],
  },
  {
    slug: 'financial-projections-doc',
    name: 'Financial Projections',
    description: '3-5 year financial projections with revenue, costs, and cash flow models.',
    category: 'CFO',
    projectTypeSlug: 'business-plan',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 12,
    // Core questions: budget tracking, TCO analysis, cloud cost optimization
    requiredQuestions: ['q-finance-001', 'q-finance-002', 'q-finance-003'],
  },
  {
    slug: 'investor-pitch-doc',
    name: 'Investor Pitch Deck',
    description: 'Concise investor-ready pitch document with key business metrics.',
    category: 'CEO',
    projectTypeSlug: 'business-plan',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 10,
    // Core questions: strategy/vision, stakeholder alignment, budget, architecture, requirements
    requiredQuestions: ['q-strategy-001', 'q-strategy-002', 'q-finance-001', 'q-arch-001', 'q-req-001'],
  },
  {
    slug: 'ai-prompts-doc',
    name: 'AI Prompt Library',
    description: 'Curated AI prompts for business operations, marketing, and customer service.',
    category: 'BA',
    projectTypeSlug: 'business-plan',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 8,
    // Core questions: strategy/vision, operations
    requiredQuestions: ['q-strategy-001', 'q-ops-001'],
  },
  {
    slug: 'ms-strategy-doc',
    name: 'Marketing Strategy Report',
    description: 'Complete marketing strategy with audience analysis and channel plans.',
    category: 'BA',
    projectTypeSlug: 'marketing-strategy',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 18,
    // Core questions: strategy/vision, requirements definition, market requirements, people/team
    requiredQuestions: ['q-strategy-001', 'q-req-001', 'q-req-002', 'q-people-001'],
  },
  {
    slug: 'fp-report-doc',
    name: 'Financial Projections Report',
    description: 'Detailed financial model with projections, scenarios, and funding analysis.',
    category: 'CFO',
    projectTypeSlug: 'financial-projections',
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 20,
    // Core questions: budget tracking, TCO analysis, cloud cost optimization
    requiredQuestions: ['q-finance-001', 'q-finance-002', 'q-finance-003'],
  },
];

/**
 * Seed all project types with their dimensions and document types
 */
export async function seedProjectTypes(): Promise<void> {
  console.log('\n📋 Seeding Project Types...');

  // Create project types
  const createdTypes = new Map<string, string>();

  for (const pt of projectTypes) {
    const result = await prisma.projectType.upsert({
      where: { slug: pt.slug },
      update: {
        name: pt.name,
        description: pt.description,
        icon: pt.icon,
        isDefault: pt.isDefault,
        isActive: true,
        metadata: pt.metadata as Record<string, unknown> as Prisma.InputJsonValue,
      },
      create: {
        slug: pt.slug,
        name: pt.name,
        description: pt.description,
        icon: pt.icon,
        isDefault: pt.isDefault,
        isActive: true,
        metadata: pt.metadata as Record<string, unknown> as Prisma.InputJsonValue,
      },
    });

    createdTypes.set(pt.slug, result.id);
    console.log(`  ✓ ProjectType: ${pt.name} (${pt.slug}) [ID: ${result.id}]`);
  }

  // Seed business-plan dimensions
  const bpTypeId = createdTypes.get('business-plan');
  if (bpTypeId) {
    console.log('\n  📊 Seeding Business Plan dimensions...');
    for (const dim of businessPlanDimensions) {
      await prisma.dimensionCatalog.upsert({
        where: { key: dim.key },
        update: {
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: bpTypeId,
        },
        create: {
          key: dim.key,
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: bpTypeId,
        },
      });
      console.log(`    ✓ ${dim.key}: ${dim.displayName} (weight: ${dim.weight})`);
    }
  }

  // Seed marketing-strategy dimensions
  const msTypeId = createdTypes.get('marketing-strategy');
  if (msTypeId) {
    console.log('\n  📊 Seeding Marketing Strategy dimensions...');
    for (const dim of marketingStrategyDimensions) {
      await prisma.dimensionCatalog.upsert({
        where: { key: dim.key },
        update: {
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: msTypeId,
        },
        create: {
          key: dim.key,
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: msTypeId,
        },
      });
      console.log(`    ✓ ${dim.key}: ${dim.displayName} (weight: ${dim.weight})`);
    }
  }

  // Seed financial-projections dimensions
  const fpTypeId = createdTypes.get('financial-projections');
  if (fpTypeId) {
    console.log('\n  📊 Seeding Financial Projections dimensions...');
    for (const dim of financialProjectionsDimensions) {
      await prisma.dimensionCatalog.upsert({
        where: { key: dim.key },
        update: {
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: fpTypeId,
        },
        create: {
          key: dim.key,
          displayName: dim.displayName,
          description: dim.description,
          weight: dim.weight,
          orderIndex: dim.orderIndex,
          isActive: true,
          projectTypeId: fpTypeId,
        },
      });
      console.log(`    ✓ ${dim.key}: ${dim.displayName} (weight: ${dim.weight})`);
    }
  }

  // Associate existing tech-assessment dimensions with the tech-assessment project type
  const taTypeId = createdTypes.get('tech-assessment');
  if (taTypeId) {
    console.log('\n  📊 Migrating existing dimensions under tech-assessment...');
    const existingDimKeys = [
      'arch_sec', 'devops_iac', 'quality_test', 'finance', 'strategy',
      'requirements', 'data_ai', 'privacy_legal', 'service_ops',
      'compliance_policy', 'people_change',
    ];
    for (const key of existingDimKeys) {
      await prisma.dimensionCatalog.updateMany({
        where: { key, projectTypeId: null },
        data: { projectTypeId: taTypeId },
      });
    }
    console.log(`    ✓ Migrated ${existingDimKeys.length} dimensions to tech-assessment`);
  }

  // Seed document types
  console.log('\n  📄 Seeding Document Types...');
  for (const dt of documentTypeSeeds) {
    const projectTypeId = createdTypes.get(dt.projectTypeSlug);
    await prisma.documentType.upsert({
      where: { slug: dt.slug },
      update: {
        name: dt.name,
        description: dt.description,
        category: dt.category as 'CEO' | 'CFO' | 'BA' | 'CTO' | 'POLICY' | 'SEO',
        projectTypeId,
        outputFormats: dt.outputFormats,
        estimatedPages: dt.estimatedPages,
        requiredQuestions: dt.requiredQuestions,
        isActive: true,
      },
      create: {
        slug: dt.slug,
        name: dt.name,
        description: dt.description,
        category: dt.category as 'CEO' | 'CFO' | 'BA' | 'CTO' | 'POLICY' | 'SEO',
        projectTypeId,
        outputFormats: dt.outputFormats,
        estimatedPages: dt.estimatedPages,
        requiredQuestions: dt.requiredQuestions,
        isActive: true,
        metadata: {},
      },
    });
    console.log(`    ✓ DocumentType: ${dt.name} (${dt.slug}) → ${dt.projectTypeSlug}`);
  }

  // Link existing questionnaires to project types
  // The Business Startup Incubator and main questionnaire both serve the business-plan type
  if (bpTypeId) {
    console.log('\n  🔗 Linking questionnaires to project types...');
    const linked = await prisma.questionnaire.updateMany({
      where: {
        projectTypeId: null,
        isActive: true,
      },
      data: { projectTypeId: bpTypeId },
    });
    console.log(`    ✓ Linked ${linked.count} orphaned questionnaire(s) to business-plan`);
  }

  console.log('\n✅ Project Types seeded successfully');
}

if (require.main === module) {
  seedProjectTypes()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Error seeding project types:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
