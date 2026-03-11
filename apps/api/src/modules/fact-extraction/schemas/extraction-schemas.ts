/**
 * Extraction Schemas for Quiz2Biz Project Types
 *
 * Defines the structured fields to extract from conversations
 * for each project type (Business Plan, Tech Assessment, etc.)
 */

import { ExtractionSchema } from '../interfaces';

/**
 * Business Plan extraction schema
 */
export const businessPlanSchema: ExtractionSchema = {
  projectTypeSlug: 'business-plan',
  projectTypeName: 'Business Plan',
  fields: [
    // Business Overview
    {
      key: 'company_name',
      description: 'Official company or venture name',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'business_description',
      description: 'One-paragraph description of the business',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'mission_statement',
      description: 'Company mission statement',
      category: 'business_overview',
      required: false,
    },
    {
      key: 'vision_statement',
      description: 'Long-term vision for the company',
      category: 'business_overview',
      required: false,
    },
    {
      key: 'founding_date',
      description: 'When the company was founded or will launch',
      category: 'business_overview',
      required: false,
    },
    {
      key: 'legal_structure',
      description: 'LLC, Corporation, Partnership, etc.',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'location',
      description: 'Headquarters location',
      category: 'business_overview',
      required: true,
    },

    // Market Analysis
    {
      key: 'target_market',
      description: 'Primary target customer segment',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'market_size',
      description: 'Total addressable market size (TAM)',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'market_trends',
      description: 'Key market trends affecting the business',
      category: 'market_analysis',
      required: false,
    },
    {
      key: 'competitors',
      description: 'Main competitors and their positioning',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'competitive_advantage',
      description: 'What makes this business unique',
      category: 'market_analysis',
      required: true,
    },

    // Product/Service
    {
      key: 'product_description',
      description: 'Detailed product or service description',
      category: 'product_service',
      required: true,
    },
    {
      key: 'pricing_model',
      description: 'How the product/service is priced',
      category: 'product_service',
      required: true,
    },
    {
      key: 'value_proposition',
      description: 'Core value delivered to customers',
      category: 'product_service',
      required: true,
    },

    // Financial
    {
      key: 'startup_costs',
      description: 'Initial capital requirements',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'revenue_model',
      description: 'How the business generates revenue',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'funding_needed',
      description: 'Amount of funding being sought',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'projected_revenue_y1',
      description: 'Year 1 revenue projection',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'break_even_timeline',
      description: 'Expected time to profitability',
      category: 'financial_data',
      required: false,
    },

    // Team & Operations
    {
      key: 'founding_team',
      description: 'Founders and their backgrounds',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'key_hires',
      description: 'Critical positions to fill',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'operational_plan',
      description: 'Day-to-day operations overview',
      category: 'team_and_operations',
      required: false,
    },

    // Strategy
    {
      key: 'go_to_market',
      description: 'Go-to-market strategy',
      category: 'strategy',
      required: true,
    },
    {
      key: 'growth_strategy',
      description: 'Plans for scaling the business',
      category: 'strategy',
      required: false,
    },
    {
      key: 'milestones',
      description: 'Key milestones and timeline',
      category: 'strategy',
      required: false,
    },

    // Risk
    {
      key: 'key_risks',
      description: 'Main business risks identified',
      category: 'risk_assessment',
      required: false,
    },
    {
      key: 'mitigation_strategies',
      description: 'How risks will be mitigated',
      category: 'risk_assessment',
      required: false,
    },
  ],
  systemPromptAddition: `Focus on extracting comprehensive business plan data including market opportunity, 
competitive positioning, financial projections, and team capabilities. Pay special attention to quantifiable 
metrics and specific timelines.`,
};

/**
 * Technology Assessment extraction schema
 */
