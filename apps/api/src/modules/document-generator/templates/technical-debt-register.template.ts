/**
 * Technical Debt Register Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Technical Debt Register documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface TechnicalDebtRegisterData {
  organization: {
    name: string;
    project: string;
  };
  debtInventory: {
    codeDebt: DebtItem[];
    designDebt: DebtItem[];
    infrastructureDebt: DebtItem[];
    documentationDebt: DebtItem[];
  };
  impactAssessment: {
    riskLevel: RiskAssessment[];
    costOfDelay: CostEstimate[];
    affectedSystems: string[];
  };
  prioritization: {
    scoringMatrix: ScoringCriteria[];
    remediationOrder: RemediationItem[];
  };
  remediationPlan: {
    sprintAllocation: SprintPlan[];
    resourceNeeds: ResourceRequirement[];
    timelines: TimelineEntry[];
  };
  trackingMetrics: {
    debtRatio: string;
    velocityImpact: string;
    trendAnalysis: string;
  };
  governance: {
    preventionPolicies: string[];
    reviewProcess: string;
  };
}

interface DebtItem {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  dateIdentified: string;
  owner: string;
}

interface RiskAssessment {
  debtId: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  businessImpact: string;
  technicalImpact: string;
}

interface CostEstimate {
  debtId: string;
  currentCost: string;
  projectedCost: string;
  remediationCost: string;
}

interface ScoringCriteria {
  criterion: string;
  weight: number;
  description: string;
}

interface RemediationItem {
  debtId: string;
  priority: number;
  score: number;
  justification: string;
}

interface SprintPlan {
  sprint: string;
  debtItems: string[];
  capacity: string;
  objectives: string[];
}

interface ResourceRequirement {
  role: string;
  allocation: string;
  duration: string;
  skills: string[];
}

interface TimelineEntry {
  phase: string;
  startDate: string;
  endDate: string;
  debtItems: string[];
  milestones: string[];
}

/**
 * Template configuration for Technical Debt Register
 */
export const TECHNICAL_DEBT_REGISTER_TEMPLATE = {
  slug: 'technical-debt-register',
  name: 'Technical Debt Register',
  category: DocumentCategory.CTO,
  description:
    'Technical debt tracking document covering inventory, impact assessment, prioritization, remediation planning, and governance',
  estimatedPages: 10,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'debtInventory.codeDebt',
    'impactAssessment.riskLevel',
    'prioritization.remediationOrder',
    'remediationPlan.timelines',
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
      id: 'debt_inventory',
      title: 'Debt Inventory',
      required: true,
      subsections: [
        {
          id: 'code_debt',
          title: 'Code Debt',
          contentPath: 'debtInventory.codeDebt',
        },
        {
          id: 'design_debt',
          title: 'Design Debt',
          contentPath: 'debtInventory.designDebt',
        },
        {
          id: 'infrastructure_debt',
          title: 'Infrastructure Debt',
          contentPath: 'debtInventory.infrastructureDebt',
        },
        {
          id: 'documentation_debt',
          title: 'Documentation Debt',
          contentPath: 'debtInventory.documentationDebt',
        },
      ],
    },
    {
      id: 'impact_assessment',
      title: 'Impact Assessment',
      required: true,
      subsections: [
        {
          id: 'risk_level',
          title: 'Risk Level Assessment',
          contentPath: 'impactAssessment.riskLevel',
        },
        {
          id: 'cost_of_delay',
          title: 'Cost of Delay',
          contentPath: 'impactAssessment.costOfDelay',
        },
        {
          id: 'affected_systems',
          title: 'Affected Systems',
          contentPath: 'impactAssessment.affectedSystems',
        },
      ],
    },
    {
      id: 'prioritization',
      title: 'Prioritization',
      required: true,
      subsections: [
        {
          id: 'scoring_matrix',
          title: 'Scoring Matrix',
          contentPath: 'prioritization.scoringMatrix',
        },
        {
          id: 'remediation_order',
          title: 'Remediation Order',
          contentPath: 'prioritization.remediationOrder',
        },
      ],
    },
    {
      id: 'remediation_plan',
      title: 'Remediation Plan',
      required: true,
      subsections: [
        {
          id: 'sprint_allocation',
          title: 'Sprint Allocation',
          contentPath: 'remediationPlan.sprintAllocation',
        },
        {
          id: 'resource_needs',
          title: 'Resource Needs',
          contentPath: 'remediationPlan.resourceNeeds',
        },
        {
          id: 'timelines',
          title: 'Timelines',
          contentPath: 'remediationPlan.timelines',
        },
      ],
    },
    {
      id: 'tracking_metrics',
      title: 'Tracking & Metrics',
      required: true,
      subsections: [
        {
          id: 'debt_ratio',
          title: 'Debt Ratio',
          contentPath: 'trackingMetrics.debtRatio',
        },
        {
          id: 'velocity_impact',
          title: 'Velocity Impact',
          contentPath: 'trackingMetrics.velocityImpact',
        },
        {
          id: 'trend_analysis',
          title: 'Trend Analysis',
          contentPath: 'trackingMetrics.trendAnalysis',
        },
      ],
    },
    {
      id: 'governance',
      title: 'Governance',
      required: true,
      subsections: [
        {
          id: 'prevention_policies',
          title: 'Prevention Policies',
          contentPath: 'governance.preventionPolicies',
        },
        {
          id: 'review_process',
          title: 'Review Process',
          contentPath: 'governance.reviewProcess',
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
    'project-name': 'organization.project',
    'code-debt-items': 'debtInventory.codeDebt',
    'design-debt-items': 'debtInventory.designDebt',
    'infrastructure-debt-items': 'debtInventory.infrastructureDebt',
    'documentation-debt-items': 'debtInventory.documentationDebt',
    'debt-risk-assessment': 'impactAssessment.riskLevel',
    'debt-cost-of-delay': 'impactAssessment.costOfDelay',
    'debt-affected-systems': 'impactAssessment.affectedSystems',
    'prioritization-criteria': 'prioritization.scoringMatrix',
    'remediation-priority-order': 'prioritization.remediationOrder',
    'sprint-debt-allocation': 'remediationPlan.sprintAllocation',
    'remediation-resources': 'remediationPlan.resourceNeeds',
    'remediation-timelines': 'remediationPlan.timelines',
    'current-debt-ratio': 'trackingMetrics.debtRatio',
    'velocity-impact-assessment': 'trackingMetrics.velocityImpact',
    'debt-trend-analysis': 'trackingMetrics.trendAnalysis',
    'debt-prevention-policies': 'governance.preventionPolicies',
    'debt-review-process': 'governance.reviewProcess',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'trackingMetrics.debtRatio': 'To be calculated after initial inventory assessment',
    'trackingMetrics.velocityImpact': 'Velocity impact analysis pending baseline measurement',
    'governance.preventionPolicies': ['Code review requirements', 'Definition of done includes debt assessment', 'Quarterly debt review meetings'],
  },
};
