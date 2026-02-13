/**
 * Change Request Document Template
 * Category: BA
 *
 * This template defines the structure for generating Change Request
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface ChangeRequestData {
  requestSummary: {
    requester: string;
    date: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'SCOPE' | 'SCHEDULE' | 'BUDGET' | 'REQUIREMENTS' | 'TECHNICAL' | 'OTHER';
  };
  changeDescription: {
    currentState: string;
    proposedChange: string;
    justification: string;
  };
  impactAnalysis: {
    scopeImpact: ScopeImpact;
    scheduleImpact: ScheduleImpact;
    budgetImpact: BudgetImpact;
    resourceImpact: ResourceImpact;
    riskImpact: RiskImpact[];
  };
  implementationPlan: {
    tasks: ImplementationTask[];
    timeline: string;
    testingPlan: TestingPlan;
    rollbackPlan: RollbackPlan;
  };
  approval: {
    reviewBoard: ReviewBoardMember[];
    decision: 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'PENDING';
    conditions: string[];
  };
  communication: {
    stakeholders: AffectedStakeholder[];
    notifications: Notification[];
    training: TrainingRequirement[];
  };
  appendices: {
    supportingDocuments: string[];
    technicalDetails: string;
    costEstimates: string;
  };
}

interface ScopeImpact {
  description: string;
  affectedRequirements: string[];
  affectedDeliverables: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface ScheduleImpact {
  description: string;
  affectedMilestones: string[];
  delayEstimate: string;
  criticalPathAffected: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface BudgetImpact {
  description: string;
  additionalCost: string;
  costSavings: string;
  netImpact: string;
  fundingSource: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface ResourceImpact {
  description: string;
  additionalResources: string[];
  reassignedResources: string[];
  skillsRequired: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface RiskImpact {
  id: string;
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigation: string;
}

interface ImplementationTask {
  id: string;
  description: string;
  assignee: string;
  estimatedEffort: string;
  dependencies: string[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface TestingPlan {
  approach: string;
  testCases: string[];
  testEnvironment: string;
  acceptanceCriteria: string[];
  estimatedDuration: string;
}

interface RollbackPlan {
  trigger: string;
  steps: string[];
  estimatedDuration: string;
  dataRecovery: string;
  responsible: string;
}

interface ReviewBoardMember {
  name: string;
  role: string;
  vote: 'APPROVE' | 'REJECT' | 'ABSTAIN' | 'PENDING';
  comments: string;
  date: string;
}

interface AffectedStakeholder {
  id: string;
  name: string;
  role: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  communicationMethod: string;
}

interface Notification {
  id: string;
  audience: string[];
  message: string;
  channel: string;
  timing: string;
  owner: string;
}

interface TrainingRequirement {
  id: string;
  audience: string[];
  topic: string;
  format: 'IN_PERSON' | 'VIRTUAL' | 'DOCUMENTATION' | 'VIDEO';
  duration: string;
  deadline: string;
}

/**
 * Template configuration for Change Request Document
 */
