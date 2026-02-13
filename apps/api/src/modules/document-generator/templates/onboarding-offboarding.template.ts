/**
 * Onboarding/Offboarding Procedures Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Onboarding/Offboarding Procedures documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface OnboardingOffboardingData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  overview: {
    purpose: string;
    scope: string;
    applicability: string;
  };
  onboardingProcess: {
    preBoarding: PreBoardingTask[];
    dayOne: DayOneTask[];
    firstWeek: FirstWeekTask[];
    firstMonth: string[];
    ninetyDayReview: ReviewCriteria;
  };
  accessProvisioning: {
    systemsAccess: SystemAccess[];
    toolsSetup: ToolSetup[];
    securityTraining: SecurityTrainingItem[];
  };
  roleSpecificSetup: {
    engineering: RoleSetup;
    business: RoleSetup;
    leadership: RoleSetup;
  };
  offboardingProcess: {
    notification: NotificationProcedure;
    knowledgeTransfer: KnowledgeTransferItem[];
    exitInterview: ExitInterviewProcess;
  };
  accessRevocation: {
    systems: SystemRevocation[];
    physical: string[];
    thirdParty: string[];
  };
  compliance: {
    documentation: string[];
    dataHandling: string[];
    legal: string[];
  };
}

interface PreBoardingTask {
  task: string;
  owner: string;
  daysBeforeStart: number;
  required: boolean;
}

interface DayOneTask {
  task: string;
  owner: string;
  duration: string;
  order: number;
}

interface FirstWeekTask {
  day: number;
  tasks: string[];
  goals: string[];
}

interface ReviewCriteria {
  evaluationAreas: string[];
  meetingFormat: string;
  followUpActions: string[];
  documentationRequired: string[];
}

interface SystemAccess {
  system: string;
  accessLevel: string;
  approver: string;
  provisioningTime: string;
}

interface ToolSetup {
  tool: string;
  purpose: string;
  setupInstructions: string;
  license: string;
}

interface SecurityTrainingItem {
  topic: string;
  format: string;
  duration: string;
  completionDeadline: string;
}

interface RoleSetup {
  title: string;
  specificTools: string[];
  accessRequirements: string[];
  trainingModules: string[];
  mentorAssignment: boolean;
}

interface NotificationProcedure {
  noticePeriod: string;
  notificationChain: string[];
  requiredDocuments: string[];
}

interface KnowledgeTransferItem {
  area: string;
  method: string;
  timeline: string;
  deliverables: string[];
}

interface ExitInterviewProcess {
  conductor: string;
  topics: string[];
  confidentiality: string;
  feedbackUsage: string;
}

interface SystemRevocation {
  system: string;
  revocationTimeline: string;
  verificationMethod: string;
  responsible: string;
}

/**
 * Template configuration for Onboarding/Offboarding Procedures
 */