export const techAssessmentSchema: ExtractionSchema = {
  projectTypeSlug: 'tech-assessment',
  projectTypeName: 'Technology Assessment',
  fields: [
    // Technology Overview
    {
      key: 'tech_stack_current',
      description: 'Current technology stack',
      category: 'technology',
      required: true,
    },
    {
      key: 'tech_stack_proposed',
      description: 'Proposed or target technology stack',
      category: 'technology',
      required: false,
    },
    {
      key: 'architecture_type',
      description: 'System architecture (monolith, microservices, etc.)',
      category: 'technology',
      required: true,
    },
    {
      key: 'cloud_provider',
      description: 'Cloud provider and services used',
      category: 'technology',
      required: false,
    },
    {
      key: 'integration_requirements',
      description: 'Third-party integrations needed',
      category: 'technology',
      required: false,
    },

    // Security & Compliance
    {
      key: 'security_requirements',
      description: 'Security standards and requirements',
      category: 'legal_compliance',
      required: true,
    },
    {
      key: 'compliance_standards',
      description: 'Regulatory compliance needs (SOC2, GDPR, HIPAA)',
      category: 'legal_compliance',
      required: false,
    },
    {
      key: 'data_privacy_requirements',
      description: 'Data handling and privacy requirements',
      category: 'legal_compliance',
      required: false,
    },

    // Team & Operations
    {
      key: 'team_size',
      description: 'Engineering team size and composition',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'development_process',
      description: 'Development methodology (Agile, Scrum)',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'deployment_frequency',
      description: 'How often code is deployed',
      category: 'team_and_operations',
      required: false,
    },

    // Performance & Scale
    {
      key: 'expected_users',
      description: 'Expected number of users/load',
      category: 'product_service',
      required: true,
    },
    {
      key: 'performance_requirements',
      description: 'Performance SLAs and requirements',
      category: 'product_service',
      required: false,
    },
    {
      key: 'scalability_needs',
      description: 'Scaling requirements and strategy',
      category: 'product_service',
      required: false,
    },

    // Budget
    {
      key: 'tech_budget',
      description: 'Technology budget (annual)',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'infrastructure_costs',
      description: 'Current infrastructure costs',
      category: 'financial_data',
      required: false,
    },
  ],
  systemPromptAddition: `Extract technical architecture details, security requirements, team capabilities, 
and infrastructure needs. Focus on specific technologies, versions, and quantifiable metrics.`,
};

/**
 * Marketing Strategy extraction schema
 */
export const marketingStrategySchema: ExtractionSchema = {
  projectTypeSlug: 'marketing-strategy',
  projectTypeName: 'Marketing Strategy',
  fields: [
    // Brand & Positioning
    {
      key: 'brand_name',
      description: 'Brand name and identity',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'brand_positioning',
      description: 'Brand positioning statement',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'unique_selling_proposition',
      description: 'Key USP',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'brand_voice',
      description: 'Brand voice and tone',
      category: 'business_overview',
      required: false,
    },

    // Target Audience
    {
      key: 'target_demographics',
      description: 'Target customer demographics',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'buyer_personas',
      description: 'Key buyer personas',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'customer_pain_points',
      description: 'Main customer problems being solved',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'purchase_behavior',
      description: 'How customers make purchasing decisions',
      category: 'market_analysis',
      required: false,
    },

    // Channels & Tactics
    {
      key: 'marketing_channels',
      description: 'Primary marketing channels',
      category: 'strategy',
      required: true,
    },
    {
      key: 'content_strategy',
      description: 'Content marketing approach',
      category: 'strategy',
      required: false,
    },
    {
      key: 'social_media_strategy',
      description: 'Social media platforms and strategy',
      category: 'strategy',
      required: false,
    },
    {
      key: 'paid_advertising',
      description: 'Paid advertising plans',
      category: 'strategy',
      required: false,
    },

    // Budget & Goals
    {
      key: 'marketing_budget',
      description: 'Marketing budget',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'customer_acquisition_cost',
      description: 'Target CAC',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'conversion_goals',
      description: 'Conversion rate targets',
      category: 'strategy',
      required: false,
    },
    {
      key: 'growth_targets',
      description: 'Growth metrics and targets',
      category: 'strategy',
      required: true,
    },
  ],
  systemPromptAddition: `Extract marketing-specific information including target audience details, 
channel strategies, brand positioning, and quantifiable marketing goals and budgets.`,
};

/**
 * Investment Pitch extraction schema
 */
