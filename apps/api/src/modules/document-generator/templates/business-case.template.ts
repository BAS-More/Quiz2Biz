/**
 * Business Case Document Template
 * Category: BA
 *
 * This template defines the structure for generating Business Case
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface BusinessCaseData {
  executiveSummary: string;
  strategicAlignment: {
    vision: string;
    objectives: string[];
    strategicFit: string;
  };
  problemOpportunity: {
    currentState: string;
    desiredState: string;
    gapAnalysis: GapAnalysisItem[];
  };
  optionsAnalysis: {
    option1: CaseOption;
    option2: CaseOption;
    option3: CaseOption;
    comparisonMatrix: ComparisonCriteria[];
  };
  financialAnalysis: {
    costBreakdown: CostItem[];
    revenueProjections: RevenueProjection[];
    roi: string;
    npv: string;
    paybackPeriod: string;
  };
  riskAnalysis: {
    risks: CaseRisk[];
  };
  implementationPlan: {
    phases: ImplementationPhase[];
    resources: Resource[];
    timeline: string;
  };
  recommendations: string;
  appendices: {
    supportingDocuments: string[];
    financialModels: string;
    marketResearch: string;
  };
}

interface GapAnalysisItem {
  area: string;
  currentState: string;
  desiredState: string;
  gap: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CaseOption {
  name: string;
  description: string;
  benefits: string[];
  costs: string;
  risks: string[];
  timeline: string;
  recommendation: 'RECOMMENDED' | 'ALTERNATIVE' | 'NOT_RECOMMENDED';
}

interface ComparisonCriteria {
  criterion: string;
  weight: number;
  option1Score: number;
  option2Score: number;
  option3Score: number;
}

interface CostItem {
  category: string;
  description: string;
  oneTimeCost: string;
  recurringCost: string;
  year1: string;
  year2: string;
  year3: string;
}

interface RevenueProjection {
  stream: string;
  description: string;
  year1: string;
  year2: string;
  year3: string;
  assumptions: string[];
}

interface CaseRisk {
  id: string;
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  financialExposure: string;
  mitigation: string;
  owner: string;
}

interface ImplementationPhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  deliverables: string[];
  dependencies: string[];
  budget: string;
}

interface Resource {
  role: string;
  count: number;
  duration: string;
  cost: string;
  source: 'INTERNAL' | 'EXTERNAL' | 'HYBRID';
}

/**
 * Template configuration for Business Case
 */
