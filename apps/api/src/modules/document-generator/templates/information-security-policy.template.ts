/**
 * Information Security Policy Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Information Security Policy documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface InformationSecurityPolicyData {
  organization: {
    name: string;
    industry: string;
  };
  policyOverview: {
    purpose: string;
    scope: string;
    applicability: string;
  };
  informationClassification: {
    levels: ClassificationLevel[];
    handling: HandlingProcedure[];
    labeling: string;
  };
  accessControl: {
    authentication: AuthenticationPolicy;
    authorization: AuthorizationPolicy;
    privilegeManagement: string;
  };
  networkSecurity: {
    firewalls: FirewallRule[];
    segmentation: string;
    monitoring: string;
  };
  dataProtection: {
    encryption: EncryptionStandard[];
    backup: BackupPolicy;
    disposal: string;
  };
  incidentManagement: {
    detection: string;
    response: IncidentResponsePlan;
    reporting: string;
  };
  compliance: {
    regulatoryRequirements: RegulatoryRequirement[];
    audit: AuditSchedule;
    certification: string[];
  };
  employeeResponsibilities: {
    generalObligations: string[];
    training: string;
    acceptableUse: string;
    reporting: string;
  };
}

interface ClassificationLevel {
  level: string;
  description: string;
  examples: string[];
  controls: string[];
}

interface HandlingProcedure {
  classificationLevel: string;
  storage: string;
  transmission: string;
  destruction: string;
}

interface AuthenticationPolicy {
  methods: string[];
  passwordPolicy: string;
  mfa: string;
  sessionManagement: string;
}

interface AuthorizationPolicy {
  model: string;
  roleDefinitions: string[];
  accessReviews: string;
}

interface FirewallRule {
  name: string;
  direction: 'INBOUND' | 'OUTBOUND';
  protocol: string;
  action: 'ALLOW' | 'DENY';
  description: string;
}

interface EncryptionStandard {
  scope: string;
  algorithm: string;
  keyLength: string;
  keyManagement: string;
}

interface BackupPolicy {
  frequency: string;
  retention: string;
  storage: string;
  testing: string;
}

interface IncidentResponsePlan {
  phases: string[];
  escalation: string;
  communication: string;
  postIncident: string;
}

interface RegulatoryRequirement {
  regulation: string;
  applicability: string;
  requirements: string[];
  status: 'COMPLIANT' | 'IN_PROGRESS' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
}

interface AuditSchedule {
  internalFrequency: string;
  externalFrequency: string;
  scope: string[];
  lastAudit: string;
}

/**
 * Template configuration for Information Security Policy
 */