export const CHANGE_REQUEST_TEMPLATE = {
  slug: 'change-request',
  name: 'Change Request Document',
  category: DocumentCategory.BA,
  description:
    'Change request document covering request details, impact analysis, implementation planning, approval workflow, and stakeholder communication',
  estimatedPages: 8,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'requestSummary.requester',
    'requestSummary.priority',
    'changeDescription.proposedChange',
    'changeDescription.justification',
    'impactAnalysis.scopeImpact',
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
      id: 'request_summary',
      title: 'Request Summary',
      required: true,
      subsections: [
        {
          id: 'requester',
          title: 'Requester',
          contentPath: 'requestSummary.requester',
        },
        {
          id: 'date',
          title: 'Request Date',
          contentPath: 'requestSummary.date',
        },
        {
          id: 'priority',
          title: 'Priority',
          contentPath: 'requestSummary.priority',
        },
        {
          id: 'category',
          title: 'Category',
          contentPath: 'requestSummary.category',
        },
      ],
    },
    {
      id: 'change_description',
      title: 'Change Description',
      required: true,
      subsections: [
        {
          id: 'current_state',
          title: 'Current State',
          contentPath: 'changeDescription.currentState',
        },
        {
          id: 'proposed_change',
          title: 'Proposed Change',
          contentPath: 'changeDescription.proposedChange',
        },
        {
          id: 'justification',
          title: 'Justification',
          contentPath: 'changeDescription.justification',
        },
      ],
    },
    {
      id: 'impact_analysis',
      title: 'Impact Analysis',
      required: true,
      subsections: [
        {
          id: 'scope_impact',
          title: 'Scope Impact',
          contentPath: 'impactAnalysis.scopeImpact',
        },
        {
          id: 'schedule_impact',
          title: 'Schedule Impact',
          contentPath: 'impactAnalysis.scheduleImpact',
        },
        {
          id: 'budget_impact',
          title: 'Budget Impact',
          contentPath: 'impactAnalysis.budgetImpact',
        },
        {
          id: 'resource_impact',
          title: 'Resource Impact',
          contentPath: 'impactAnalysis.resourceImpact',
        },
        {
          id: 'risk_impact',
          title: 'Risk Impact',
          contentPath: 'impactAnalysis.riskImpact',
        },
      ],
    },
    {
      id: 'implementation_plan',
      title: 'Implementation Plan',
      required: true,
      subsections: [
        {
          id: 'tasks',
          title: 'Implementation Tasks',
          contentPath: 'implementationPlan.tasks',
        },
        {
          id: 'timeline',
          title: 'Timeline',
          contentPath: 'implementationPlan.timeline',
        },
        {
          id: 'testing',
          title: 'Testing Plan',
          contentPath: 'implementationPlan.testingPlan',
        },
        {
          id: 'rollback',
          title: 'Rollback Plan',
          contentPath: 'implementationPlan.rollbackPlan',
        },
      ],
    },
    {
      id: 'approval',
      title: 'Approval',
      required: true,
      subsections: [
        {
          id: 'review_board',
          title: 'Review Board',
          contentPath: 'approval.reviewBoard',
        },
        {
          id: 'decision',
          title: 'Decision',
          contentPath: 'approval.decision',
        },
        {
          id: 'conditions',
          title: 'Conditions',
          contentPath: 'approval.conditions',
        },
      ],
    },
    {
      id: 'communication',
      title: 'Communication',
      required: true,
      subsections: [
        {
          id: 'stakeholders',
          title: 'Affected Stakeholders',
          contentPath: 'communication.stakeholders',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          contentPath: 'communication.notifications',
        },
        {
          id: 'training',
          title: 'Training Requirements',
          contentPath: 'communication.training',
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
          id: 'technical_details',
          title: 'Technical Details',
          contentPath: 'appendices.technicalDetails',
        },
        {
          id: 'cost_estimates',
          title: 'Cost Estimates',
          contentPath: 'appendices.costEstimates',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'change-requester': 'requestSummary.requester',
    'request-date': 'requestSummary.date',
    'change-priority': 'requestSummary.priority',
    'change-category': 'requestSummary.category',
    'current-state': 'changeDescription.currentState',
    'proposed-change': 'changeDescription.proposedChange',
    'change-justification': 'changeDescription.justification',
    'scope-impact': 'impactAnalysis.scopeImpact',
    'schedule-impact': 'impactAnalysis.scheduleImpact',
    'budget-impact': 'impactAnalysis.budgetImpact',
    'resource-impact': 'impactAnalysis.resourceImpact',
    'risk-impact': 'impactAnalysis.riskImpact',
    'implementation-tasks': 'implementationPlan.tasks',
    'implementation-timeline': 'implementationPlan.timeline',
    'testing-plan': 'implementationPlan.testingPlan',
    'rollback-plan': 'implementationPlan.rollbackPlan',
    'review-board': 'approval.reviewBoard',
    'approval-decision': 'approval.decision',
    'approval-conditions': 'approval.conditions',
    'affected-stakeholders': 'communication.stakeholders',
    'change-notifications': 'communication.notifications',
    'training-requirements': 'communication.training',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'approval.decision': 'PENDING',
    'approval.conditions': '[]',
    'implementationPlan.rollbackPlan': '{"trigger": "To be defined", "steps": [], "estimatedDuration": "TBD", "dataRecovery": "TBD", "responsible": "TBD"}',
    'communication.training': '[]',
  },
};