export const ONBOARDING_OFFBOARDING_TEMPLATE = {
  slug: 'onboarding-offboarding',
  name: 'Onboarding/Offboarding Procedures',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive onboarding and offboarding procedures covering pre-boarding through 90-day review, access provisioning, role-specific setup, and secure offboarding',
  estimatedPages: 10,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'onboardingProcess.preBoarding',
    'onboardingProcess.dayOne',
    'accessProvisioning.systemsAccess',
    'offboardingProcess.knowledgeTransfer',
    'accessRevocation.systems',
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
      id: 'overview',
      title: 'Overview',
      required: true,
      contentPath: 'overview.purpose',
    },
    {
      id: 'onboarding_process',
      title: 'Onboarding Process',
      required: true,
      subsections: [
        {
          id: 'pre_boarding',
          title: 'Pre-Boarding',
          contentPath: 'onboardingProcess.preBoarding',
        },
        {
          id: 'day_one',
          title: 'Day One',
          contentPath: 'onboardingProcess.dayOne',
        },
        {
          id: 'first_week',
          title: 'First Week',
          contentPath: 'onboardingProcess.firstWeek',
        },
        {
          id: 'first_month',
          title: 'First Month',
          contentPath: 'onboardingProcess.firstMonth',
        },
        {
          id: 'ninety_day_review',
          title: '90-Day Review',
          contentPath: 'onboardingProcess.ninetyDayReview',
        },
      ],
    },
    {
      id: 'access_provisioning',
      title: 'Access Provisioning',
      required: true,
      subsections: [
        {
          id: 'systems_access',
          title: 'Systems Access',
          contentPath: 'accessProvisioning.systemsAccess',
        },
        {
          id: 'tools_setup',
          title: 'Tools Setup',
          contentPath: 'accessProvisioning.toolsSetup',
        },
        {
          id: 'security_training',
          title: 'Security Training',
          contentPath: 'accessProvisioning.securityTraining',
        },
      ],
    },
    {
      id: 'role_specific_setup',
      title: 'Role-Specific Setup',
      required: true,
      subsections: [
        {
          id: 'engineering',
          title: 'Engineering Roles',
          contentPath: 'roleSpecificSetup.engineering',
        },
        {
          id: 'business',
          title: 'Business Roles',
          contentPath: 'roleSpecificSetup.business',
        },
        {
          id: 'leadership',
          title: 'Leadership Roles',
          contentPath: 'roleSpecificSetup.leadership',
        },
      ],
    },
    {
      id: 'offboarding_process',
      title: 'Offboarding Process',
      required: true,
      subsections: [
        {
          id: 'notification',
          title: 'Notification Procedures',
          contentPath: 'offboardingProcess.notification',
        },
        {
          id: 'knowledge_transfer',
          title: 'Knowledge Transfer',
          contentPath: 'offboardingProcess.knowledgeTransfer',
        },
        {
          id: 'exit_interview',
          title: 'Exit Interview',
          contentPath: 'offboardingProcess.exitInterview',
        },
      ],
    },
    {
      id: 'access_revocation',
      title: 'Access Revocation',
      required: true,
      subsections: [
        {
          id: 'systems_revocation',
          title: 'Systems Access Revocation',
          contentPath: 'accessRevocation.systems',
        },
        {
          id: 'physical_revocation',
          title: 'Physical Access Revocation',
          contentPath: 'accessRevocation.physical',
        },
        {
          id: 'third_party_revocation',
          title: 'Third Party Access Revocation',
          contentPath: 'accessRevocation.thirdParty',
        },
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance',
      required: true,
      subsections: [
        {
          id: 'documentation',
          title: 'Required Documentation',
          contentPath: 'compliance.documentation',
        },
        {
          id: 'data_handling',
          title: 'Data Handling',
          contentPath: 'compliance.dataHandling',
        },
        {
          id: 'legal',
          title: 'Legal Requirements',
          contentPath: 'compliance.legal',
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
    'onboarding-purpose': 'overview.purpose',
    'onboarding-scope': 'overview.scope',
    'pre-boarding-tasks': 'onboardingProcess.preBoarding',
    'day-one-tasks': 'onboardingProcess.dayOne',
    'first-week-tasks': 'onboardingProcess.firstWeek',
    'first-month-goals': 'onboardingProcess.firstMonth',
    'ninety-day-review': 'onboardingProcess.ninetyDayReview',
    'systems-access': 'accessProvisioning.systemsAccess',
    'tools-setup': 'accessProvisioning.toolsSetup',
    'security-training': 'accessProvisioning.securityTraining',
    'engineering-setup': 'roleSpecificSetup.engineering',
    'business-setup': 'roleSpecificSetup.business',
    'leadership-setup': 'roleSpecificSetup.leadership',
    'offboarding-notification': 'offboardingProcess.notification',
    'knowledge-transfer': 'offboardingProcess.knowledgeTransfer',
    'exit-interview': 'offboardingProcess.exitInterview',
    'systems-revocation': 'accessRevocation.systems',
    'physical-revocation': 'accessRevocation.physical',
    'third-party-revocation': 'accessRevocation.thirdParty',
    'compliance-documentation': 'compliance.documentation',
    'compliance-data-handling': 'compliance.dataHandling',
    'compliance-legal': 'compliance.legal',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'onboardingProcess.firstMonth': ['Complete all mandatory training modules', 'Meet with key stakeholders', 'Understand team workflows and processes', 'Begin contributing to assigned projects'],
    'accessRevocation.physical': ['Collect building access cards', 'Collect parking passes', 'Collect company equipment', 'Update physical access control lists'],
    'accessRevocation.thirdParty': ['Revoke access to third-party SaaS platforms', 'Remove from vendor communication channels', 'Update external service accounts'],
    'compliance.legal': ['Remind departing employee of ongoing NDA obligations', 'Confirm IP assignment agreements are on file', 'Process final compensation per local regulations'],
  },
};
