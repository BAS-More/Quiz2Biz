import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Quality Dimensions seed data for Quiz2Biz chat-first architecture
 *
 * These dimensions define the standards-based quality criteria for each project type.
 * Each dimension has benchmark criteria from ISO, industry frameworks, and best practices.
 *
 * Pricing formula: price = basePrice × (1 + qualityLevel × 4)
 * Quality levels: 0.0 (Essential 1x) to 1.0 (Enterprise 5x)
 */

interface BenchmarkCriterion {
  id: string;
  criterion: string;
  standard: string; // e.g., "ISO 22000", "SBA Guidelines", "GAAP"
  required: boolean;
  factFields: string[]; // ExtractedFact fieldNames that satisfy this criterion
}

interface QualityDimensionData {
  name: string;
  description: string;
  weight: number; // 0-1, sum per project type = 1.0
  sortOrder: number;
  benchmarkCriteria: BenchmarkCriterion[];
}

interface ProjectTypeDimensions {
  projectTypeSlug: string;
  dimensions: QualityDimensionData[];
}

// ============================================================================
// BUSINESS PLAN QUALITY DIMENSIONS
// ============================================================================
const businessPlanDimensions: QualityDimensionData[] = [
  {
    name: 'Executive Summary',
    description: 'Core business concept, value proposition, and key metrics',
    weight: 0.15,
    sortOrder: 1,
    benchmarkCriteria: [
      { id: 'bp-es-1', criterion: 'Clear mission statement', standard: 'SBA Guidelines', required: true, factFields: ['mission_statement', 'business_concept'] },
      { id: 'bp-es-2', criterion: 'Defined value proposition', standard: 'Lean Canvas', required: true, factFields: ['value_proposition', 'unique_selling_point'] },
      { id: 'bp-es-3', criterion: 'Key financial highlights', standard: 'GAAP', required: true, factFields: ['revenue_projection', 'funding_goal'] },
      { id: 'bp-es-4', criterion: 'Market opportunity summary', standard: 'SBA Guidelines', required: true, factFields: ['market_size', 'target_market'] },
    ],
  },
  {
    name: 'Market Analysis',
    description: 'Target market, competitive landscape, and positioning',
    weight: 0.18,
    sortOrder: 2,
    benchmarkCriteria: [
      { id: 'bp-ma-1', criterion: 'Total Addressable Market (TAM)', standard: 'Investment Due Diligence', required: true, factFields: ['tam', 'market_size'] },
      { id: 'bp-ma-2', criterion: 'Serviceable Addressable Market (SAM)', standard: 'Investment Due Diligence', required: true, factFields: ['sam', 'target_segment'] },
      { id: 'bp-ma-3', criterion: 'Competitive analysis', standard: 'Porter Five Forces', required: true, factFields: ['competitors', 'competitive_advantage'] },
      { id: 'bp-ma-4', criterion: 'Customer segments defined', standard: 'Lean Canvas', required: true, factFields: ['customer_segments', 'ideal_customer_profile'] },
      { id: 'bp-ma-5', criterion: 'Market trends analysis', standard: 'Industry Standards', required: false, factFields: ['market_trends', 'industry_outlook'] },
    ],
  },
  {
    name: 'Financial Projections',
    description: 'Revenue model, costs, and 3-5 year forecasts',
    weight: 0.20,
    sortOrder: 3,
    benchmarkCriteria: [
      { id: 'bp-fp-1', criterion: 'Revenue model defined', standard: 'GAAP', required: true, factFields: ['revenue_model', 'pricing_strategy'] },
      { id: 'bp-fp-2', criterion: '3-year revenue projection', standard: 'GAAP', required: true, factFields: ['year1_revenue', 'year2_revenue', 'year3_revenue'] },
      { id: 'bp-fp-3', criterion: 'Cost structure breakdown', standard: 'GAAP', required: true, factFields: ['fixed_costs', 'variable_costs', 'operating_costs'] },
      { id: 'bp-fp-4', criterion: 'Break-even analysis', standard: 'Financial Modeling Best Practices', required: true, factFields: ['break_even_point', 'unit_economics'] },
      { id: 'bp-fp-5', criterion: 'Cash flow projections', standard: 'GAAP', required: true, factFields: ['cash_flow_monthly', 'runway_months'] },
      { id: 'bp-fp-6', criterion: 'Funding requirements', standard: 'Investor Standards', required: true, factFields: ['funding_amount', 'use_of_funds'] },
    ],
  },
  {
    name: 'Product/Service',
    description: 'Product features, roadmap, and competitive differentiation',
    weight: 0.15,
    sortOrder: 4,
    benchmarkCriteria: [
      { id: 'bp-ps-1', criterion: 'Product/service description', standard: 'Product Management Standards', required: true, factFields: ['product_description', 'service_offering'] },
      { id: 'bp-ps-2', criterion: 'Key features defined', standard: 'Product Management Standards', required: true, factFields: ['key_features', 'feature_list'] },
      { id: 'bp-ps-3', criterion: 'Development roadmap', standard: 'Agile Best Practices', required: false, factFields: ['product_roadmap', 'milestones'] },
      { id: 'bp-ps-4', criterion: 'Intellectual property strategy', standard: 'IP Best Practices', required: false, factFields: ['ip_strategy', 'patents'] },
    ],
  },
  {
    name: 'Operations & Team',
    description: 'Organizational structure, key personnel, and operations plan',
    weight: 0.12,
    sortOrder: 5,
    benchmarkCriteria: [
      { id: 'bp-ot-1', criterion: 'Management team background', standard: 'Investor Due Diligence', required: true, factFields: ['founders', 'management_team'] },
      { id: 'bp-ot-2', criterion: 'Organizational structure', standard: 'Business Management Standards', required: true, factFields: ['org_structure', 'team_size'] },
      { id: 'bp-ot-3', criterion: 'Key roles identified', standard: 'HR Best Practices', required: true, factFields: ['key_roles', 'hiring_plan'] },
      { id: 'bp-ot-4', criterion: 'Operations plan', standard: 'Operations Management', required: false, factFields: ['operations_plan', 'supply_chain'] },
    ],
  },
  {
    name: 'Go-to-Market Strategy',
    description: 'Marketing, sales, and customer acquisition strategy',
    weight: 0.12,
    sortOrder: 6,
    benchmarkCriteria: [
      { id: 'bp-gtm-1', criterion: 'Marketing strategy', standard: 'Marketing Best Practices', required: true, factFields: ['marketing_strategy', 'marketing_channels'] },
      { id: 'bp-gtm-2', criterion: 'Sales strategy', standard: 'Sales Best Practices', required: true, factFields: ['sales_strategy', 'sales_process'] },
      { id: 'bp-gtm-3', criterion: 'Customer acquisition cost', standard: 'SaaS Metrics', required: true, factFields: ['cac', 'customer_acquisition_cost'] },
      { id: 'bp-gtm-4', criterion: 'Growth projections', standard: 'Growth Metrics', required: false, factFields: ['growth_rate', 'user_projections'] },
    ],
  },
  {
    name: 'Risk & Compliance',
    description: 'Risk assessment, mitigation strategies, and regulatory compliance',
    weight: 0.08,
    sortOrder: 7,
    benchmarkCriteria: [
      { id: 'bp-rc-1', criterion: 'Key risks identified', standard: 'Risk Management Standards', required: true, factFields: ['key_risks', 'risk_factors'] },
      { id: 'bp-rc-2', criterion: 'Mitigation strategies', standard: 'Risk Management Standards', required: true, factFields: ['risk_mitigation', 'contingency_plans'] },
      { id: 'bp-rc-3', criterion: 'Regulatory compliance', standard: 'Industry Regulations', required: false, factFields: ['compliance_requirements', 'regulations'] },
    ],
  },
];

