/**
 * Vendor Management Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Vendor Management documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface VendorManagementData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  policyOverview: {
    purpose: string;
    scope: string;
    objectives: string[];
  };
  vendorSelection: {
    evaluationCriteria: EvaluationCriterion[];
    rfpProcess: string;
    dueDiligence: DueDiligenceItem[];
  };
  contractManagement: {
    terms: ContractTerm[];
    slas: ServiceLevelAgreement[];
    pricingModels: string[];
  };
  performanceMonitoring: {
    kpis: PerformanceKpi[];
    reporting: string;
    reviewSchedule: string;
  };
  riskManagement: {
    vendorRisks: VendorRisk[];
    contingency: string[];
    concentration: string;
  };
  compliance: {
    regulatory: string[];
    dataHandling: string[];
    auditRights: string;
  };
  relationshipManagement: {
    communication: string[];
    escalation: EscalationPath[];
    strategicAlignment: string;
  };
  offboarding: {
    transitionPlanning: string;
    dataReturn: string[];
    contractTermination: string;
  };
}

interface EvaluationCriterion {
  criterion: string;
  weight: number;
  description: string;
  scoringMethod: string;
}

interface DueDiligenceItem {
  area: string;
  checks: string[];
  requiredDocuments: string[];
}

interface ContractTerm {
  term: string;
  description: string;
  priority: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
}

interface ServiceLevelAgreement {
  metric: string;
  target: string;
  measurementMethod: string;
  penalty: string;
}

interface PerformanceKpi {
  name: string;
  description: string;
  target: string;
  frequency: string;
}

interface VendorRisk {
  risk: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigation: string;
}

interface EscalationPath {
  level: number;
  trigger: string;
  contact: string;
  responseTime: string;
}

/**
 * Template configuration for Vendor Management
 */
export const VENDOR_MANAGEMENT_TEMPLATE = {
  slug: 'vendor-management',
  name: 'Vendor Management',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive vendor management policy covering selection, contracting, performance monitoring, risk management, and offboarding procedures',
  estimatedPages: 10,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'vendorSelection.evaluationCriteria',
    'contractManagement.slas',
    'performanceMonitoring.kpis',
    'riskManagement.vendorRisks',
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
      id: 'policy_overview',
      title: 'Policy Overview',
      required: true,
      contentPath: 'policyOverview.purpose',
    },
    {
      id: 'vendor_selection',
      title: 'Vendor Selection',
      required: true,
      subsections: [
        {
          id: 'evaluation_criteria',
          title: 'Evaluation Criteria',
          contentPath: 'vendorSelection.evaluationCriteria',
        },
        {
          id: 'rfp_process',
          title: 'RFP Process',
          contentPath: 'vendorSelection.rfpProcess',
        },
        {
          id: 'due_diligence',
          title: 'Due Diligence',
          contentPath: 'vendorSelection.dueDiligence',
        },
      ],
    },
    {
      id: 'contract_management',
      title: 'Contract Management',
      required: true,
      subsections: [
        {
          id: 'terms',
          title: 'Contract Terms',
          contentPath: 'contractManagement.terms',
        },
        {
          id: 'slas',
          title: 'Service Level Agreements',
          contentPath: 'contractManagement.slas',
        },
        {
          id: 'pricing_models',
          title: 'Pricing Models',
          contentPath: 'contractManagement.pricingModels',
        },
      ],
    },
    {
      id: 'performance_monitoring',
      title: 'Performance Monitoring',
      required: true,
      subsections: [
        {
          id: 'kpis',
          title: 'Key Performance Indicators',
          contentPath: 'performanceMonitoring.kpis',
        },
        {
          id: 'reporting',
          title: 'Reporting Requirements',
          contentPath: 'performanceMonitoring.reporting',
        },
        {
          id: 'review_schedule',
          title: 'Review Schedule',
          contentPath: 'performanceMonitoring.reviewSchedule',
        },
      ],
    },
    {
      id: 'risk_management',
      title: 'Risk Management',
      required: true,
      subsections: [
        {
          id: 'vendor_risks',
          title: 'Vendor Risks',
          contentPath: 'riskManagement.vendorRisks',
        },
        {
          id: 'contingency',
          title: 'Contingency Planning',
          contentPath: 'riskManagement.contingency',
        },
        {
          id: 'concentration',
          title: 'Concentration Risk',
          contentPath: 'riskManagement.concentration',
        },
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance',
      required: true,
      subsections: [
        {
          id: 'regulatory',
          title: 'Regulatory Requirements',
          contentPath: 'compliance.regulatory',
        },
        {
          id: 'data_handling',
          title: 'Data Handling',
          contentPath: 'compliance.dataHandling',
        },
        {
          id: 'audit_rights',
          title: 'Audit Rights',
          contentPath: 'compliance.auditRights',
        },
      ],
    },
    {
      id: 'relationship_management',
      title: 'Relationship Management',
      required: true,
      subsections: [
        {
          id: 'communication',
          title: 'Communication Protocols',
          contentPath: 'relationshipManagement.communication',
        },
        {
          id: 'escalation',
          title: 'Escalation Procedures',
          contentPath: 'relationshipManagement.escalation',
        },
        {
          id: 'strategic_alignment',
          title: 'Strategic Alignment',
          contentPath: 'relationshipManagement.strategicAlignment',
        },
      ],
    },
    {
      id: 'offboarding',
      title: 'Vendor Offboarding',
      required: true,
      subsections: [
        {
          id: 'transition_planning',
          title: 'Transition Planning',
          contentPath: 'offboarding.transitionPlanning',
        },
        {
          id: 'data_return',
          title: 'Data Return & Destruction',
          contentPath: 'offboarding.dataReturn',
        },
        {
          id: 'contract_termination',
          title: 'Contract Termination',
          contentPath: 'offboarding.contractTermination',
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
    'vendor-policy-purpose': 'policyOverview.purpose',
    'vendor-policy-scope': 'policyOverview.scope',
    'evaluation-criteria': 'vendorSelection.evaluationCriteria',
    'rfp-process': 'vendorSelection.rfpProcess',
    'due-diligence': 'vendorSelection.dueDiligence',
    'contract-terms': 'contractManagement.terms',
    'service-level-agreements': 'contractManagement.slas',
    'pricing-models': 'contractManagement.pricingModels',
    'vendor-kpis': 'performanceMonitoring.kpis',
    'vendor-reporting': 'performanceMonitoring.reporting',
    'review-schedule': 'performanceMonitoring.reviewSchedule',
    'vendor-risks': 'riskManagement.vendorRisks',
    'vendor-contingency': 'riskManagement.contingency',
    'concentration-risk': 'riskManagement.concentration',
    'regulatory-requirements': 'compliance.regulatory',
    'vendor-data-handling': 'compliance.dataHandling',
    'audit-rights': 'compliance.auditRights',
    'vendor-communication': 'relationshipManagement.communication',
    'vendor-escalation': 'relationshipManagement.escalation',
    'strategic-alignment': 'relationshipManagement.strategicAlignment',
    'transition-planning': 'offboarding.transitionPlanning',
    'data-return': 'offboarding.dataReturn',
    'contract-termination': 'offboarding.contractTermination',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'performanceMonitoring.reviewSchedule': 'Quarterly performance reviews with annual strategic assessment',
    'riskManagement.concentration': 'Avoid single-vendor dependency for critical services. Maintain alternative vendor relationships.',
    'offboarding.transitionPlanning': 'Minimum 90-day transition period with documented knowledge transfer',
    'compliance.auditRights': 'Organization retains the right to audit vendor operations with 30 days written notice',
  },
};