export const investmentPitchSchema: ExtractionSchema = {
  projectTypeSlug: 'investment-pitch',
  projectTypeName: 'Investment Pitch',
  fields: [
    // Company Overview
    {
      key: 'company_name',
      description: 'Company name',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'elevator_pitch',
      description: 'One-line company description',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'problem_statement',
      description: 'Problem being solved',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'solution',
      description: 'Solution overview',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'stage',
      description: 'Company stage (seed, Series A, etc.)',
      category: 'business_overview',
      required: true,
    },

    // Traction & Metrics
    {
      key: 'current_revenue',
      description: 'Current ARR/MRR',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'growth_rate',
      description: 'Month-over-month or year-over-year growth',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'key_metrics',
      description: 'Key business metrics (users, transactions, etc.)',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'unit_economics',
      description: 'Unit economics (LTV, CAC, margins)',
      category: 'financial_data',
      required: true,
    },

    // Market & Competition
    {
      key: 'market_size_tam',
      description: 'Total Addressable Market',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'market_size_sam',
      description: 'Serviceable Addressable Market',
      category: 'market_analysis',
      required: false,
    },
    {
      key: 'competitive_landscape',
      description: 'Key competitors and differentiation',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'market_position',
      description: 'Current market position',
      category: 'market_analysis',
      required: false,
    },

    // Team
    {
      key: 'founders',
      description: 'Founders and backgrounds',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'team_highlights',
      description: 'Key team achievements',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'advisors',
      description: 'Notable advisors or board members',
      category: 'team_and_operations',
      required: false,
    },

    // Funding
    {
      key: 'funding_amount',
      description: 'Amount being raised',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'use_of_funds',
      description: 'How funds will be used',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'previous_funding',
      description: 'Previous funding rounds',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'valuation',
      description: 'Pre-money valuation',
      category: 'financial_data',
      required: false,
    },
  ],
  systemPromptAddition: `Focus on extracting investor-relevant metrics: traction, growth rates, 
unit economics, team credentials, and funding details. Quantify everything possible.`,
};

/**
 * Operations Manual extraction schema
 */
export const operationsManualSchema: ExtractionSchema = {
  projectTypeSlug: 'operations-manual',
  projectTypeName: 'Operations Manual',
  fields: [
    // Organization
    {
      key: 'organization_structure',
      description: 'Organization chart and structure',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'departments',
      description: 'Key departments and functions',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'reporting_structure',
      description: 'Reporting relationships',
      category: 'team_and_operations',
      required: false,
    },

    // Processes
    {
      key: 'core_processes',
      description: 'Core business processes',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'standard_procedures',
      description: 'Standard operating procedures',
      category: 'team_and_operations',
      required: true,
    },
    {
      key: 'quality_standards',
      description: 'Quality control standards',
      category: 'team_and_operations',
      required: false,
    },

    // HR & Training
    {
      key: 'hiring_process',
      description: 'Employee hiring process',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'training_programs',
      description: 'Training and onboarding programs',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'performance_management',
      description: 'Performance review process',
      category: 'team_and_operations',
      required: false,
    },

    // Compliance
    {
      key: 'compliance_requirements',
      description: 'Regulatory compliance needs',
      category: 'legal_compliance',
      required: false,
    },
    {
      key: 'safety_protocols',
      description: 'Safety procedures',
      category: 'legal_compliance',
      required: false,
    },
    {
      key: 'audit_procedures',
      description: 'Internal audit procedures',
      category: 'legal_compliance',
      required: false,
    },
  ],
  systemPromptAddition: `Extract operational details including organizational structure, processes, 
procedures, and compliance requirements. Focus on actionable, documented procedures.`,
};

/**
 * Grant Application extraction schema
 */
export const grantApplicationSchema: ExtractionSchema = {
  projectTypeSlug: 'grant-application',
  projectTypeName: 'Grant Application',
  fields: [
    // Organization Info
    {
      key: 'organization_name',
      description: 'Organization legal name',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'organization_type',
      description: 'Non-profit, B-Corp, etc.',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'organization_mission',
      description: 'Organization mission',
      category: 'business_overview',
      required: true,
    },
    {
      key: 'ein_number',
      description: 'EIN/Tax ID',
      category: 'business_overview',
      required: false,
    },

    // Project Details
    {
      key: 'project_title',
      description: 'Grant project title',
      category: 'product_service',
      required: true,
    },
    {
      key: 'project_description',
      description: 'Detailed project description',
      category: 'product_service',
      required: true,
    },
    {
      key: 'project_goals',
      description: 'Specific project goals',
      category: 'product_service',
      required: true,
    },
    {
      key: 'target_beneficiaries',
      description: 'Who will benefit',
      category: 'product_service',
      required: true,
    },
    {
      key: 'expected_outcomes',
      description: 'Measurable outcomes',
      category: 'product_service',
      required: true,
    },
    {
      key: 'project_timeline',
      description: 'Implementation timeline',
      category: 'product_service',
      required: true,
    },

    // Budget
    {
      key: 'total_budget',
      description: 'Total project budget',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'amount_requested',
      description: 'Grant amount requested',
      category: 'financial_data',
      required: true,
    },
    {
      key: 'matching_funds',
      description: 'Matching funds available',
      category: 'financial_data',
      required: false,
    },
    {
      key: 'budget_breakdown',
      description: 'Budget categories and amounts',
      category: 'financial_data',
      required: true,
    },

    // Track Record
    {
      key: 'past_achievements',
      description: 'Organization achievements',
      category: 'business_overview',
      required: false,
    },
    {
      key: 'similar_projects',
      description: 'Similar past projects',
      category: 'business_overview',
      required: false,
    },
    {
      key: 'key_personnel',
      description: 'Key project personnel',
      category: 'team_and_operations',
      required: true,
    },
  ],
  systemPromptAddition: `Extract grant-specific information: organizational capacity, project details, 
measurable outcomes, and detailed budget information. Focus on impact metrics and sustainability.`,
};

