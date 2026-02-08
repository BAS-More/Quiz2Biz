/**
 * Data Protection Policy Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Data Protection Policy documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface DataProtectionPolicyData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  policyOverview: {
    purpose: string;
    scope: string;
    legalBasis: string[];
  };
  dataInventory: {
    categories: DataCategory[];
    sources: string[];
    processingActivities: ProcessingActivity[];
  };
  lawfulBasis: {
    consent: ConsentRequirement[];
    contracts: string[];
    legitimateInterests: string[];
  };
  individualRights: {
    access: string;
    rectification: string;
    erasure: string;
    portability: string;
  };
  dataSecurity: {
    technicalMeasures: string[];
    organizationalMeasures: string[];
  };
  breachManagement: {
    detection: string[];
    notification: NotificationProcedure[];
    remediation: string[];
  };
  thirdPartyManagement: {
    processors: ThirdPartyProcessor[];
    transfers: string[];
    contracts: string[];
  };
  retentionAndDisposal: {
    retentionSchedule: RetentionPolicy[];
    disposalMethods: string[];
  };
  trainingAndAwareness: {
    trainingProgram: string;
    frequency: string;
    targetAudience: string[];
    topics: string[];
  };
}

interface DataCategory {
  name: string;
  description: string;
  sensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  legalBasis: string;
}

interface ProcessingActivity {
  activity: string;
  purpose: string;
  dataCategories: string[];
  retention: string;
}

interface ConsentRequirement {
  purpose: string;
  mechanism: string;
  withdrawalProcess: string;
}

interface NotificationProcedure {
  audience: string;
  timeframe: string;
  method: string;
  content: string[];
}

interface ThirdPartyProcessor {
  name: string;
  service: string;
  dataAccess: string[];
  contractStatus: string;
}

interface RetentionPolicy {
  dataType: string;
  retentionPeriod: string;
  justification: string;
  reviewDate: string;
}

/**
 * Template configuration for Data Protection Policy
 */
