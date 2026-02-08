/**
 * Stakeholder Analysis Document Template
 * Category: BA
 *
 * This template defines the structure for generating Stakeholder Analysis
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface StakeholderAnalysisData {
  executiveSummary: string;
  stakeholderIdentification: {
    internal: InternalStakeholder[];
    external: ExternalStakeholder[];
    regulatory: RegulatoryStakeholder[];
  };
  stakeholderAssessment: {
    powerInterestGrid: PowerInterestEntry[];
    influenceMapping: InfluenceMapping[];
    attitudes: StakeholderAttitude[];
  };
  communicationPlan: {
    channels: CommunicationChannel[];
    frequency: CommunicationSchedule[];
    messages: KeyMessage[];
    feedback: FeedbackMechanism[];
  };
  engagementStrategy: {
    approachPerStakeholder: EngagementApproach[];
    changeManagement: ChangeManagementStrategy;
    resistanceManagement: ResistanceStrategy[];
  };
  raciMatrix: RACIEntry[];
  riskAssessment: {
    stakeholderRisks: StakeholderRisk[];
    mitigations: RiskMitigation[];
  };
  appendices: {
    supportingDocuments: string[];
    interviewNotes: string;
    surveyResults: string;
  };
}

interface InternalStakeholder {
  id: string;
  name: string;
  title: string;
  department: string;
  role: string;
  influence: 'HIGH' | 'MEDIUM' | 'LOW';
  interest: 'HIGH' | 'MEDIUM' | 'LOW';
  expectations: string[];
}

interface ExternalStakeholder {
  id: string;
  name: string;
  organization: string;
  role: string;
  relationship: string;
  influence: 'HIGH' | 'MEDIUM' | 'LOW';
  interest: 'HIGH' | 'MEDIUM' | 'LOW';
  expectations: string[];
}

interface RegulatoryStakeholder {
  id: string;
  body: string;
  jurisdiction: string;
  requirements: string[];
  complianceImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  reportingObligations: string[];
}

interface PowerInterestEntry {
  stakeholderId: string;
  power: number;
  interest: number;
  quadrant: 'MANAGE_CLOSELY' | 'KEEP_SATISFIED' | 'KEEP_INFORMED' | 'MONITOR';
  strategy: string;
}

interface InfluenceMapping {
  stakeholderId: string;
  influenceType: 'DECISION_MAKER' | 'INFLUENCER' | 'AFFECTED' | 'OBSERVER';
  influenceAreas: string[];
  relationships: string[];
}

interface StakeholderAttitude {
  stakeholderId: string;
  currentAttitude: 'CHAMPION' | 'SUPPORTER' | 'NEUTRAL' | 'RESISTANT' | 'BLOCKER';
  desiredAttitude: 'CHAMPION' | 'SUPPORTER' | 'NEUTRAL';
  gapActions: string[];
}

interface CommunicationChannel {
  id: string;
  name: string;
  type: 'EMAIL' | 'MEETING' | 'REPORT' | 'PRESENTATION' | 'DASHBOARD' | 'NEWSLETTER';
  audience: string[];
  owner: string;
}

interface CommunicationSchedule {
  channelId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'AD_HOC';
  stakeholderIds: string[];
  purpose: string;
}

interface KeyMessage {
  id: string;
  audience: string[];
  message: string;
  timing: string;
  channel: string;
  owner: string;
}

interface FeedbackMechanism {
  id: string;
  method: string;
  frequency: string;
  stakeholderIds: string[];
  responseProcess: string;
}

interface EngagementApproach {
  stakeholderId: string;
  approach: string;
  activities: string[];
  frequency: string;
  owner: string;
  successIndicators: string[];
}

interface ChangeManagementStrategy {
  approach: string;
  phases: string[];
  keyActivities: string[];
  successMetrics: string[];
}

interface ResistanceStrategy {
  stakeholderId: string;
  resistanceType: string;
  rootCause: string;
  mitigation: string;
  escalation: string;
}

interface RACIEntry {
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
}

interface StakeholderRisk {
  id: string;
  stakeholderId: string;
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface RiskMitigation {
  riskId: string;
  strategy: string;
  actions: string[];
  owner: string;
  timeline: string;
}

/**
 * Template configuration for Stakeholder Analysis
 */