// ============================================================================
// TECHNOLOGY ARCHITECTURE QUALITY DIMENSIONS
// ============================================================================
const techArchitectureDimensions: QualityDimensionData[] = [
  {
    name: 'Architecture Design',
    description: 'System architecture, design patterns, and scalability approach',
    weight: 0.20,
    sortOrder: 1,
    benchmarkCriteria: [
      { id: 'ta-ad-1', criterion: 'Architecture style defined', standard: 'IEEE 1471', required: true, factFields: ['architecture_style', 'design_pattern'] },
      { id: 'ta-ad-2', criterion: 'Component diagram', standard: 'UML 2.5', required: true, factFields: ['components', 'system_components'] },
      { id: 'ta-ad-3', criterion: 'Scalability approach', standard: 'Cloud Native Computing Foundation', required: true, factFields: ['scalability_strategy', 'scaling_approach'] },
      { id: 'ta-ad-4', criterion: 'API contracts defined', standard: 'OpenAPI 3.0', required: true, factFields: ['api_design', 'api_contracts'] },
    ],
  },
  {
    name: 'Security Architecture',
    description: 'Security controls, authentication, and data protection',
    weight: 0.18,
    sortOrder: 2,
    benchmarkCriteria: [
      { id: 'ta-sa-1', criterion: 'Authentication mechanism', standard: 'OWASP ASVS', required: true, factFields: ['auth_mechanism', 'identity_management'] },
      { id: 'ta-sa-2', criterion: 'Authorization model', standard: 'OWASP ASVS', required: true, factFields: ['authorization_model', 'access_control'] },
      { id: 'ta-sa-3', criterion: 'Data encryption approach', standard: 'NIST SP 800-175B', required: true, factFields: ['encryption_strategy', 'data_protection'] },
      { id: 'ta-sa-4', criterion: 'Security monitoring', standard: 'NIST CSF', required: false, factFields: ['security_monitoring', 'threat_detection'] },
    ],
  },
  {
    name: 'Infrastructure & DevOps',
    description: 'Cloud infrastructure, CI/CD, and deployment strategy',
    weight: 0.18,
    sortOrder: 3,
    benchmarkCriteria: [
      { id: 'ta-id-1', criterion: 'Cloud platform selection', standard: 'Cloud Provider Best Practices', required: true, factFields: ['cloud_platform', 'infrastructure_provider'] },
      { id: 'ta-id-2', criterion: 'Infrastructure as Code', standard: 'HashiCorp Best Practices', required: true, factFields: ['iac_tool', 'infrastructure_automation'] },
      { id: 'ta-id-3', criterion: 'CI/CD pipeline design', standard: 'DORA Metrics', required: true, factFields: ['cicd_pipeline', 'deployment_strategy'] },
      { id: 'ta-id-4', criterion: 'Monitoring and observability', standard: 'SRE Principles', required: true, factFields: ['monitoring_stack', 'observability'] },
    ],
  },
  {
    name: 'Data Architecture',
    description: 'Database design, data flow, and storage strategy',
    weight: 0.15,
    sortOrder: 4,
    benchmarkCriteria: [
      { id: 'ta-da-1', criterion: 'Database technology selection', standard: 'Data Management Best Practices', required: true, factFields: ['database_type', 'data_storage'] },
      { id: 'ta-da-2', criterion: 'Data model design', standard: 'Data Modeling Standards', required: true, factFields: ['data_model', 'entity_relationships'] },
      { id: 'ta-da-3', criterion: 'Data backup strategy', standard: 'ISO 27001', required: true, factFields: ['backup_strategy', 'disaster_recovery'] },
      { id: 'ta-da-4', criterion: 'Data retention policy', standard: 'GDPR/Privacy Standards', required: false, factFields: ['retention_policy', 'data_lifecycle'] },
    ],
  },
  {
    name: 'Integration & APIs',
    description: 'Third-party integrations, API design, and communication patterns',
    weight: 0.15,
    sortOrder: 5,
    benchmarkCriteria: [
      { id: 'ta-ia-1', criterion: 'API design standards', standard: 'OpenAPI 3.0', required: true, factFields: ['api_standards', 'api_versioning'] },
      { id: 'ta-ia-2', criterion: 'Integration patterns', standard: 'Enterprise Integration Patterns', required: true, factFields: ['integration_patterns', 'messaging_approach'] },
      { id: 'ta-ia-3', criterion: 'Third-party services', standard: 'Vendor Management Best Practices', required: false, factFields: ['third_party_services', 'external_dependencies'] },
    ],
  },
  {
    name: 'Performance & Reliability',
    description: 'Performance requirements, SLAs, and reliability engineering',
    weight: 0.14,
    sortOrder: 6,
    benchmarkCriteria: [
      { id: 'ta-pr-1', criterion: 'Performance requirements', standard: 'Performance Engineering Standards', required: true, factFields: ['performance_requirements', 'response_time_targets'] },
      { id: 'ta-pr-2', criterion: 'SLA definitions', standard: 'ITIL Service Level Management', required: true, factFields: ['sla_targets', 'availability_target'] },
      { id: 'ta-pr-3', criterion: 'Reliability engineering', standard: 'SRE Principles', required: false, factFields: ['reliability_strategy', 'fault_tolerance'] },
    ],
  },
];

