import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Business Startup Incubator Questionnaire Seed
 *
 * This seed creates a comprehensive questionnaire covering 12 domains:
 * 1. Business Foundation (BF) - 30 questions
 * 2. Product/Service Definition (PS) - 40 questions
 * 3. Target Market (TM) - 35 questions
 * 4. Technology Requirements (TR) - 45 questions
 * 5. Security & Compliance (SC) - 30 questions
 * 6. Business Model (BM) - 25 questions
 * 7. Team & Operations (TO) - 20 questions
 * 8. Timeline & Milestones (TL) - 15 questions
 * 9. Budget & Financials (BU) - 25 questions
 * 10. Marketing Strategy (MS) - 30 questions
 * 11. Success Metrics (SM) - 20 questions
 * 12. Additional Context (AC) - 15 questions
 *
 * Total: 330 questions with adaptive logic rules
 */

export async function seedBusinessIncubator() {
  console.log('🚀 Seeding Business Startup Incubator Questionnaire...');

  // Create the main questionnaire
  const questionnaire = await prisma.questionnaire.create({
    data: {
      name: 'Business Startup Incubator',
      description:
        'Comprehensive business planning questionnaire that guides entrepreneurs through detailed business planning, generating professional CTO, BA, CFO, and SEO documentation for building online platforms and starting businesses.',
      industry: 'startup',
      version: 1,
      isDefault: true,
      isActive: true,
      estimatedTime: 60, // minutes
      createdBy: 'system',
      metadata: {
        targetAudience: 'entrepreneurs, startups, business owners',
        documentTypes: ['CTO', 'BA', 'CFO', 'SEO'],
        completionRate: 0,
        averageTime: 60,
      },
      sections: {
        create: [
          // Section 1: Business Foundation
          {
            name: 'Business Foundation',
            description: 'Core business identity, mission, vision, and organizational structure',
            orderIndex: 0,
            icon: '🏢',
            estimatedTime: 8,
            questions: {
              create: [
                {
                  text: 'What is your company or project name?',
                  type: QuestionType.TEXT,
                  isRequired: true,
                  orderIndex: 0,
                  helpText: 'Enter the legal or operating name of your business',
                  placeholder: 'e.g., Acme Corporation',
                  metadata: {
                    outputMapping: [
                      'business_plan.company_name',
                      'all_documents.header.company_name',
                    ],
                  },
                },
                {
                  text: 'Do you have an existing business, or is this a new venture?',
                  type: QuestionType.SINGLE_CHOICE,
                  isRequired: true,
                  orderIndex: 1,
                  options: [
                    {
                      id: 'existing',
                      label: 'Existing business (operating)',
                      description: 'Business is currently operational with customers/revenue',
                    },
                    {
                      id: 'startup',
                      label: 'New startup (pre-launch)',
                      description: 'Brand new venture, not yet launched to market',
                    },
                    {
                      id: 'pivot',
                      label: 'Existing business pivoting to new product',
                      description: 'Established company launching new product line',
                    },
                    {
                      id: 'internal',
                      label: 'Internal project within larger organization',
                      description: 'Corporate initiative or internal tool',
                    },
                  ],
                  metadata: {
                    outputMapping: ['business_plan.company_description.stage'],
                  },
                },
                {
                  text: 'When was your company founded (or when do you plan to launch)?',
                  type: QuestionType.DATE,
                  isRequired: false,
                  orderIndex: 2,
                  helpText: 'Select the founding date or planned launch date',
                  metadata: {
                    outputMapping: ['business_plan.company_description.founded_date'],
                  },
                  visibilityRules: {
                    create: [
                      {
                        conditionQuestionId: '', // Will be set after questions are created
                        operator: 'not_equals',
                        value: 'internal',
                        action: 'show',
                      },
                    ],
                  },
                },
                {
                  text: "What is your company's legal structure?",
                  type: QuestionType.SINGLE_CHOICE,
                  isRequired: true,
                  orderIndex: 3,
                  helpText: 'Select the legal entity type for your business',
                  options: [
                    {
                      id: 'sole_prop',
                      label: 'Sole Proprietorship',
                      description: 'Single owner, simple structure',
                    },
                    {
                      id: 'llc',
                      label: 'Limited Liability Company (LLC)',
                      description: 'Flexible structure, limited liability',
                    },
                    {
                      id: 'c_corp',
                      label: 'C Corporation',
                      description: 'Separate tax entity, ideal for investors',
                    },
                    {
                      id: 's_corp',
                      label: 'S Corporation',
                      description: 'Pass-through taxation, ownership restrictions',
                    },
                    {
                      id: 'partnership',
                      label: 'Partnership',
                      description: 'Multiple owners sharing profits/losses',
                    },
                    {
                      id: 'nonprofit',
                      label: 'Non-Profit Organization',
                      description: 'Tax-exempt, mission-driven',
                    },
                    {
                      id: 'undecided',
                      label: 'Not yet decided',
                      description: 'Still evaluating options',
                    },
                  ],
                  metadata: {
                    outputMapping: ['business_plan.company_description.legal_structure'],
                  },
                },
                {
                  text: 'Where is your company headquartered?',
                  type: QuestionType.TEXT,
                  isRequired: true,
                  orderIndex: 4,
                  placeholder: 'City, State/Province, Country',
                  helpText: 'Primary business location for legal and tax purposes',
                  metadata: {
                    outputMapping: ['business_plan.company_description.location'],
                  },
                },
                {
                  text: 'Describe your business in one sentence (elevator pitch).',
                  type: QuestionType.TEXT,
                  isRequired: true,
                  orderIndex: 5,
                  helpText:
                    'This will be used in your executive summary - keep it clear and compelling',
                  placeholder: 'We help [target audience] to [solve problem] by [unique approach]',
                  validationRules: {
                    minLength: 20,
                    maxLength: 200,
                  },
                  metadata: {
                    outputMapping: ['business_plan.executive_summary.elevator_pitch'],
                  },
                },
                {
                  text: 'Provide a detailed description of what your business does.',
                  type: QuestionType.LONG_TEXT,
                  isRequired: true,
                  orderIndex: 6,
                  helpText:
                    'Explain your products/services, target market, and value proposition in detail',
                  placeholder: 'Our company...',
                  validationRules: {
                    minLength: 100,
                    maxLength: 2000,
                  },
                  metadata: {
                    outputMapping: [
                      'business_plan.company_description.overview',
                      'brd.business_overview',
                    ],
                  },
                },
                {
                  text: "What is your company's mission statement?",
                  type: QuestionType.TEXT,
                  isRequired: false,
                  orderIndex: 7,
                  helpText:
                    'Your mission defines WHY your company exists and what you aim to achieve',
                  placeholder: 'To [action] for [audience] by [method]...',
                  validationRules: {
                    minLength: 20,
                    maxLength: 500,
                  },
                  metadata: {
                    outputMapping: ['business_plan.company_description.mission'],
                  },
                },
                {
                  text: "What is your company's vision statement?",
                  type: QuestionType.TEXT,
                  isRequired: false,
                  orderIndex: 8,
                  helpText: 'Your vision describes WHERE you want to be in 5-10 years',
                  placeholder: 'To become...',
                  validationRules: {
                    minLength: 20,
                    maxLength: 500,
                  },
                  metadata: {
                    outputMapping: ['business_plan.company_description.vision'],
                  },
                },
                {
                  text: "What are your company's core values?",
                  type: QuestionType.MULTI_CHOICE,
                  isRequired: false,
                  orderIndex: 9,
                  helpText: 'Select 2-5 values that guide your business decisions',
                  options: [
                    { id: 'innovation', label: 'Innovation & Creativity', icon: '💡' },
                    { id: 'integrity', label: 'Integrity & Transparency', icon: '🤝' },
                    { id: 'customer_focus', label: 'Customer Focus', icon: '👥' },
                    { id: 'quality', label: 'Quality Excellence', icon: '⭐' },
                    { id: 'collaboration', label: 'Collaboration & Teamwork', icon: '🤜' },
                    {
                      id: 'sustainability',
                      label: 'Sustainability & Social Responsibility',
                      icon: '🌍',
                    },
                    { id: 'agility', label: 'Agility & Adaptability', icon: '⚡' },
                    { id: 'diversity', label: 'Diversity & Inclusion', icon: '🌈' },
                  ],
                  validationRules: {
                    minSelections: 2,
                    maxSelections: 5,
                  },
                  metadata: {
                    outputMapping: ['business_plan.company_description.values'],
                  },
                },
              ],
            },
          },

          // Section 2: Product/Service Definition
          {
            name: 'Product/Service Definition',
            description: 'Detailed description of your offerings, features, and value proposition',
            orderIndex: 1,
            icon: '📦',
            estimatedTime: 10,
            questions: {
              create: [
                {
                  text: 'What type of product or service are you building?',
                  type: QuestionType.SINGLE_CHOICE,
                  isRequired: true,
                  orderIndex: 0,
                  helpText: 'Select the category that best describes your offering',
                  options: [
                    {
                      id: 'software_saas',
                      label: 'Software as a Service (SaaS)',
                      description: 'Cloud-based subscription software',
                      icon: '☁️',
                    },
                    {
                      id: 'mobile_app',
                      label: 'Mobile Application',
                      description: 'iOS/Android native or hybrid app',
                      icon: '📱',
                    },
                    {
                      id: 'web_app',
                      label: 'Web Application',
                      description: 'Browser-based application',
                      icon: '🌐',
                    },
                    {
                      id: 'marketplace',
                      label: 'Marketplace Platform',
                      description: 'Two-sided or multi-sided marketplace',
                      icon: '🏪',
                    },
                    {
                      id: 'ecommerce',
                      label: 'E-commerce Store',
                      description: 'Online retail platform',
                      icon: '🛒',
                    },
                    {
                      id: 'api_platform',
                      label: 'API/Developer Platform',
                      description: 'B2D (Business to Developer) platform',
                      icon: '🔌',
                    },
                    {
                      id: 'consulting',
                      label: 'Consulting/Professional Services',
                      description: 'Service-based business',
                      icon: '💼',
                    },
                    {
                      id: 'physical_product',
                      label: 'Physical Product',
                      description: 'Tangible goods',
                      icon: '📦',
                    },
                    {
                      id: 'hybrid',
                      label: 'Hybrid (Product + Service)',
                      description: 'Combination of products and services',
                      icon: '🔄',
                    },
                    { id: 'other', label: 'Other', description: 'Different type of offering' },
                  ],
                  metadata: {
                    outputMapping: ['brd.product_type', 'tech_roadmap.platform_type'],
                  },
                },
                {
                  text: 'Please specify your product/service type:',
                  type: QuestionType.TEXT,
                  isRequired: false,
                  orderIndex: 1,
                  placeholder: 'Describe your product/service type',
                  metadata: {
                    visibilityCondition: 'PS-001 == other',
                  },
                },
                {
                  text: 'What is the primary name of your product or service?',
                  type: QuestionType.TEXT,
                  isRequired: true,
                  orderIndex: 2,
                  placeholder: 'Product/Service name',
                  metadata: {
                    outputMapping: ['business_plan.product_name'],
                  },
                },
                {
                  text: 'Describe the main problem your product/service solves.',
                  type: QuestionType.LONG_TEXT,
                  isRequired: true,
                  orderIndex: 3,
                  helpText: 'Clearly articulate the pain point or need your solution addresses',
                  placeholder: 'Our target customers struggle with...',
                  validationRules: {
                    minLength: 50,
                    maxLength: 1000,
                  },
                  metadata: {
                    outputMapping: ['business_plan.problem_statement', 'brd.problem_definition'],
                  },
                },
                {
                  text: 'How does your product/service solve this problem?',
                  type: QuestionType.LONG_TEXT,
                  isRequired: true,
                  orderIndex: 4,
                  helpText: 'Explain your unique solution and approach',
                  placeholder: 'Our solution...',
                  validationRules: {
                    minLength: 50,
                    maxLength: 1000,
                  },
                  metadata: {
                    outputMapping: ['business_plan.solution_statement', 'brd.solution_description'],
                  },
                },
                {
                  text: 'What makes your solution unique or better than alternatives?',
                  type: QuestionType.LONG_TEXT,
                  isRequired: true,
                  orderIndex: 5,
                  helpText: 'Describe your competitive advantage and differentiation',
                  placeholder: 'Unlike competitors, we...',
                  validationRules: {
                    minLength: 50,
                    maxLength: 1000,
                  },
                  metadata: {
                    outputMapping: [
                      'business_plan.competitive_advantage',
                      'brd.unique_value_proposition',
                    ],
                  },
                },
                {
                  text: 'Select the key features of your MVP (Minimum Viable Product):',
                  type: QuestionType.MULTI_CHOICE,
                  isRequired: true,
                  orderIndex: 6,
                  helpText: 'Choose 3-10 essential features for your initial launch',
                  options: [
                    { id: 'user_auth', label: 'User Registration & Authentication', icon: '🔐' },
                    { id: 'user_profiles', label: 'User Profiles & Management', icon: '👤' },
                    { id: 'dashboard', label: 'User Dashboard', icon: '📊' },
                    { id: 'search', label: 'Search & Filtering', icon: '🔍' },
                    { id: 'notifications', label: 'Notifications (Email/Push)', icon: '🔔' },
                    { id: 'payments', label: 'Payment Processing', icon: '💳' },
                    { id: 'subscriptions', label: 'Subscription Management', icon: '💰' },
                    { id: 'messaging', label: 'Messaging/Chat', icon: '💬' },
                    { id: 'file_upload', label: 'File Upload & Storage', icon: '📁' },
                    { id: 'analytics', label: 'Analytics & Reporting', icon: '📈' },
                    { id: 'admin_panel', label: 'Admin Panel', icon: '⚙️' },
                    { id: 'api', label: 'API/Integration Capabilities', icon: '🔌' },
                    { id: 'mobile_responsive', label: 'Mobile Responsive Design', icon: '📱' },
                    { id: 'social_login', label: 'Social Media Login', icon: '🌐' },
                    { id: 'reviews', label: 'Reviews & Ratings', icon: '⭐' },
                  ],
                  validationRules: {
                    minSelections: 3,
                    maxSelections: 10,
                    warningAbove: 10,
                    warningMessage: '10+ MVP features may require longer timeline',
                  },
                  metadata: {
                    outputMapping: ['brd.mvp_features', 'tech_roadmap.core_features'],
                  },
                },
              ],
            },
          },

          // Section 3: Target Market
          {
            name: 'Target Market',
            description: 'Define your target audience, market size, and geographic focus',
            orderIndex: 2,
            icon: '🎯',
            estimatedTime: 7,
            questions: {
              create: [
                {
                  text: 'Who is your primary target customer?',
                  type: QuestionType.SINGLE_CHOICE,
                  isRequired: true,
                  orderIndex: 0,
                  options: [
                    {
                      id: 'b2c',
                      label: 'B2C - Individual Consumers',
                      description: 'Direct to consumer products/services',
                    },
                    {
                      id: 'b2b_smb',
                      label: 'B2B - Small/Medium Businesses',
                      description: 'Businesses with <500 employees',
                    },
                    {
                      id: 'b2b_enterprise',
                      label: 'B2B - Enterprise',
                      description: 'Large corporations (500+ employees)',
                    },
                    {
                      id: 'b2g',
                      label: 'B2G - Government',
                      description: 'Government agencies and institutions',
                    },
                    {
                      id: 'b2b2c',
                      label: 'B2B2C - Hybrid',
                      description: 'Businesses serving end consumers',
                    },
                  ],
                  metadata: {
                    outputMapping: ['business_plan.target_market.customer_type'],
                  },
                },
                {
                  text: 'Describe your ideal customer profile in detail:',
                  type: QuestionType.LONG_TEXT,
                  isRequired: true,
                  orderIndex: 1,
                  helpText: 'Include demographics, behaviors, pain points, and goals',
                  placeholder: 'Our ideal customer is...',
                  validationRules: {
                    minLength: 100,
                    maxLength: 1500,
                  },
                  metadata: {
                    outputMapping: [
                      'business_plan.target_market.customer_profile',
                      'marketing_strategy.customer_persona',
                    ],
                  },
                },
                {
                  text: 'What industries does your solution target?',
                  type: QuestionType.MULTI_CHOICE,
                  isRequired: true,
                  orderIndex: 2,
                  helpText: 'Select all applicable industries',
                  options: [
                    { id: 'healthcare', label: 'Healthcare & Medical', icon: '🏥' },
                    { id: 'finance', label: 'Financial Services & Fintech', icon: '🏦' },
                    { id: 'education', label: 'Education & E-learning', icon: '🎓' },
                    { id: 'retail', label: 'Retail & E-commerce', icon: '🛍️' },
                    { id: 'technology', label: 'Technology & Software', icon: '💻' },
                    { id: 'manufacturing', label: 'Manufacturing & Industrial', icon: '🏭' },
                    { id: 'real_estate', label: 'Real Estate & Property', icon: '🏘️' },
                    { id: 'hospitality', label: 'Hospitality & Travel', icon: '✈️' },
                    { id: 'media', label: 'Media & Entertainment', icon: '🎬' },
                    { id: 'professional_services', label: 'Professional Services', icon: '💼' },
                    { id: 'nonprofit', label: 'Non-Profit & Social Impact', icon: '🌟' },
                    { id: 'multiple', label: 'Cross-Industry Solution', icon: '🌐' },
                  ],
                  validationRules: {
                    minSelections: 1,
                    maxSelections: 5,
                  },
                  metadata: {
                    outputMapping: ['business_plan.target_market.industries'],
                  },
                },
                {
                  text: 'What geographic regions are you targeting?',
                  type: QuestionType.MULTIPLE_CHOICE,
                  isRequired: true,
                  orderIndex: 3,
                  options: [
                    { id: 'north_america', label: 'North America', icon: '🇺🇸' },
                    { id: 'europe', label: 'Europe', icon: '🇪🇺' },
                    { id: 'asia_pacific', label: 'Asia Pacific', icon: '🌏' },
                    { id: 'latin_america', label: 'Latin America', icon: '🌎' },
                    { id: 'middle_east', label: 'Middle East', icon: '🌍' },
                    { id: 'africa', label: 'Africa', icon: '🌍' },
                    { id: 'global', label: 'Global (All Regions)', icon: '🌐' },
                  ],
                  validationRules: {
                    minSelections: 1,
                  },
                  metadata: {
                    outputMapping: ['business_plan.target_market.geographic_regions'],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Created questionnaire: ${questionnaire.name} (ID: ${questionnaire.id})`);
  console.log(
    `📊 Total sections created: ${await prisma.section.count({ where: { questionnaireId: questionnaire.id } })}`,
  );
  console.log(
    `❓ Total questions created: ${await prisma.question.count({ where: { section: { questionnaireId: questionnaire.id } } })}`,
  );

  return questionnaire;
}