export const STAKEHOLDER_ANALYSIS_TEMPLATE = {
  slug: 'stakeholder-analysis',
  name: 'Stakeholder Analysis',
  category: DocumentCategory.BA,
  description:
    'Comprehensive stakeholder analysis document covering identification, assessment, communication planning, engagement strategies, and RACI matrix',
  estimatedPages: 10,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'stakeholderIdentification.internal',
    'stakeholderAssessment.powerInterestGrid',
    'communicationPlan.channels',
    'raciMatrix',
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
      id: 'stakeholder_identification',
      title: 'Stakeholder Identification',
      required: true,
      subsections: [
        {
          id: 'internal',
          title: 'Internal Stakeholders',
          contentPath: 'stakeholderIdentification.internal',
        },
        {
          id: 'external',
          title: 'External Stakeholders',
          contentPath: 'stakeholderIdentification.external',
        },
        {
          id: 'regulatory',
          title: 'Regulatory Stakeholders',
          contentPath: 'stakeholderIdentification.regulatory',
        },
      ],
    },
    {
      id: 'stakeholder_assessment',
      title: 'Stakeholder Assessment',
      required: true,
      subsections: [
        {
          id: 'power_interest_grid',
          title: 'Power/Interest Grid',
          contentPath: 'stakeholderAssessment.powerInterestGrid',
        },
        {
          id: 'influence_mapping',
          title: 'Influence Mapping',
          contentPath: 'stakeholderAssessment.influenceMapping',
        },
        {
          id: 'attitudes',
          title: 'Stakeholder Attitudes',
          contentPath: 'stakeholderAssessment.attitudes',
        },
      ],
    },
    {
      id: 'communication_plan',
      title: 'Communication Plan',
      required: true,
      subsections: [
        {
          id: 'channels',
          title: 'Communication Channels',
          contentPath: 'communicationPlan.channels',
        },
        {
          id: 'frequency',
          title: 'Communication Frequency',
          contentPath: 'communicationPlan.frequency',
        },
        {
          id: 'messages',
          title: 'Key Messages',
          contentPath: 'communicationPlan.messages',
        },
        {
          id: 'feedback',
          title: 'Feedback Mechanisms',
          contentPath: 'communicationPlan.feedback',
        },
      ],
    },
    {
      id: 'engagement_strategy',
      title: 'Engagement Strategy',
      required: true,
      subsections: [
        {
          id: 'approach_per_stakeholder',
          title: 'Approach per Stakeholder',
          contentPath: 'engagementStrategy.approachPerStakeholder',
        },
        {
          id: 'change_management',
          title: 'Change Management',
          contentPath: 'engagementStrategy.changeManagement',
        },
        {
          id: 'resistance_management',
          title: 'Resistance Management',
          contentPath: 'engagementStrategy.resistanceManagement',
        },
      ],
    },
    {
      id: 'raci_matrix',
      title: 'RACI Matrix',
      required: true,
      contentPath: 'raciMatrix',
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      required: true,
      subsections: [
        {
          id: 'stakeholder_risks',
          title: 'Stakeholder Risks',
          contentPath: 'riskAssessment.stakeholderRisks',
        },
        {
          id: 'mitigations',
          title: 'Risk Mitigations',
          contentPath: 'riskAssessment.mitigations',
        },
      ],
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
          id: 'interview_notes',
          title: 'Interview Notes',
          contentPath: 'appendices.interviewNotes',
        },
        {
          id: 'survey_results',
          title: 'Survey Results',
          contentPath: 'appendices.surveyResults',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'internal-stakeholders': 'stakeholderIdentification.internal',
    'external-stakeholders': 'stakeholderIdentification.external',
    'regulatory-stakeholders': 'stakeholderIdentification.regulatory',
    'power-interest-grid': 'stakeholderAssessment.powerInterestGrid',
    'influence-mapping': 'stakeholderAssessment.influenceMapping',
    'stakeholder-attitudes': 'stakeholderAssessment.attitudes',
    'communication-channels': 'communicationPlan.channels',
    'communication-frequency': 'communicationPlan.frequency',
    'key-messages': 'communicationPlan.messages',
    'feedback-mechanisms': 'communicationPlan.feedback',
    'engagement-approach': 'engagementStrategy.approachPerStakeholder',
    'change-management-strategy': 'engagementStrategy.changeManagement',
    'resistance-management': 'engagementStrategy.resistanceManagement',
    'raci-matrix': 'raciMatrix',
    'stakeholder-risks': 'riskAssessment.stakeholderRisks',
    'risk-mitigations': 'riskAssessment.mitigations',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'appendices.interviewNotes': 'Stakeholder interview notes to be compiled during analysis phase',
    'appendices.surveyResults': 'Stakeholder survey to be conducted as part of engagement activities',
    'engagementStrategy.changeManagement': '{"approach": "To be defined", "phases": [], "keyActivities": [], "successMetrics": []}',
  },
};