// ============================================================================
// MARKETING STRATEGY QUALITY DIMENSIONS
// ============================================================================
const marketingStrategyDimensions: QualityDimensionData[] = [
  {
    name: 'Target Audience',
    description: 'Customer personas, segmentation, and audience analysis',
    weight: 0.18,
    sortOrder: 1,
    benchmarkCriteria: [
      { id: 'ms-ta-1', criterion: 'Customer personas defined', standard: 'Marketing Research Standards', required: true, factFields: ['customer_personas', 'buyer_personas'] },
      { id: 'ms-ta-2', criterion: 'Market segmentation', standard: 'STP Framework', required: true, factFields: ['market_segments', 'target_segments'] },
      { id: 'ms-ta-3', criterion: 'Customer journey mapping', standard: 'Customer Experience Standards', required: true, factFields: ['customer_journey', 'touchpoints'] },
    ],
  },
  {
    name: 'Brand & Positioning',
    description: 'Brand identity, value proposition, and market positioning',
    weight: 0.16,
    sortOrder: 2,
    benchmarkCriteria: [
      { id: 'ms-bp-1', criterion: 'Brand identity defined', standard: 'Brand Management Standards', required: true, factFields: ['brand_identity', 'brand_values'] },
      { id: 'ms-bp-2', criterion: 'Positioning statement', standard: 'Marketing Strategy Standards', required: true, factFields: ['positioning_statement', 'unique_value_proposition'] },
      { id: 'ms-bp-3', criterion: 'Competitive differentiation', standard: 'Porter Generic Strategies', required: true, factFields: ['differentiation', 'competitive_advantage'] },
    ],
  },
  {
    name: 'Channel Strategy',
    description: 'Marketing channels, distribution, and multi-channel approach',
    weight: 0.18,
    sortOrder: 3,
    benchmarkCriteria: [
      { id: 'ms-cs-1', criterion: 'Channel selection', standard: 'Multi-Channel Marketing Standards', required: true, factFields: ['marketing_channels', 'channel_mix'] },
      { id: 'ms-cs-2', criterion: 'Digital marketing strategy', standard: 'Digital Marketing Standards', required: true, factFields: ['digital_strategy', 'online_channels'] },
      { id: 'ms-cs-3', criterion: 'Social media strategy', standard: 'Social Media Marketing Best Practices', required: true, factFields: ['social_media_strategy', 'social_platforms'] },
    ],
  },
  {
    name: 'Content Strategy',
    description: 'Content planning, creation, and distribution approach',
    weight: 0.15,
    sortOrder: 4,
    benchmarkCriteria: [
      { id: 'ms-con-1', criterion: 'Content pillars defined', standard: 'Content Marketing Institute Standards', required: true, factFields: ['content_pillars', 'content_themes'] },
      { id: 'ms-con-2', criterion: 'Content calendar', standard: 'Content Marketing Best Practices', required: true, factFields: ['content_calendar', 'publishing_schedule'] },
      { id: 'ms-con-3', criterion: 'SEO strategy', standard: 'Search Engine Optimization Standards', required: false, factFields: ['seo_strategy', 'keyword_strategy'] },
    ],
  },
  {
    name: 'Customer Acquisition',
    description: 'Acquisition strategy, funnel optimization, and conversion',
    weight: 0.18,
    sortOrder: 5,
    benchmarkCriteria: [
      { id: 'ms-ca-1', criterion: 'Acquisition funnel defined', standard: 'Growth Marketing Standards', required: true, factFields: ['acquisition_funnel', 'conversion_funnel'] },
      { id: 'ms-ca-2', criterion: 'CAC targets', standard: 'SaaS Metrics Standards', required: true, factFields: ['cac_target', 'acquisition_cost'] },
      { id: 'ms-ca-3', criterion: 'Lead generation strategy', standard: 'B2B Marketing Standards', required: true, factFields: ['lead_generation', 'lead_sources'] },
    ],
  },
  {
    name: 'Budget & ROI',
    description: 'Marketing budget allocation and return on investment tracking',
    weight: 0.15,
    sortOrder: 6,
    benchmarkCriteria: [
      { id: 'ms-br-1', criterion: 'Budget allocation', standard: 'Marketing Budget Best Practices', required: true, factFields: ['marketing_budget', 'budget_allocation'] },
      { id: 'ms-br-2', criterion: 'ROI targets', standard: 'Marketing ROI Standards', required: true, factFields: ['roi_targets', 'marketing_roi'] },
      { id: 'ms-br-3', criterion: 'KPIs defined', standard: 'Marketing Metrics Standards', required: true, factFields: ['marketing_kpis', 'success_metrics'] },
    ],
  },
];