export const BUSINESS_CASE_TEMPLATE = {
  slug: 'business-case',
  name: 'Business Case',
  category: DocumentCategory.BA,
  description:
    'Comprehensive business case document covering strategic alignment, options analysis, financial projections, risk assessment, and implementation planning',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'problemOpportunity.currentState',
    'problemOpportunity.desiredState',
    'optionsAnalysis.option1',
    'financialAnalysis.costBreakdown',
    'financialAnalysis.roi',
    'recommendations',
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
      id: 'exec_summary',
      title: 'Executive Summary',
      required: true,
      contentPath: 'executiveSummary',
    },
    {
      id: 'strategic_alignment',
      title: 'Strategic Alignment',
      required: true,
      subsections: [
        {
          id: 'vision',
          title: 'Vision',
          contentPath: 'strategicAlignment.vision',
        },
        {
          id: 'objectives',
          title: 'Strategic Objectives',
          contentPath: 'strategicAlignment.objectives',
        },
        {
          id: 'strategic_fit',
          title: 'Strategic Fit',
          contentPath: 'strategicAlignment.strategicFit',
        },
      ],
    },
    {
      id: 'problem_opportunity',
      title: 'Problem/Opportunity',
      required: true,
      subsections: [
        {
          id: 'current_state',
          title: 'Current State',
          contentPath: 'problemOpportunity.currentState',
        },
        {
          id: 'desired_state',
          title: 'Desired State',
          contentPath: 'problemOpportunity.desiredState',
        },
        {
          id: 'gap_analysis',
          title: 'Gap Analysis',
          contentPath: 'problemOpportunity.gapAnalysis',
        },
      ],
    },
    {
      id: 'options_analysis',
      title: 'Options Analysis',
      required: true,
      subsections: [
        {
          id: 'option_1',
          title: 'Option 1',
          contentPath: 'optionsAnalysis.option1',
        },
        {
          id: 'option_2',
          title: 'Option 2',
          contentPath: 'optionsAnalysis.option2',
        },
        {
          id: 'option_3',
          title: 'Option 3',
          contentPath: 'optionsAnalysis.option3',
        },
        {
          id: 'comparison_matrix',
          title: 'Comparison Matrix',
          contentPath: 'optionsAnalysis.comparisonMatrix',
        },
      ],
    },
    {
      id: 'financial_analysis',
      title: 'Financial Analysis',
      required: true,
      subsections: [
        {
          id: 'cost_breakdown',
          title: 'Cost Breakdown',
          contentPath: 'financialAnalysis.costBreakdown',
        },
        {
          id: 'revenue_projections',
          title: 'Revenue Projections',
          contentPath: 'financialAnalysis.revenueProjections',
        },
        {
          id: 'roi',
          title: 'Return on Investment (ROI)',
          contentPath: 'financialAnalysis.roi',
        },
        {
          id: 'npv',
          title: 'Net Present Value (NPV)',
          contentPath: 'financialAnalysis.npv',
        },
        {
          id: 'payback_period',
          title: 'Payback Period',
          contentPath: 'financialAnalysis.paybackPeriod',
        },
      ],
    },
    {
      id: 'risk_analysis',
      title: 'Risk Analysis',
      required: true,
      subsections: [
        {
          id: 'risks',
          title: 'Risk Register',
          contentPath: 'riskAnalysis.risks',
        },
      ],
    },
    {
      id: 'implementation_plan',
      title: 'Implementation Plan',
      required: true,
      subsections: [
        {
          id: 'phases',
          title: 'Implementation Phases',
          contentPath: 'implementationPlan.phases',
        },
        {
          id: 'resources',
          title: 'Resource Requirements',
          contentPath: 'implementationPlan.resources',
        },
        {
          id: 'timeline',
          title: 'Timeline',
          contentPath: 'implementationPlan.timeline',
        },
      ],
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      required: true,
      contentPath: 'recommendations',
    },
    {
      id: 'appendices',
      title: 'Appendices',
      required: false,
      subsections: [
        {
          id: 'supporting_documents',
          title: 'Supporting Documents',
          contentPath: 'appendices.supportingDocuments',
        },
        {
          id: 'financial_models',
          title: 'Financial Models',
          contentPath: 'appendices.financialModels',
        },
        {
          id: 'market_research',
          title: 'Market Research',
          contentPath: 'appendices.marketResearch',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'strategic-vision': 'strategicAlignment.vision',
    'strategic-objectives': 'strategicAlignment.objectives',
    'strategic-fit': 'strategicAlignment.strategicFit',
    'current-state-assessment': 'problemOpportunity.currentState',
    'desired-state': 'problemOpportunity.desiredState',
    'gap-analysis': 'problemOpportunity.gapAnalysis',
    'option-1-description': 'optionsAnalysis.option1',
    'option-2-description': 'optionsAnalysis.option2',
    'option-3-description': 'optionsAnalysis.option3',
    'option-comparison': 'optionsAnalysis.comparisonMatrix',
    'cost-breakdown': 'financialAnalysis.costBreakdown',
    'revenue-projections': 'financialAnalysis.revenueProjections',
    'expected-roi': 'financialAnalysis.roi',
    'net-present-value': 'financialAnalysis.npv',
    'payback-period': 'financialAnalysis.paybackPeriod',
    'risk-register': 'riskAnalysis.risks',
    'implementation-phases': 'implementationPlan.phases',
    'resource-requirements': 'implementationPlan.resources',
    'implementation-timeline': 'implementationPlan.timeline',
    'final-recommendations': 'recommendations',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'financialAnalysis.npv': 'NPV calculation to be completed with detailed financial modeling',
    'financialAnalysis.paybackPeriod': 'Payback period to be determined based on final cost estimates',
    'appendices.financialModels': 'Detailed financial models available in supporting spreadsheets',
    'appendices.marketResearch': 'Market research data to be compiled from industry sources',
  },
};
