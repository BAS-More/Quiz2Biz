import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Quiz2Biz Dimension Catalog Seed
 *
 * 11 dimensions for readiness scoring as specified in Quiz2Biz documentation.
 * Weights MUST sum to 1.0 for accurate scoring calculations.
 *
 * Formula context:
 * - Dimension Residual: R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
 * - Portfolio Residual: R = Σ(W_d × R_d)
 * - Readiness Score: Score = 100 × (1 - R)
 */
export const dimensions = [
  {
    key: 'arch_sec',
    displayName: 'Architecture & Security',
    description:
      'System architecture, security controls, and secure design patterns. Covers threat modeling, encryption, access control, and security best practices.',
    weight: 0.15, // Highest weight - critical for enterprise readiness
    orderIndex: 1,
  },
  {
    key: 'devops_iac',
    displayName: 'DevOps & Infrastructure as Code',
    description:
      'CI/CD pipelines, infrastructure automation, containerization, and deployment practices. Includes GitOps, container orchestration, and environment management.',
    weight: 0.12,
    orderIndex: 2,
  },
  {
    key: 'quality_test',
    displayName: 'Quality & Testing',
    description:
      'Testing strategy, coverage metrics, quality gates, and continuous testing. Covers unit, integration, E2E, performance, and accessibility testing.',
    weight: 0.1,
    orderIndex: 3,
  },
  {
    key: 'finance',
    displayName: 'Finance & Cost Management',
    description:
      'Budget planning, cost tracking, financial projections, and ROI analysis. Includes cloud cost optimization and resource efficiency.',
    weight: 0.1,
    orderIndex: 4,
  },
  {
    key: 'strategy',
    displayName: 'Strategy & Vision',
    description:
      'Business objectives, product roadmap, market positioning, and strategic alignment. Covers vision clarity and stakeholder alignment.',
    weight: 0.08,
    orderIndex: 5,
  },
  {
    key: 'requirements',
    displayName: 'Requirements & Specifications',
    description:
      'Requirements documentation, acceptance criteria, user stories, and specification completeness. Includes traceability and change management.',
    weight: 0.08,
    orderIndex: 6,
  },
  {
    key: 'data_ai',
    displayName: 'Data & AI',
    description:
      'Data architecture, AI/ML integration, data governance, and analytics capabilities. Covers data quality, pipelines, and model management.',
    weight: 0.08,
    orderIndex: 7,
  },
  {
    key: 'privacy_legal',
    displayName: 'Privacy & Legal',
    description:
      'Data privacy compliance (GDPR, CCPA), legal requirements, terms of service, and intellectual property protection.',
    weight: 0.08,
    orderIndex: 8,
  },
  {
    key: 'service_ops',
    displayName: 'Service Operations',
    description:
      'Operational readiness, monitoring, alerting, incident response, and SLA management. Includes runbooks and on-call procedures.',
    weight: 0.08,
    orderIndex: 9,
  },
  {
    key: 'compliance_policy',
    displayName: 'Compliance & Policy',
    description:
      'Regulatory compliance, industry standards, internal policies, and audit readiness. Covers ISO 27001, SOC 2, HIPAA, and PCI-DSS.',
    weight: 0.07,
    orderIndex: 10,
  },
  {
    key: 'people_change',
    displayName: 'People & Change Management',
    description:
      'Team readiness, training programs, change management, and organizational alignment. Includes skills assessment and knowledge transfer.',
    weight: 0.06,
    orderIndex: 11,
  },
];

/**
 * Validate that dimension weights sum to 1.0
 */
function validateWeights(): void {
  const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0);

  // Allow small floating point tolerance
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    throw new Error(
      `Dimension weights must sum to 1.0, but got ${totalWeight.toFixed(4)}. ` +
        `Please adjust weights to ensure accurate scoring.`,
    );
  }

  console.log(`✓ Dimension weights validated: ${totalWeight.toFixed(4)} ≈ 1.0`);
}

/**
 * Seed dimension catalog with all 11 Quiz2Biz dimensions
 */
export async function seedDimensions(): Promise<void> {
  console.log('\n📊 Seeding Dimension Catalog...');

  // Validate weights before seeding
  validateWeights();

  for (const dimension of dimensions) {
    await prisma.dimensionCatalog.upsert({
      where: { key: dimension.key },
      update: {
        displayName: dimension.displayName,
        description: dimension.description,
        weight: dimension.weight,
        orderIndex: dimension.orderIndex,
        isActive: true,
      },
      create: {
        key: dimension.key,
        displayName: dimension.displayName,
        description: dimension.description,
        weight: dimension.weight,
        orderIndex: dimension.orderIndex,
        isActive: true,
      },
    });

    console.log(`  ✓ ${dimension.key}: ${dimension.displayName} (weight: ${dimension.weight})`);
  }

  console.log(`\n✅ Seeded ${dimensions.length} dimensions successfully`);
}

// Allow running standalone
if (require.main === module) {
  seedDimensions()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Error seeding dimensions:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