// ============================================================================
// FINANCIAL PROJECTIONS QUALITY DIMENSIONS
// ============================================================================
const financialProjectionsDimensions: QualityDimensionData[] = [
  {
    name: 'Revenue Model',
    description: 'Revenue streams, pricing strategy, and monetization approach',
    weight: 0.22,
    sortOrder: 1,
    benchmarkCriteria: [
      { id: 'fp-rm-1', criterion: 'Revenue streams identified', standard: 'GAAP Revenue Recognition', required: true, factFields: ['revenue_streams', 'monetization_model'] },
      { id: 'fp-rm-2', criterion: 'Pricing strategy defined', standard: 'Pricing Strategy Standards', required: true, factFields: ['pricing_strategy', 'price_points'] },
      { id: 'fp-rm-3', criterion: 'Revenue projections', standard: 'Financial Modeling Standards', required: true, factFields: ['revenue_projections', 'revenue_forecast'] },
    ],
  },
  {
    name: 'Cost Structure',
    description: 'Operating costs, COGS, and expense categories',
    weight: 0.18,
    sortOrder: 2,
    benchmarkCriteria: [
      { id: 'fp-cs-1', criterion: 'Fixed costs breakdown', standard: 'Cost Accounting Standards', required: true, factFields: ['fixed_costs', 'overhead_costs'] },
      { id: 'fp-cs-2', criterion: 'Variable costs identified', standard: 'Cost Accounting Standards', required: true, factFields: ['variable_costs', 'cogs'] },
      { id: 'fp-cs-3', criterion: 'Operating expenses', standard: 'GAAP', required: true, factFields: ['operating_expenses', 'opex'] },
    ],
  },
  {
    name: 'Cash Flow',
    description: 'Cash flow projections, working capital, and runway',
    weight: 0.18,
    sortOrder: 3,
    benchmarkCriteria: [
      { id: 'fp-cf-1', criterion: 'Cash flow statement', standard: 'GAAP Cash Flow Statement', required: true, factFields: ['cash_flow_statement', 'cash_flow_projections'] },
      { id: 'fp-cf-2', criterion: 'Working capital requirements', standard: 'Working Capital Management', required: true, factFields: ['working_capital', 'capital_requirements'] },
      { id: 'fp-cf-3', criterion: 'Runway calculation', standard: 'Startup Financial Standards', required: true, factFields: ['runway_months', 'burn_rate'] },
    ],
  },
  {
    name: 'Funding & Investment',
    description: 'Funding requirements, use of funds, and investor returns',
    weight: 0.16,
    sortOrder: 4,
    benchmarkCriteria: [
      { id: 'fp-fi-1', criterion: 'Funding requirements', standard: 'Investment Standards', required: true, factFields: ['funding_amount', 'capital_required'] },
      { id: 'fp-fi-2', criterion: 'Use of funds', standard: 'Investment Due Diligence', required: true, factFields: ['use_of_funds', 'fund_allocation'] },
      { id: 'fp-fi-3', criterion: 'Valuation methodology', standard: 'Valuation Standards', required: false, factFields: ['valuation', 'valuation_method'] },
    ],
  },
  {
    name: 'Break-Even Analysis',
    description: 'Break-even point, unit economics, and profitability path',
    weight: 0.14,
    sortOrder: 5,
    benchmarkCriteria: [
      { id: 'fp-be-1', criterion: 'Break-even calculation', standard: 'Financial Analysis Standards', required: true, factFields: ['break_even_point', 'break_even_units'] },
      { id: 'fp-be-2', criterion: 'Unit economics', standard: 'SaaS Metrics', required: true, factFields: ['unit_economics', 'ltv_cac_ratio'] },
      { id: 'fp-be-3', criterion: 'Path to profitability', standard: 'Financial Planning Standards', required: true, factFields: ['profitability_timeline', 'profit_margins'] },
    ],
  },
  {
    name: 'Assumptions & Scenarios',
    description: 'Financial assumptions, sensitivity analysis, and scenario planning',
    weight: 0.12,
    sortOrder: 6,
    benchmarkCriteria: [
      { id: 'fp-as-1', criterion: 'Key assumptions documented', standard: 'Financial Modeling Standards', required: true, factFields: ['key_assumptions', 'model_assumptions'] },
      { id: 'fp-as-2', criterion: 'Sensitivity analysis', standard: 'Risk Analysis Standards', required: false, factFields: ['sensitivity_analysis', 'variable_sensitivity'] },
      { id: 'fp-as-3', criterion: 'Scenario planning', standard: 'Strategic Planning Standards', required: false, factFields: ['scenarios', 'best_worst_case'] },
    ],
  },
];

