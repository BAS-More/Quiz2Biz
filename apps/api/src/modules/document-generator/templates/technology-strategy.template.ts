/**
 * Technology Strategy Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Technology Strategy documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface TechnologyStrategyData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  strategicVision: {
    businessAlignment: string;
    innovationGoals: string[];
    digitalTransformation: string;
  };
  technologyPortfolio: {
    currentSystems: TechnologySystem[];
    emergingTech: EmergingTechnology[];
    buildVsBuy: string;
  };
  investmentStrategy: {
    budgetAllocation: BudgetItem[];
    roiAnalysis: string;
    costOptimization: string[];
  };
  governance: {
    decisionFramework: string;
    standardsCompliance: string[];
    vendorManagement: string;
  };
  riskAssessment: {
    strategicRisks: Risk[];
    mitigationStrategies: string[];
  };
  implementationRoadmap: {
    phases: StrategyPhase[];
    milestones: Milestone[];
    dependencies: string[];
  };
}

interface TechnologySystem {
  name: string;
  category: string;
  status: 'ACTIVE' | 'LEGACY' | 'SUNSET' | 'PLANNED';
  businessCriticality: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EmergingTechnology {
  name: string;
  relevance: string;
  adoptionTimeline: string;
  investmentRequired: string;
}

interface BudgetItem {
  category: string;
  allocation: string;
  justification: string;
}

interface Risk {
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface StrategyPhase {
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
}

interface Milestone {
  name: string;
  targetDate: string;
  criteria: string[];
}

/**
 * Template configuration for Technology Strategy
 */
export const TECHNOLOGY_STRATEGY_TEMPLATE = {
  slug: 'technology-strategy',
  name: 'Technology Strategy',
  category: DocumentCategory.CTO,
  description:
    'Strategic technology planning document covering vision, portfolio assessment, investment strategy, and governance framework',
  estimatedPages: 12,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'strategicVision.businessAlignment',
    'technologyPortfolio.currentSystems',
    'investmentStrategy.budgetAllocation',
    'governance.decisionFramework',
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
      contentPath: 'executive_summary',
    },
    {
      id: 'strategic_vision',
      title: 'Strategic Vision',
      required: true,
      subsections: [
        {
          id: 'business_alignment',
          title: 'Business Alignment',
          contentPath: 'strategicVision.businessAlignment',
        },
        {
          id: 'innovation_goals',
          title: 'Innovation Goals',
          contentPath: 'strategicVision.innovationGoals',
        },
        {
          id: 'digital_transformation',
          title: 'Digital Transformation',
          contentPath: 'strategicVision.digitalTransformation',
        },
      ],
    },
    {
      id: 'technology_portfolio',
      title: 'Technology Portfolio',
      required: true,
      subsections: [
        {
          id: 'current_systems',
          title: 'Current Systems Assessment',
          contentPath: 'technologyPortfolio.currentSystems',
        },
        {
          id: 'emerging_tech',
          title: 'Emerging Technologies',
          contentPath: 'technologyPortfolio.emergingTech',
        },
        {
          id: 'build_vs_buy',
          title: 'Build vs Buy Analysis',
          contentPath: 'technologyPortfolio.buildVsBuy',
        },
      ],
    },
    {
      id: 'investment_strategy',
      title: 'Investment Strategy',
      required: true,
      subsections: [
        {
          id: 'budget_allocation',
          title: 'Budget Allocation',
          contentPath: 'investmentStrategy.budgetAllocation',
        },
        {
          id: 'roi_analysis',
          title: 'ROI Analysis',
          contentPath: 'investmentStrategy.roiAnalysis',
        },
        {
          id: 'cost_optimization',
          title: 'Cost Optimization',
          contentPath: 'investmentStrategy.costOptimization',
        },
      ],
    },
    {
      id: 'governance',
      title: 'Governance',
      required: true,
      subsections: [
        {
          id: 'decision_framework',
          title: 'Decision Framework',
          contentPath: 'governance.decisionFramework',
        },
        {
          id: 'standards_compliance',
          title: 'Standards & Compliance',
          contentPath: 'governance.standardsCompliance',
        },
        {
          id: 'vendor_management',
          title: 'Vendor Management',
          contentPath: 'governance.vendorManagement',
        },
      ],
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      required: true,
      subsections: [
        {
          id: 'strategic_risks',
          title: 'Strategic Risks',
          contentPath: 'riskAssessment.strategicRisks',
        },
        {
          id: 'mitigation',
          title: 'Mitigation Strategies',
          contentPath: 'riskAssessment.mitigationStrategies',
        },
      ],
    },
    {
      id: 'implementation_roadmap',
      title: 'Implementation Roadmap',
      required: true,
      subsections: [
        {
          id: 'phases',
          title: 'Implementation Phases',
          contentPath: 'implementationRoadmap.phases',
        },
        {
          id: 'milestones',
          title: 'Key Milestones',
          contentPath: 'implementationRoadmap.milestones',
        },
        {
          id: 'dependencies',
          title: 'Dependencies',
          contentPath: 'implementationRoadmap.dependencies',
        },
      ],
    },
    {
      id: 'appendices',
      title: 'Appendices',
      required: false,
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'organization-name': 'organization.name',
    'organization-industry': 'organization.industry',
    'organization-size': 'organization.size',
    'business-alignment': 'strategicVision.businessAlignment',
    'innovation-goals': 'strategicVision.innovationGoals',
    'digital-transformation-strategy': 'strategicVision.digitalTransformation',
    'current-technology-systems': 'technologyPortfolio.currentSystems',
    'emerging-technology-assessment': 'technologyPortfolio.emergingTech',
    'build-vs-buy': 'technologyPortfolio.buildVsBuy',
    'technology-budget-allocation': 'investmentStrategy.budgetAllocation',
    'roi-analysis': 'investmentStrategy.roiAnalysis',
    'cost-optimization-initiatives': 'investmentStrategy.costOptimization',
    'technology-decision-framework': 'governance.decisionFramework',
    'standards-compliance': 'governance.standardsCompliance',
    'vendor-management-strategy': 'governance.vendorManagement',
    'strategic-technology-risks': 'riskAssessment.strategicRisks',
    'risk-mitigation-strategies': 'riskAssessment.mitigationStrategies',
    'implementation-phases': 'implementationRoadmap.phases',
    'strategy-milestones': 'implementationRoadmap.milestones',
    'implementation-dependencies': 'implementationRoadmap.dependencies',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'investmentStrategy.roiAnalysis': 'ROI analysis to be completed during planning phase',
    'governance.vendorManagement': 'Vendor management policies under development',
    'riskAssessment.mitigationStrategies': ['Regular strategy reviews', 'Technology radar monitoring'],
  },
};
