/**
 * Functional Requirements Document Template
 * Category: BA
 *
 * This template defines the structure for generating detailed Functional Requirements
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface FunctionalRequirementsData {
  introduction: {
    purpose: string;
    scope: string;
    definitions: Definition[];
  };
  systemOverview: {
    contextDiagram: string;
    actors: Actor[];
    interfaces: SystemInterface[];
  };
  functionalRequirements: {
    userManagement: FunctionalRequirement[];
    coreFeatures: FunctionalRequirement[];
    reporting: FunctionalRequirement[];
    admin: FunctionalRequirement[];
  };
  nonFunctionalRequirements: {
    performance: NFRequirement[];
    security: NFRequirement[];
    availability: NFRequirement[];
    scalability: NFRequirement[];
  };
  dataRequirements: {
    dataModel: string;
    validation: ValidationRule[];
    migration: string;
  };
  interfaceRequirements: {
    ui: UIRequirement[];
    api: APIRequirement[];
    externalSystems: ExternalSystemRequirement[];
  };
  testingRequirements: {
    testStrategy: string;
    acceptanceCriteria: AcceptanceCriterion[];
  };
  appendices: {
    supportingDocuments: string[];
    wireframes: string;
    dataModels: string;
  };
}

interface Definition {
  term: string;
  description: string;
}

interface Actor {
  name: string;
  description: string;
  type: 'PRIMARY' | 'SECONDARY' | 'EXTERNAL';
}

interface SystemInterface {
  name: string;
  description: string;
  type: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
  protocol: string;
}

interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  acceptanceCriteria: string[];
  dependencies: string[];
}

interface NFRequirement {
  id: string;
  description: string;
  metric: string;
  target: string;
  measurementMethod: string;
}

interface ValidationRule {
  field: string;
  rule: string;
  errorMessage: string;
}

interface UIRequirement {
  id: string;
  screen: string;
  description: string;
  interactions: string[];
}

interface APIRequirement {
  id: string;
  endpoint: string;
  method: string;
  description: string;
  requestFormat: string;
  responseFormat: string;
}

interface ExternalSystemRequirement {
  id: string;
  system: string;
  integrationMethod: string;
  dataExchanged: string;
  frequency: string;
}

interface AcceptanceCriterion {
  id: string;
  requirementId: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/**
 * Template configuration for Functional Requirements Document
 */