// ============================================================================
// ALL PROJECT TYPE DIMENSIONS
// ============================================================================
const allProjectTypeDimensions: ProjectTypeDimensions[] = [
  { projectTypeSlug: 'business-plan', dimensions: businessPlanDimensions },
  { projectTypeSlug: 'tech-assessment', dimensions: techArchitectureDimensions },
  { projectTypeSlug: 'marketing-strategy', dimensions: marketingStrategyDimensions },
  { projectTypeSlug: 'financial-projections', dimensions: financialProjectionsDimensions },
];

/**
 * Seed quality dimensions for all project types
 */
export async function seedQualityDimensions(): Promise<void> {
  console.log('\n📊 Seeding Quality Dimensions (Quiz2Biz Standards-Based Scoring)...');

  for (const { projectTypeSlug, dimensions } of allProjectTypeDimensions) {
    // Find the project type
    const projectType = await prisma.projectType.findUnique({
      where: { slug: projectTypeSlug },
    });

    if (!projectType) {
      console.log(`  ⚠️ Project type '${projectTypeSlug}' not found, skipping...`);
      continue;
    }

    console.log(`\n  📋 ${projectType.name} (${projectTypeSlug}):`);

    // Validate weights sum to 1.0
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.log(`    ⚠️ Warning: Weights sum to ${totalWeight.toFixed(2)}, expected 1.0`);
    }

    for (const dim of dimensions) {
      await prisma.qualityDimension.upsert({
        where: {
          projectTypeId_name: {
            projectTypeId: projectType.id,
            name: dim.name,
          },
        },
        update: {
          description: dim.description,
          weight: dim.weight,
          sortOrder: dim.sortOrder,
          benchmarkCriteria: dim.benchmarkCriteria as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
        create: {
          projectTypeId: projectType.id,
          name: dim.name,
          description: dim.description,
          weight: dim.weight,
          sortOrder: dim.sortOrder,
          benchmarkCriteria: dim.benchmarkCriteria as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      const criteriaCount = dim.benchmarkCriteria.length;
      console.log(`    ✓ ${dim.name} (weight: ${dim.weight}, ${criteriaCount} criteria)`);
    }
  }

  // Summary
  const totalDimensions = allProjectTypeDimensions.reduce((sum, pt) => sum + pt.dimensions.length, 0);
  const totalCriteria = allProjectTypeDimensions.reduce(
    (sum, pt) => sum + pt.dimensions.reduce((dSum, d) => dSum + d.benchmarkCriteria.length, 0),
    0
  );

  console.log(`\n✅ Seeded ${totalDimensions} quality dimensions with ${totalCriteria} benchmark criteria`);
}

// Allow direct execution for testing
if (require.main === module) {
  seedQualityDimensions()
    .catch((e) => {
      console.error('Quality Dimensions seed failed:', e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
