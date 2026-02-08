/**
 * Incident Response Plan Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Incident Response Plan documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface IncidentResponsePlanData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  executiveSummary: {
    purpose: string;
    scope: string;
    objectives: string[];
  };
  preparation: {
    teamStructure: TeamMember[];
    contactList: ContactEntry[];
    tools: IncidentTool[];
    training: TrainingRequirement[];
  };
  identification: {
    detectionMethods: string[];
    classification: IncidentClassification[];
    severityLevels: SeverityLevel[];
  };
  containment: {
    shortTerm: string[];
    longTerm: string[];
    evidencePreservation: string[];
  };
  eradication: {
    rootCauseAnalysis: string;
    remediationSteps: string[];
  };
  recovery: {
    restorationPlan: string;
    validation: string[];
    monitoring: string[];
  };
  lessonsLearned: {
    postIncidentReview: string;
    processImprovements: string[];
  };
  communicationPlan: {
    internal: string[];
    external: string[];
    regulatory: string[];
  };
}

interface TeamMember {
  name: string;
  role: string;
  responsibilities: string;
  contactInfo: string;
}

interface ContactEntry {
  name: string;
  role: string;
  phone: string;
  email: string;
  escalationLevel: number;
}

interface IncidentTool {
  name: string;
  purpose: string;
  location: string;
}

interface TrainingRequirement {
  topic: string;
  audience: string;
  frequency: string;
}

interface IncidentClassification {
  category: string;
  description: string;
  examples: string[];
}

interface SeverityLevel {
  level: string;
  name: string;
  description: string;
  responseTime: string;
  escalationRequired: boolean;
}

/**
 * Template configuration for Incident Response Plan
 */
export const INCIDENT_RESPONSE_PLAN_TEMPLATE = {
  slug: 'incident-response-plan',
  name: 'Incident Response Plan',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive incident response plan covering preparation, detection, containment, eradication, recovery, and post-incident activities',
  estimatedPages: 12,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'preparation.teamStructure',
    'identification.severityLevels',
    'containment.shortTerm',
    'recovery.restorationPlan',
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
      id: 'preparation',
      title: 'Preparation',
      required: true,
      subsections: [
        {
          id: 'team_structure',
          title: 'Team Structure',
          contentPath: 'preparation.teamStructure',
        },
        {
          id: 'contact_list',
          title: 'Contact List',
          contentPath: 'preparation.contactList',
        },
        {
          id: 'tools',
          title: 'Tools & Resources',
          contentPath: 'preparation.tools',
        },
        {
          id: 'training',
          title: 'Training Requirements',
          contentPath: 'preparation.training',
        },
      ],
    },
    {
      id: 'identification',
      title: 'Identification',
      required: true,
      subsections: [
        {
          id: 'detection_methods',
          title: 'Detection Methods',
          contentPath: 'identification.detectionMethods',
        },
        {
          id: 'classification',
          title: 'Incident Classification',
          contentPath: 'identification.classification',
        },
        {
          id: 'severity_levels',
          title: 'Severity Levels',
          contentPath: 'identification.severityLevels',
        },
      ],
    },
    {
      id: 'containment',
      title: 'Containment',
      required: true,
      subsections: [
        {
          id: 'short_term',
          title: 'Short-Term Containment',
          contentPath: 'containment.shortTerm',
        },
        {
          id: 'long_term',
          title: 'Long-Term Containment',
          contentPath: 'containment.longTerm',
        },
        {
          id: 'evidence_preservation',
          title: 'Evidence Preservation',
          contentPath: 'containment.evidencePreservation',
        },
      ],
    },
    {
      id: 'eradication',
      title: 'Eradication',
      required: true,
      subsections: [
        {
          id: 'root_cause_analysis',
          title: 'Root Cause Analysis',
          contentPath: 'eradication.rootCauseAnalysis',
        },
        {
          id: 'remediation_steps',
          title: 'Remediation Steps',
          contentPath: 'eradication.remediationSteps',
        },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery',
      required: true,
      subsections: [
        {
          id: 'restoration_plan',
          title: 'Restoration Plan',
          contentPath: 'recovery.restorationPlan',
        },
        {
          id: 'validation',
          title: 'Validation & Verification',
          contentPath: 'recovery.validation',
        },
        {
          id: 'monitoring',
          title: 'Post-Recovery Monitoring',
          contentPath: 'recovery.monitoring',
        },
      ],
    },
    {
      id: 'lessons_learned',
      title: 'Lessons Learned',
      required: true,
      subsections: [
        {
          id: 'post_incident_review',
          title: 'Post-Incident Review',
          contentPath: 'lessonsLearned.postIncidentReview',
        },
        {
          id: 'process_improvements',
          title: 'Process Improvements',
          contentPath: 'lessonsLearned.processImprovements',
        },
      ],
    },
    {
      id: 'communication_plan',
      title: 'Communication Plan',
      required: true,
      subsections: [
        {
          id: 'internal_communication',
          title: 'Internal Communication',
          contentPath: 'communicationPlan.internal',
        },
        {
          id: 'external_communication',
          title: 'External Communication',
          contentPath: 'communicationPlan.external',
        },
        {
          id: 'regulatory_communication',
          title: 'Regulatory Notification',
          contentPath: 'communicationPlan.regulatory',
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
    'incident-team-structure': 'preparation.teamStructure',
    'incident-contact-list': 'preparation.contactList',
    'incident-tools': 'preparation.tools',
    'incident-training': 'preparation.training',
    'detection-methods': 'identification.detectionMethods',
    'incident-classification': 'identification.classification',
    'severity-levels': 'identification.severityLevels',
    'short-term-containment': 'containment.shortTerm',
    'long-term-containment': 'containment.longTerm',
    'evidence-preservation': 'containment.evidencePreservation',
    'root-cause-analysis': 'eradication.rootCauseAnalysis',
    'remediation-steps': 'eradication.remediationSteps',
    'restoration-plan': 'recovery.restorationPlan',
    'recovery-validation': 'recovery.validation',
    'post-recovery-monitoring': 'recovery.monitoring',
    'post-incident-review': 'lessonsLearned.postIncidentReview',
    'process-improvements': 'lessonsLearned.processImprovements',
    'internal-communication': 'communicationPlan.internal',
    'external-communication': 'communicationPlan.external',
    'regulatory-notification': 'communicationPlan.regulatory',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'eradication.rootCauseAnalysis': 'Root cause analysis to be conducted post-incident',
    'lessonsLearned.postIncidentReview': 'Post-incident review to be scheduled within 5 business days',
    'communicationPlan.regulatory': ['Regulatory notification procedures to be determined based on incident type'],
  },
};