export const DATA_PROTECTION_POLICY_TEMPLATE = {
  slug: 'data-protection-policy',
  name: 'Data Protection Policy',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive data protection policy covering data inventory, lawful basis, individual rights, security measures, and breach management',
  estimatedPages: 14,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'policyOverview.purpose',
    'policyOverview.scope',
    'dataInventory.categories',
    'dataSecurity.technicalMeasures',
    'breachManagement.detection',
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
      subsections: [
        {
          id: 'purpose',
          title: 'Purpose',
          contentPath: 'policyOverview.purpose',
        },
        {
          id: 'scope',
          title: 'Scope',
          contentPath: 'policyOverview.scope',
        },
        {
          id: 'legal_basis',
          title: 'Legal Basis',
          contentPath: 'policyOverview.legalBasis',
        },
      ],
    },
    {
      id: 'data_inventory',
      title: 'Data Inventory',
      required: true,
      subsections: [
        {
          id: 'categories',
          title: 'Data Categories',
          contentPath: 'dataInventory.categories',
        },
        {
          id: 'sources',
          title: 'Data Sources',
          contentPath: 'dataInventory.sources',
        },
        {
          id: 'processing_activities',
          title: 'Processing Activities',
          contentPath: 'dataInventory.processingActivities',
        },
      ],
    },
    {
      id: 'lawful_basis',
      title: 'Lawful Basis for Processing',
      required: true,
      subsections: [
        {
          id: 'consent',
          title: 'Consent',
          contentPath: 'lawfulBasis.consent',
        },
        {
          id: 'contracts',
          title: 'Contractual Necessity',
          contentPath: 'lawfulBasis.contracts',
        },
        {
          id: 'legitimate_interests',
          title: 'Legitimate Interests',
          contentPath: 'lawfulBasis.legitimateInterests',
        },
      ],
    },
    {
      id: 'individual_rights',
      title: 'Individual Rights',
      required: true,
      subsections: [
        {
          id: 'access',
          title: 'Right of Access',
          contentPath: 'individualRights.access',
        },
        {
          id: 'rectification',
          title: 'Right to Rectification',
          contentPath: 'individualRights.rectification',
        },
        {
          id: 'erasure',
          title: 'Right to Erasure',
          contentPath: 'individualRights.erasure',
        },
        {
          id: 'portability',
          title: 'Right to Data Portability',
          contentPath: 'individualRights.portability',
        },
      ],
    },
    {
      id: 'data_security',
      title: 'Data Security',
      required: true,
      subsections: [
        {
          id: 'technical_measures',
          title: 'Technical Measures',
          contentPath: 'dataSecurity.technicalMeasures',
        },
        {
          id: 'organizational_measures',
          title: 'Organizational Measures',
          contentPath: 'dataSecurity.organizationalMeasures',
        },
      ],
    },
    {
      id: 'breach_management',
      title: 'Breach Management',
      required: true,
      subsections: [
        {
          id: 'detection',
          title: 'Breach Detection',
          contentPath: 'breachManagement.detection',
        },
        {
          id: 'notification',
          title: 'Breach Notification',
          contentPath: 'breachManagement.notification',
        },
        {
          id: 'remediation',
          title: 'Breach Remediation',
          contentPath: 'breachManagement.remediation',
        },
      ],
    },
    {
      id: 'third_party_management',
      title: 'Third Party Management',
      required: true,
      subsections: [
        {
          id: 'processors',
          title: 'Data Processors',
          contentPath: 'thirdPartyManagement.processors',
        },
        {
          id: 'transfers',
          title: 'International Transfers',
          contentPath: 'thirdPartyManagement.transfers',
        },
        {
          id: 'contracts',
          title: 'Data Processing Contracts',
          contentPath: 'thirdPartyManagement.contracts',
        },
      ],
    },
    {
      id: 'retention_and_disposal',
      title: 'Retention & Disposal',
      required: true,
      subsections: [
        {
          id: 'retention_schedule',
          title: 'Retention Schedule',
          contentPath: 'retentionAndDisposal.retentionSchedule',
        },
        {
          id: 'disposal_methods',
          title: 'Disposal Methods',
          contentPath: 'retentionAndDisposal.disposalMethods',
        },
      ],
    },
    {
      id: 'training_and_awareness',
      title: 'Training & Awareness',
      required: true,
      subsections: [
        {
          id: 'training_program',
          title: 'Training Program',
          contentPath: 'trainingAndAwareness.trainingProgram',
        },
        {
          id: 'topics',
          title: 'Training Topics',
          contentPath: 'trainingAndAwareness.topics',
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
    'policy-purpose': 'policyOverview.purpose',
    'policy-scope': 'policyOverview.scope',
    'legal-basis': 'policyOverview.legalBasis',
    'data-categories': 'dataInventory.categories',
    'data-sources': 'dataInventory.sources',
    'processing-activities': 'dataInventory.processingActivities',
    'consent-requirements': 'lawfulBasis.consent',
    'contractual-basis': 'lawfulBasis.contracts',
    'legitimate-interests': 'lawfulBasis.legitimateInterests',
    'right-of-access': 'individualRights.access',
    'right-to-rectification': 'individualRights.rectification',
    'right-to-erasure': 'individualRights.erasure',
    'right-to-portability': 'individualRights.portability',
    'technical-security-measures': 'dataSecurity.technicalMeasures',
    'organizational-security-measures': 'dataSecurity.organizationalMeasures',
    'breach-detection': 'breachManagement.detection',
    'breach-notification': 'breachManagement.notification',
    'breach-remediation': 'breachManagement.remediation',
    'data-processors': 'thirdPartyManagement.processors',
    'international-transfers': 'thirdPartyManagement.transfers',
    'processing-contracts': 'thirdPartyManagement.contracts',
    'retention-schedule': 'retentionAndDisposal.retentionSchedule',
    'disposal-methods': 'retentionAndDisposal.disposalMethods',
    'training-program': 'trainingAndAwareness.trainingProgram',
    'training-frequency': 'trainingAndAwareness.frequency',
    'training-audience': 'trainingAndAwareness.targetAudience',
    'training-topics': 'trainingAndAwareness.topics',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'individualRights.access': 'Individuals may submit a subject access request to obtain a copy of their personal data',
    'individualRights.rectification': 'Individuals may request correction of inaccurate personal data',
    'individualRights.erasure': 'Individuals may request deletion of personal data where no legitimate basis for retention exists',
    'individualRights.portability': 'Individuals may request their data in a structured, machine-readable format',
    'trainingAndAwareness.frequency': 'Annual mandatory training with quarterly awareness updates',
  },
};