export const INFORMATION_SECURITY_POLICY_TEMPLATE = {
  slug: 'information-security-policy',
  name: 'Information Security Policy',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive information security policy covering classification, access control, network security, data protection, incident management, and compliance',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'policyOverview.purpose',
    'policyOverview.scope',
    'informationClassification.levels',
    'accessControl.authentication',
    'dataProtection.encryption',
    'incidentManagement.response',
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
          id: 'applicability',
          title: 'Applicability',
          contentPath: 'policyOverview.applicability',
        },
      ],
    },
    {
      id: 'information_classification',
      title: 'Information Classification',
      required: true,
      subsections: [
        {
          id: 'classification_levels',
          title: 'Classification Levels',
          contentPath: 'informationClassification.levels',
        },
        {
          id: 'handling_procedures',
          title: 'Handling Procedures',
          contentPath: 'informationClassification.handling',
        },
        {
          id: 'labeling',
          title: 'Labeling Requirements',
          contentPath: 'informationClassification.labeling',
        },
      ],
    },
    {
      id: 'access_control',
      title: 'Access Control',
      required: true,
      subsections: [
        {
          id: 'authentication',
          title: 'Authentication',
          contentPath: 'accessControl.authentication',
        },
        {
          id: 'authorization',
          title: 'Authorization',
          contentPath: 'accessControl.authorization',
        },
        {
          id: 'privilege_management',
          title: 'Privilege Management',
          contentPath: 'accessControl.privilegeManagement',
        },
      ],
    },
    {
      id: 'network_security',
      title: 'Network Security',
      required: true,
      subsections: [
        {
          id: 'firewalls',
          title: 'Firewall Configuration',
          contentPath: 'networkSecurity.firewalls',
        },
        {
          id: 'segmentation',
          title: 'Network Segmentation',
          contentPath: 'networkSecurity.segmentation',
        },
        {
          id: 'network_monitoring',
          title: 'Network Monitoring',
          contentPath: 'networkSecurity.monitoring',
        },
      ],
    },
    {
      id: 'data_protection',
      title: 'Data Protection',
      required: true,
      subsections: [
        {
          id: 'encryption',
          title: 'Encryption Standards',
          contentPath: 'dataProtection.encryption',
        },
        {
          id: 'backup',
          title: 'Backup & Recovery',
          contentPath: 'dataProtection.backup',
        },
        {
          id: 'disposal',
          title: 'Data Disposal',
          contentPath: 'dataProtection.disposal',
        },
      ],
    },
    {
      id: 'incident_management',
      title: 'Incident Management',
      required: true,
      subsections: [
        {
          id: 'detection',
          title: 'Detection & Identification',
          contentPath: 'incidentManagement.detection',
        },
        {
          id: 'response',
          title: 'Incident Response',
          contentPath: 'incidentManagement.response',
        },
        {
          id: 'incident_reporting',
          title: 'Reporting Requirements',
          contentPath: 'incidentManagement.reporting',
        },
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance',
      required: true,
      subsections: [
        {
          id: 'regulatory_requirements',
          title: 'Regulatory Requirements',
          contentPath: 'compliance.regulatoryRequirements',
        },
        {
          id: 'audit',
          title: 'Audit Schedule',
          contentPath: 'compliance.audit',
        },
        {
          id: 'certification',
          title: 'Certifications',
          contentPath: 'compliance.certification',
        },
      ],
    },
    {
      id: 'employee_responsibilities',
      title: 'Employee Responsibilities',
      required: true,
      subsections: [
        {
          id: 'general_obligations',
          title: 'General Obligations',
          contentPath: 'employeeResponsibilities.generalObligations',
        },
        {
          id: 'security_training',
          title: 'Security Training',
          contentPath: 'employeeResponsibilities.training',
        },
        {
          id: 'acceptable_use',
          title: 'Acceptable Use Policy',
          contentPath: 'employeeResponsibilities.acceptableUse',
        },
        {
          id: 'employee_reporting',
          title: 'Incident Reporting',
          contentPath: 'employeeResponsibilities.reporting',
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
    'security-policy-purpose': 'policyOverview.purpose',
    'security-policy-scope': 'policyOverview.scope',
    'security-policy-applicability': 'policyOverview.applicability',
    'classification-levels': 'informationClassification.levels',
    'data-handling-procedures': 'informationClassification.handling',
    'labeling-requirements': 'informationClassification.labeling',
    'authentication-policy': 'accessControl.authentication',
    'authorization-policy': 'accessControl.authorization',
    'privilege-management': 'accessControl.privilegeManagement',
    'firewall-rules': 'networkSecurity.firewalls',
    'network-segmentation': 'networkSecurity.segmentation',
    'network-monitoring': 'networkSecurity.monitoring',
    'encryption-standards': 'dataProtection.encryption',
    'backup-policy': 'dataProtection.backup',
    'data-disposal-policy': 'dataProtection.disposal',
    'incident-detection': 'incidentManagement.detection',
    'incident-response-plan': 'incidentManagement.response',
    'incident-reporting-requirements': 'incidentManagement.reporting',
    'regulatory-requirements': 'compliance.regulatoryRequirements',
    'audit-schedule': 'compliance.audit',
    'security-certifications': 'compliance.certification',
    'employee-security-obligations': 'employeeResponsibilities.generalObligations',
    'security-training-program': 'employeeResponsibilities.training',
    'acceptable-use-policy': 'employeeResponsibilities.acceptableUse',
    'employee-incident-reporting': 'employeeResponsibilities.reporting',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'accessControl.privilegeManagement': 'Principle of least privilege enforced with quarterly access reviews',
    'dataProtection.disposal': 'Secure data disposal following NIST 800-88 guidelines',
    'incidentManagement.reporting': 'All security incidents must be reported within 24 hours to the security team',
    'employeeResponsibilities.training': 'Annual security awareness training required for all employees',
  },
};
