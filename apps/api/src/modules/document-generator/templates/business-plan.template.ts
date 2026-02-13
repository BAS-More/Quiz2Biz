/**
 * Business Plan Document Template
 * Category: CFO
 *
 * This template defines the structure for generating comprehensive Business Plan documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface BusinessPlanData {
  executiveSummary: {
    companyDescription: string;
    missionStatement: string;
    visionStatement: string;
    businessOpportunity: string;
    targetMarket: string;
    competitiveAdvantage: string;
    fundingRequirements: string;
    financialHighlights: string;
  };
  companyDescription: {
    legalStructure: string;
    ownershipStructure: string;
    companyHistory: string;
    location: string;
    industryOverview: string;
  };
  marketAnalysis: {
    industryDescription: string;
    targetMarketSize: string;
    marketSegmentation: MarketSegment[];
    competitorAnalysis: Competitor[];
    marketTrends: string[];
    swotAnalysis: SWOTAnalysis;
  };
  productsServices: {
    description: string;
    features: string[];
    benefits: string[];
    lifecycle: string;
    intellectualProperty: string;
    researchDevelopment: string;
  };
  marketingStrategy: {
    positioning: string;
    pricingStrategy: string;
    distributionChannels: string[];
    promotionalStrategy: string;
    salesStrategy: string;
    customerAcquisition: string;
  };
  operationsPlan: {
    productionProcess: string;
    facilitiesEquipment: string;
    technologySystems: string;
    qualityControl: string;
    supplyChain: string;
    milestones: Milestone[];
  };
  managementTeam: {
    keyPersonnel: TeamMember[];
    organizationStructure: string;
    advisoryBoard: string;
    humanResourcesPlan: string;
  };
  financialProjections: {
    revenueModel: string;
    projectedIncome: FinancialPeriod[];
    projectedCashFlow: FinancialPeriod[];
    breakEvenAnalysis: string;
    fundingRequirements: FundingRequirement;
    financialAssumptions: string[];
  };
  riskManagement: {
    identifiedRisks: Risk[];
    mitigationStrategies: string[];
    contingencyPlans: string[];
    insuranceRequirements: string;
  };
  appendices: {
    supportingDocuments: string[];
    financialStatements: string;
    marketResearch: string;
    legalDocuments: string;
  };
}

interface MarketSegment {
  name: string;
  description: string;
  size: string;
  growthRate: string;
}

interface Competitor {
  name: string;
  marketShare: string;
  strengths: string[];
  weaknesses: string[];
}

interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface Milestone {
  description: string;
  targetDate: string;
  status: string;
}

interface TeamMember {
  name: string;
  title: string;
  background: string;
  responsibilities: string;
}

interface FinancialPeriod {
  period: string;
  revenue: string;
  expenses: string;
  netIncome: string;
}

interface FundingRequirement {
  totalRequired: string;
  useOfFunds: { category: string; amount: string; percentage: string }[];
  timeline: string;
}

interface Risk {
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

/**
 * Template configuration for Business Plan
 */