/**
 * Product Roadmap extraction schema
 */
export const productRoadmapSchema: ExtractionSchema = {
  projectTypeSlug: 'product-roadmap',
  projectTypeName: 'Product Roadmap',
  fields: [
    // Product Overview
    {
      key: 'product_name',
      description: 'Product name',
      category: 'product_service',
      required: true,
    },
    {
      key: 'product_vision',
      description: 'Long-term product vision',
      category: 'product_service',
      required: true,
    },
    {
      key: 'current_version',
      description: 'Current product version/state',
      category: 'product_service',
      required: false,
    },
    {
      key: 'product_type',
      description: 'SaaS, mobile app, hardware, etc.',
      category: 'product_service',
      required: true,
    },

    // Users & Market
    {
      key: 'target_users',
      description: 'Target user personas',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'user_problems',
      description: 'Problems being solved',
      category: 'market_analysis',
      required: true,
    },
    {
      key: 'competitive_products',
      description: 'Competing products',
      category: 'market_analysis',
      required: false,
    },

    // Features & Priorities
    {
      key: 'current_features',
      description: 'Existing features',
      category: 'product_service',
      required: false,
    },
    {
      key: 'planned_features_q1',
      description: 'Features planned for next quarter',
      category: 'strategy',
      required: true,
    },
    {
      key: 'planned_features_q2',
      description: 'Features planned for following quarter',
      category: 'strategy',
      required: false,
    },
    {
      key: 'long_term_features',
      description: 'Long-term feature vision',
      category: 'strategy',
      required: false,
    },
    {
      key: 'prioritization_criteria',
      description: 'How features are prioritized',
      category: 'strategy',
      required: false,
    },

    // Resources
    {
      key: 'team_capacity',
      description: 'Development team capacity',
      category: 'team_and_operations',
      required: false,
    },
    {
      key: 'technical_constraints',
      description: 'Technical limitations',
      category: 'technology',
      required: false,
    },
    {
      key: 'dependencies',
      description: 'External dependencies',
      category: 'technology',
      required: false,
    },

    // Metrics
    {
      key: 'success_metrics',
      description: 'How success is measured',
      category: 'strategy',
      required: true,
    },
    {
      key: 'key_milestones',
      description: 'Major milestones',
      category: 'strategy',
      required: true,
    },
  ],
  systemPromptAddition: `Extract product roadmap details: features, priorities, timelines, and 
success metrics. Focus on specific deliverables and measurable outcomes.`,
};

/**
 * All extraction schemas indexed by project type slug
 */
export const extractionSchemas: Record<string, ExtractionSchema> = {
  'business-plan': businessPlanSchema,
  'tech-assessment': techAssessmentSchema,
  'marketing-strategy': marketingStrategySchema,
  'investment-pitch': investmentPitchSchema,
  'operations-manual': operationsManualSchema,
  'grant-application': grantApplicationSchema,
  'product-roadmap': productRoadmapSchema,
};

/**
 * Get schema for a project type
 */
export function getSchemaForProjectType(slug: string): ExtractionSchema | undefined {
  return extractionSchemas[slug];
}

/**
 * Get all available project type slugs
 */
export function getAvailableProjectTypes(): string[] {
  return Object.keys(extractionSchemas);
}