export const FUNCTIONAL_REQUIREMENTS_TEMPLATE = {
  slug: 'functional-requirements',
  name: 'Functional Requirements Document',
  category: DocumentCategory.BA,
  description:
    'Detailed functional requirements document covering system overview, functional and non-functional requirements, data models, interfaces, and testing strategy',
  estimatedPages: 20,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'introduction.purpose',
    'introduction.scope',
    'systemOverview.actors',
    'functionalRequirements.coreFeatures',
    'nonFunctionalRequirements.performance',
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
      id: 'introduction',
      title: 'Introduction',
      required: true,
      subsections: [
        {
          id: 'purpose',
          title: 'Purpose',
          contentPath: 'introduction.purpose',
        },
        {
          id: 'scope',
          title: 'Scope',
          contentPath: 'introduction.scope',
        },
        {
          id: 'definitions',
          title: 'Definitions & Acronyms',
          contentPath: 'introduction.definitions',
        },
      ],
    },
    {
      id: 'system_overview',
      title: 'System Overview',
      required: true,
      subsections: [
        {
          id: 'context_diagram',
          title: 'Context Diagram',
          contentPath: 'systemOverview.contextDiagram',
        },
        {
          id: 'actors',
          title: 'Actors',
          contentPath: 'systemOverview.actors',
        },
        {
          id: 'interfaces',
          title: 'System Interfaces',
          contentPath: 'systemOverview.interfaces',
        },
      ],
    },
    {
      id: 'functional_requirements',
      title: 'Functional Requirements',
      required: true,
      subsections: [
        {
          id: 'user_management',
          title: 'User Management',
          contentPath: 'functionalRequirements.userManagement',
        },
        {
          id: 'core_features',
          title: 'Core Features',
          contentPath: 'functionalRequirements.coreFeatures',
        },
        {
          id: 'reporting',
          title: 'Reporting & Analytics',
          contentPath: 'functionalRequirements.reporting',
        },
        {
          id: 'admin',
          title: 'Administration',
          contentPath: 'functionalRequirements.admin',
        },
      ],
    },
    {
      id: 'non_functional_requirements',
      title: 'Non-Functional Requirements',
      required: true,
      subsections: [
        {
          id: 'performance',
          title: 'Performance',
          contentPath: 'nonFunctionalRequirements.performance',
        },
        {
          id: 'security',
          title: 'Security',
          contentPath: 'nonFunctionalRequirements.security',
        },
        {
          id: 'availability',
          title: 'Availability',
          contentPath: 'nonFunctionalRequirements.availability',
        },
        {
          id: 'scalability',
          title: 'Scalability',
          contentPath: 'nonFunctionalRequirements.scalability',
        },
      ],
    },
    {
      id: 'data_requirements',
      title: 'Data Requirements',
      required: true,
      subsections: [
        {
          id: 'data_model',
          title: 'Data Model',
          contentPath: 'dataRequirements.dataModel',
        },
        {
          id: 'validation',
          title: 'Data Validation Rules',
          contentPath: 'dataRequirements.validation',
        },
        {
          id: 'migration',
          title: 'Data Migration',
          contentPath: 'dataRequirements.migration',
        },
      ],
    },
    {
      id: 'interface_requirements',
      title: 'Interface Requirements',
      required: true,
      subsections: [
        {
          id: 'ui',
          title: 'User Interface',
          contentPath: 'interfaceRequirements.ui',
        },
        {
          id: 'api',
          title: 'API Interfaces',
          contentPath: 'interfaceRequirements.api',
        },
        {
          id: 'external_systems',
          title: 'External Systems',
          contentPath: 'interfaceRequirements.externalSystems',
        },
      ],
    },
    {
      id: 'testing_requirements',
      title: 'Testing Requirements',
      required: true,
      subsections: [
        {
          id: 'test_strategy',
          title: 'Test Strategy',
          contentPath: 'testingRequirements.testStrategy',
        },
        {
          id: 'acceptance_criteria',
          title: 'Acceptance Criteria',
          contentPath: 'testingRequirements.acceptanceCriteria',
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
          id: 'wireframes',
          title: 'Wireframes',
          contentPath: 'appendices.wireframes',
        },
        {
          id: 'data_models',
          title: 'Data Models',
          contentPath: 'appendices.dataModels',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'document-purpose': 'introduction.purpose',
    'project-scope': 'introduction.scope',
    'system-context': 'systemOverview.contextDiagram',
    'system-actors': 'systemOverview.actors',
    'system-interfaces': 'systemOverview.interfaces',
    'user-management-requirements': 'functionalRequirements.userManagement',
    'core-feature-requirements': 'functionalRequirements.coreFeatures',
    'reporting-requirements': 'functionalRequirements.reporting',
    'admin-requirements': 'functionalRequirements.admin',
    'performance-requirements': 'nonFunctionalRequirements.performance',
    'security-requirements': 'nonFunctionalRequirements.security',
    'availability-requirements': 'nonFunctionalRequirements.availability',
    'scalability-requirements': 'nonFunctionalRequirements.scalability',
    'data-model-description': 'dataRequirements.dataModel',
    'data-validation-rules': 'dataRequirements.validation',
    'data-migration-plan': 'dataRequirements.migration',
    'ui-requirements': 'interfaceRequirements.ui',
    'api-requirements': 'interfaceRequirements.api',
    'external-system-integrations': 'interfaceRequirements.externalSystems',
    'test-strategy': 'testingRequirements.testStrategy',
    'acceptance-criteria': 'testingRequirements.acceptanceCriteria',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'dataRequirements.migration': 'Data migration strategy to be defined during design phase',
    'testingRequirements.testStrategy': 'Test strategy to follow organizational QA standards',
    'appendices.wireframes': 'Wireframes to be developed during UX design phase',
    'appendices.dataModels': 'Detailed data models to be finalized during technical design',
  },
};
