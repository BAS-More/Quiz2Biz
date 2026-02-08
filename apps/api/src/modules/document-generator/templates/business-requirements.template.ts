/**
 * Business Requirements Document Template
 * Category: BA
 *
 * This template defines the structure for generating comprehensive Business Requirements
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface BusinessRequirementsData {
  executiveSummary: string;
  projectBackground: {
    context: string;
    problemStatement: string;
    opportunity: string;
  };
  businessObjectives: {
    goals: BusinessGoal[];
    successCriteria: string[];
    kpis: KPI[];
  };
  scope: {
    inScope: string[];
    outOfScope: string[];
    constraints: string[];
    assumptions: string[];
  };
  stakeholderAnalysis: {
    stakeholders: Stakeholder[];
    roles: string[];
    communicationPlan: string;
  };
  requirements: {
    functionalHighLevel: FunctionalRequirement[];
    nonFunctional: NonFunctionalRequirement[];
    businessRules: BusinessRule[];
  };
  acceptanceCriteria: AcceptanceCriterion[];
  riskAssessment: {
    risks: Risk[];
    mitigations: string[];
    dependencies: Dependency[];
  };
  appendices: {
    supportingDocuments: string[];
    glossary: string;
    references: string;
  };
}

interface BusinessGoal {
  id: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetDate: string;
}

interface KPI {
  name: string;
  description: string;
  target: string;
  measurementMethod: string;
}

interface Stakeholder {
  name: string;
  role: string;
  department: string;
  influence: 'HIGH' | 'MEDIUM' | 'LOW';
  interest: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface FunctionalRequirement {
  id: string;
  description: string;
  priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  source: string;
}

interface NonFunctionalRequirement {
  id: string;
  category: string;
  description: string;
  acceptanceCriteria: string;
}

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  source: string;
}

interface AcceptanceCriterion {
  id: string;
  requirementId: string;
  description: string;
  testMethod: string;
}

interface Risk {
  id: string;
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface Dependency {
  id: string;
  description: string;
  type: string;
  owner: string;
  dueDate: string;
}

/**
 * Template configuration for Business Requirements Document
 */
export const BUSINESS_REQUIREMENTS_TEMPLATE = {
  slug: 'business-requirements',
  name: 'Business Requirements Document',
  category: DocumentCategory.BA,
  description:
    'Comprehensive business requirements document covering project background, objectives, scope, stakeholders, and detailed requirements with acceptance criteria',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'projectBackground.problemStatement',
    'businessObjectives.goals',
    'scope.inScope',
    'requirements.functionalHighLevel',
    'acceptanceCriteria',
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
      id: 'project_background',
      title: 'Project Background',
      required: true,
      subsections: [
        {
          id: 'context',
          title: 'Context',
          contentPath: 'projectBackground.context',
        },
        {
          id: 'problem_statement',
          title: 'Problem Statement',
          contentPath: 'projectBackground.problemStatement',
        },
        {
          id: 'opportunity',
          title: 'Opportunity',
          contentPath: 'projectBackground.opportunity',
        },
      ],
    },
    {
      id: 'business_objectives',
      title: 'Business Objectives',
      required: true,
      subsections: [
        {
          id: 'goals',
          title: 'Goals',
          contentPath: 'businessObjectives.goals',
        },
        {
          id: 'success_criteria',
          title: 'Success Criteria',
          contentPath: 'businessObjectives.successCriteria',
        },
        {
          id: 'kpis',
          title: 'Key Performance Indicators',
          contentPath: 'businessObjectives.kpis',
        },
      ],
    },
    {
      id: 'scope',
      title: 'Scope',
      required: true,
      subsections: [
        {
          id: 'in_scope',
          title: 'In Scope',
          contentPath: 'scope.inScope',
        },
        {
          id: 'out_of_scope',
          title: 'Out of Scope',
          contentPath: 'scope.outOfScope',
        },
        {
          id: 'constraints',
          title: 'Constraints',
          contentPath: 'scope.constraints',
        },
        {
          id: 'assumptions',
          title: 'Assumptions',
          contentPath: 'scope.assumptions',
        },
      ],
    },
    {
      id: 'stakeholder_analysis',
      title: 'Stakeholder Analysis',
      required: true,
      subsections: [
        {
          id: 'stakeholders',
          title: 'Stakeholders',
          contentPath: 'stakeholderAnalysis.stakeholders',
        },
        {
          id: 'roles',
          title: 'Roles & Responsibilities',
          contentPath: 'stakeholderAnalysis.roles',
        },
        {
          id: 'communication',
          title: 'Communication Plan',
          contentPath: 'stakeholderAnalysis.communicationPlan',
        },
      ],
    },
    {
      id: 'requirements',
      title: 'Requirements',
      required: true,
      subsections: [
        {
          id: 'functional_high_level',
          title: 'Functional Requirements (High-Level)',
          contentPath: 'requirements.functionalHighLevel',
        },
        {
          id: 'non_functional',
          title: 'Non-Functional Requirements',
          contentPath: 'requirements.nonFunctional',
        },
        {
          id: 'business_rules',
          title: 'Business Rules',
          contentPath: 'requirements.businessRules',
        },
      ],
    },
    {
      id: 'acceptance_criteria',
      title: 'Acceptance Criteria',
      required: true,
      contentPath: 'acceptanceCriteria',
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      required: true,
      subsections: [
        {
          id: 'risks',
          title: 'Identified Risks',
          contentPath: 'riskAssessment.risks',
        },
        {
          id: 'mitigations',
          title: 'Mitigation Strategies',
          contentPath: 'riskAssessment.mitigations',
        },
        {
          id: 'dependencies',
          title: 'Dependencies',
          contentPath: 'riskAssessment.dependencies',
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
          id: 'glossary',
          title: 'Glossary',
          contentPath: 'appendices.glossary',
        },
        {
          id: 'references',
          title: 'References',
          contentPath: 'appendices.references',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'project-context': 'projectBackground.context',
    'problem-statement': 'projectBackground.problemStatement',
    'business-opportunity': 'projectBackground.opportunity',
    'business-goals': 'businessObjectives.goals',
    'success-criteria': 'businessObjectives.successCriteria',
    'key-performance-indicators': 'businessObjectives.kpis',
    'in-scope-items': 'scope.inScope',
    'out-of-scope-items': 'scope.outOfScope',
    'project-constraints': 'scope.constraints',
    'project-assumptions': 'scope.assumptions',
    'stakeholder-list': 'stakeholderAnalysis.stakeholders',
    'stakeholder-roles': 'stakeholderAnalysis.roles',
    'communication-plan': 'stakeholderAnalysis.communicationPlan',
    'functional-requirements': 'requirements.functionalHighLevel',
    'non-functional-requirements': 'requirements.nonFunctional',
    'business-rules': 'requirements.businessRules',
    'acceptance-criteria': 'acceptanceCriteria',
    'identified-risks': 'riskAssessment.risks',
    'risk-mitigations': 'riskAssessment.mitigations',
    'project-dependencies': 'riskAssessment.dependencies',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'stakeholderAnalysis.communicationPlan': 'Communication plan to be defined during project initiation',
    'appendices.glossary': 'Glossary of terms to be maintained throughout the project lifecycle',
    'appendices.references': 'References to be compiled as requirements are gathered',
  },
};