export const BUSINESS_PLAN_TEMPLATE = {
  slug: 'business-plan',
  name: 'Business Plan',
  category: DocumentCategory.CFO,
  description:
    'Comprehensive business planning document covering strategy, operations, financials, and growth plans',
  estimatedPages: 25,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'executiveSummary.companyDescription',
    'executiveSummary.missionStatement',
    'companyDescription.legalStructure',
    'marketAnalysis.targetMarketSize',
    'productsServices.description',
    'financialProjections.revenueModel',
  ],

  /**
   * Section order for document generation
   */
  sections: [
    {
      id: 'document_control',
      title: 'Document Control',
      required: true,
    },
    {
      id: 'executive_summary',
      title: 'Executive Summary',
      required: true,
      subsections: [
        {
          id: 'company_overview',
          title: 'Company Overview',
          contentPath: 'executiveSummary.companyDescription',
        },
        {
          id: 'mission_vision',
          title: 'Mission & Vision',
          contentPath: 'executiveSummary.missionStatement',
        },
        {
          id: 'business_opportunity',
          title: 'Business Opportunity',
          contentPath: 'executiveSummary.businessOpportunity',
        },
        {
          id: 'competitive_advantage',
          title: 'Competitive Advantage',
          contentPath: 'executiveSummary.competitiveAdvantage',
        },
        {
          id: 'financial_highlights',
          title: 'Financial Highlights',
          contentPath: 'executiveSummary.financialHighlights',
        },
      ],
    },
    {
      id: 'company_description',
      title: 'Company Description',
      required: true,
      subsections: [
        {
          id: 'legal_structure',
          title: 'Legal Structure',
          contentPath: 'companyDescription.legalStructure',
        },
        {
          id: 'ownership',
          title: 'Ownership Structure',
          contentPath: 'companyDescription.ownershipStructure',
        },
        {
          id: 'history',
          title: 'Company History',
          contentPath: 'companyDescription.companyHistory',
        },
        { id: 'location', title: 'Location', contentPath: 'companyDescription.location' },
        {
          id: 'industry',
          title: 'Industry Overview',
          contentPath: 'companyDescription.industryOverview',
        },
      ],
    },
    {
      id: 'market_analysis',
      title: 'Market Analysis',
      required: true,
      subsections: [
        {
          id: 'industry_desc',
          title: 'Industry Description',
          contentPath: 'marketAnalysis.industryDescription',
        },
        {
          id: 'market_size',
          title: 'Target Market Size',
          contentPath: 'marketAnalysis.targetMarketSize',
        },
        {
          id: 'segmentation',
          title: 'Market Segmentation',
          contentPath: 'marketAnalysis.marketSegmentation',
        },
        {
          id: 'competitors',
          title: 'Competitor Analysis',
          contentPath: 'marketAnalysis.competitorAnalysis',
        },
        { id: 'trends', title: 'Market Trends', contentPath: 'marketAnalysis.marketTrends' },
        { id: 'swot', title: 'SWOT Analysis', contentPath: 'marketAnalysis.swotAnalysis' },
      ],
    },
    {
      id: 'products_services',
      title: 'Products & Services',
      required: true,
      subsections: [
        { id: 'description', title: 'Description', contentPath: 'productsServices.description' },
        { id: 'features', title: 'Features & Benefits', contentPath: 'productsServices.features' },
        { id: 'lifecycle', title: 'Product Lifecycle', contentPath: 'productsServices.lifecycle' },
        {
          id: 'ip',
          title: 'Intellectual Property',
          contentPath: 'productsServices.intellectualProperty',
        },
        {
          id: 'rd',
          title: 'Research & Development',
          contentPath: 'productsServices.researchDevelopment',
        },
      ],
    },
    {
      id: 'marketing_strategy',
      title: 'Marketing Strategy',
      required: true,
      subsections: [
        {
          id: 'positioning',
          title: 'Market Positioning',
          contentPath: 'marketingStrategy.positioning',
        },
        {
          id: 'pricing',
          title: 'Pricing Strategy',
          contentPath: 'marketingStrategy.pricingStrategy',
        },
        {
          id: 'distribution',
          title: 'Distribution Channels',
          contentPath: 'marketingStrategy.distributionChannels',
        },
        {
          id: 'promotion',
          title: 'Promotional Strategy',
          contentPath: 'marketingStrategy.promotionalStrategy',
        },
        { id: 'sales', title: 'Sales Strategy', contentPath: 'marketingStrategy.salesStrategy' },
      ],
    },
    {
      id: 'operations_plan',
      title: 'Operations Plan',
      required: true,
      subsections: [
        {
          id: 'production',
          title: 'Production/Service Delivery',
          contentPath: 'operationsPlan.productionProcess',
        },
        {
          id: 'facilities',
          title: 'Facilities & Equipment',
          contentPath: 'operationsPlan.facilitiesEquipment',
        },
        {
          id: 'technology',
          title: 'Technology & Systems',
          contentPath: 'operationsPlan.technologySystems',
        },
        { id: 'quality', title: 'Quality Control', contentPath: 'operationsPlan.qualityControl' },
        { id: 'supply_chain', title: 'Supply Chain', contentPath: 'operationsPlan.supplyChain' },
        { id: 'milestones', title: 'Key Milestones', contentPath: 'operationsPlan.milestones' },
      ],
    },
    {
      id: 'management_team',
      title: 'Management Team',
      required: true,
      subsections: [
        { id: 'key_personnel', title: 'Key Personnel', contentPath: 'managementTeam.keyPersonnel' },
        {
          id: 'org_structure',
          title: 'Organization Structure',
          contentPath: 'managementTeam.organizationStructure',
        },
        { id: 'advisory', title: 'Advisory Board', contentPath: 'managementTeam.advisoryBoard' },
        {
          id: 'hr_plan',
          title: 'Human Resources Plan',
          contentPath: 'managementTeam.humanResourcesPlan',
        },
      ],
    },
    {
      id: 'financial_projections',
      title: 'Financial Projections',
      required: true,
      subsections: [
        {
          id: 'revenue_model',
          title: 'Revenue Model',
          contentPath: 'financialProjections.revenueModel',
        },
        {
          id: 'income_projections',
          title: 'Projected Income Statement',
          contentPath: 'financialProjections.projectedIncome',
        },
        {
          id: 'cash_flow',
          title: 'Cash Flow Projections',
          contentPath: 'financialProjections.projectedCashFlow',
        },
        {
          id: 'break_even',
          title: 'Break-Even Analysis',
          contentPath: 'financialProjections.breakEvenAnalysis',
        },
        {
          id: 'funding',
          title: 'Funding Requirements',
          contentPath: 'financialProjections.fundingRequirements',
        },
        {
          id: 'assumptions',
          title: 'Financial Assumptions',
          contentPath: 'financialProjections.financialAssumptions',
        },
      ],
    },
    {
      id: 'risk_management',
      title: 'Risk Management',
      required: true,
      subsections: [
        { id: 'risks', title: 'Identified Risks', contentPath: 'riskManagement.identifiedRisks' },
        {
          id: 'mitigation',
          title: 'Mitigation Strategies',
          contentPath: 'riskManagement.mitigationStrategies',
        },
        {
          id: 'contingency',
          title: 'Contingency Plans',
          contentPath: 'riskManagement.contingencyPlans',
        },
        {
          id: 'insurance',
          title: 'Insurance Requirements',
          contentPath: 'riskManagement.insuranceRequirements',
        },
      ],
    },
    {
      id: 'appendices',
      title: 'Appendices',
      required: false,
      subsections: [
        {
          id: 'financials',
          title: 'Financial Statements',
          contentPath: 'appendices.financialStatements',
        },
        {
          id: 'market_research',
          title: 'Market Research',
          contentPath: 'appendices.marketResearch',
        },
        { id: 'legal', title: 'Legal Documents', contentPath: 'appendices.legalDocuments' },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'company-name': 'executiveSummary.companyDescription',
    'company-description': 'executiveSummary.companyDescription',
    'mission-statement': 'executiveSummary.missionStatement',
    'vision-statement': 'executiveSummary.visionStatement',
    'business-opportunity': 'executiveSummary.businessOpportunity',
    'target-market': 'executiveSummary.targetMarket',
    'competitive-advantage': 'executiveSummary.competitiveAdvantage',
    'funding-requirements': 'executiveSummary.fundingRequirements',
    'legal-structure': 'companyDescription.legalStructure',
    'ownership-structure': 'companyDescription.ownershipStructure',
    'company-history': 'companyDescription.companyHistory',
    'business-location': 'companyDescription.location',
    'industry-overview': 'companyDescription.industryOverview',
    'industry-description': 'marketAnalysis.industryDescription',
    'target-market-size': 'marketAnalysis.targetMarketSize',
    'market-segments': 'marketAnalysis.marketSegmentation',
    'competitor-analysis': 'marketAnalysis.competitorAnalysis',
    'market-trends': 'marketAnalysis.marketTrends',
    strengths: 'marketAnalysis.swotAnalysis.strengths',
    weaknesses: 'marketAnalysis.swotAnalysis.weaknesses',
    opportunities: 'marketAnalysis.swotAnalysis.opportunities',
    threats: 'marketAnalysis.swotAnalysis.threats',
    'product-description': 'productsServices.description',
    'product-features': 'productsServices.features',
    'product-benefits': 'productsServices.benefits',
    'product-lifecycle': 'productsServices.lifecycle',
    'intellectual-property': 'productsServices.intellectualProperty',
    'market-positioning': 'marketingStrategy.positioning',
    'pricing-strategy': 'marketingStrategy.pricingStrategy',
    'distribution-channels': 'marketingStrategy.distributionChannels',
    'promotional-strategy': 'marketingStrategy.promotionalStrategy',
    'sales-strategy': 'marketingStrategy.salesStrategy',
    'production-process': 'operationsPlan.productionProcess',
    'facilities-equipment': 'operationsPlan.facilitiesEquipment',
    'technology-systems': 'operationsPlan.technologySystems',
    'quality-control': 'operationsPlan.qualityControl',
    'key-personnel': 'managementTeam.keyPersonnel',
    'org-structure': 'managementTeam.organizationStructure',
    'revenue-model': 'financialProjections.revenueModel',
    'income-projections': 'financialProjections.projectedIncome',
    'cash-flow-projections': 'financialProjections.projectedCashFlow',
    'break-even-analysis': 'financialProjections.breakEvenAnalysis',
    'funding-amount': 'financialProjections.fundingRequirements',
    'financial-assumptions': 'financialProjections.financialAssumptions',
    'identified-risks': 'riskManagement.identifiedRisks',
    'risk-mitigation': 'riskManagement.mitigationStrategies',
    'contingency-plans': 'riskManagement.contingencyPlans',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'managementTeam.advisoryBoard': 'Advisory board to be established',
    'riskManagement.insuranceRequirements': 'Standard business insurance coverage required',
  },
};
