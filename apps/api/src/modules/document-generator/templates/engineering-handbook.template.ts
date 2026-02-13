/**
 * Engineering Handbook Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Engineering Handbook documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface EngineeringHandbookData {
  organization: {
    name: string;
    industry: string;
    teamSize: string;
  };
  introduction: {
    purpose: string;
    audience: string;
    howToUse: string;
  };
  developmentStandards: {
    codingStyle: CodingStyleGuide;
    codeReview: CodeReviewProcess;
    branchingStrategy: BranchingStrategy;
  };
  architecturePrinciples: {
    designPatterns: string[];
    apiStandards: ApiStandard;
    databaseConventions: DatabaseConvention;
  };
  testingStrategy: {
    unit: TestingLevel;
    integration: TestingLevel;
    e2e: TestingLevel;
    coverageTargets: CoverageTarget[];
  };
  devopsCiCd: {
    pipelineConfig: string;
    deployment: DeploymentProcess;
    monitoring: MonitoringSetup;
  };
  onCallAndSupport: {
    rotation: OnCallRotation;
    runbooks: Runbook[];
    escalation: EscalationProcedure[];
  };
  securityPractices: {
    secureCoding: string[];
    dependencyManagement: string;
    secretsHandling: string;
  };
  onboardingGuide: {
    setup: SetupStep[];
    firstPr: string;
    resources: Resource[];
  };
}

interface CodingStyleGuide {
  language: string;
  linter: string;
  formatter: string;
  conventions: string[];
}

interface CodeReviewProcess {
  requiredApprovals: number;
  reviewChecklist: string[];
  turnaroundTime: string;
  guidelines: string[];
}

interface BranchingStrategy {
  model: string;
  mainBranch: string;
  namingConvention: string;
  mergeStrategy: string;
  releaseBranches: boolean;
}

interface ApiStandard {
  style: string;
  versioning: string;
  authentication: string;
  documentation: string;
  errorHandling: string;
}

interface DatabaseConvention {
  namingConvention: string;
  migrationTool: string;
  indexingGuidelines: string;
  queryOptimization: string;
}

interface TestingLevel {
  framework: string;
  requirements: string;
  bestPractices: string[];
}

interface CoverageTarget {
  type: string;
  minimum: number;
  target: number;
}

interface DeploymentProcess {
  strategy: string;
  environments: string[];
  rollbackProcedure: string;
  approvalProcess: string;
}

interface MonitoringSetup {
  tools: string[];
  alerting: string;
  dashboards: string[];
  logging: string;
}

interface OnCallRotation {
  schedule: string;
  teamSize: number;
  handoffProcedure: string;
  compensation: string;
}

interface Runbook {
  title: string;
  scenario: string;
  steps: string[];
  escalationCriteria: string;
}

interface EscalationProcedure {
  level: number;
  criteria: string;
  contact: string;
  responseTime: string;
}

interface SetupStep {
  order: number;
  title: string;
  description: string;
  commands: string[];
}

interface Resource {
  name: string;
  type: string;
  url: string;
  description: string;
}

/**
 * Template configuration for Engineering Handbook
 */
export const ENGINEERING_HANDBOOK_TEMPLATE = {
  slug: 'engineering-handbook',
  name: 'Engineering Handbook',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive engineering handbook covering development standards, architecture principles, testing strategy, DevOps practices, and team onboarding',
  estimatedPages: 20,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'developmentStandards.codingStyle',
    'developmentStandards.branchingStrategy',
    'testingStrategy.coverageTargets',
    'devopsCiCd.deployment',
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
          id: 'audience',
          title: 'Target Audience',
          contentPath: 'introduction.audience',
        },
        {
          id: 'how_to_use',
          title: 'How to Use This Handbook',
          contentPath: 'introduction.howToUse',
        },
      ],
    },
    {
      id: 'development_standards',
      title: 'Development Standards',
      required: true,
      subsections: [
        {
          id: 'coding_style',
          title: 'Coding Style Guide',
          contentPath: 'developmentStandards.codingStyle',
        },
        {
          id: 'code_review',
          title: 'Code Review Process',
          contentPath: 'developmentStandards.codeReview',
        },
        {
          id: 'branching_strategy',
          title: 'Branching Strategy',
          contentPath: 'developmentStandards.branchingStrategy',
        },
      ],
    },
    {
      id: 'architecture_principles',
      title: 'Architecture Principles',
      required: true,
      subsections: [
        {
          id: 'design_patterns',
          title: 'Design Patterns',
          contentPath: 'architecturePrinciples.designPatterns',
        },
        {
          id: 'api_standards',
          title: 'API Standards',
          contentPath: 'architecturePrinciples.apiStandards',
        },
        {
          id: 'database_conventions',
          title: 'Database Conventions',
          contentPath: 'architecturePrinciples.databaseConventions',
        },
      ],
    },
    {
      id: 'testing_strategy',
      title: 'Testing Strategy',
      required: true,
      subsections: [
        {
          id: 'unit_testing',
          title: 'Unit Testing',
          contentPath: 'testingStrategy.unit',
        },
        {
          id: 'integration_testing',
          title: 'Integration Testing',
          contentPath: 'testingStrategy.integration',
        },
        {
          id: 'e2e_testing',
          title: 'End-to-End Testing',
          contentPath: 'testingStrategy.e2e',
        },
        {
          id: 'coverage_targets',
          title: 'Coverage Targets',
          contentPath: 'testingStrategy.coverageTargets',
        },
      ],
    },
    {
      id: 'devops_cicd',
      title: 'DevOps & CI/CD',
      required: true,
      subsections: [
        {
          id: 'pipeline_config',
          title: 'Pipeline Configuration',
          contentPath: 'devopsCiCd.pipelineConfig',
        },
        {
          id: 'deployment',
          title: 'Deployment Process',
          contentPath: 'devopsCiCd.deployment',
        },
        {
          id: 'monitoring',
          title: 'Monitoring & Observability',
          contentPath: 'devopsCiCd.monitoring',
        },
      ],
    },
    {
      id: 'on_call_and_support',
      title: 'On-Call & Support',
      required: true,
      subsections: [
        {
          id: 'rotation',
          title: 'On-Call Rotation',
          contentPath: 'onCallAndSupport.rotation',
        },
        {
          id: 'runbooks',
          title: 'Runbooks',
          contentPath: 'onCallAndSupport.runbooks',
        },
        {
          id: 'escalation',
          title: 'Escalation Procedures',
          contentPath: 'onCallAndSupport.escalation',
        },
      ],
    },
    {
      id: 'security_practices',
      title: 'Security Practices',
      required: true,
      subsections: [
        {
          id: 'secure_coding',
          title: 'Secure Coding Guidelines',
          contentPath: 'securityPractices.secureCoding',
        },
        {
          id: 'dependency_management',
          title: 'Dependency Management',
          contentPath: 'securityPractices.dependencyManagement',
        },
        {
          id: 'secrets_handling',
          title: 'Secrets Handling',
          contentPath: 'securityPractices.secretsHandling',
        },
      ],
    },
    {
      id: 'onboarding_guide',
      title: 'Onboarding Guide',
      required: true,
      subsections: [
        {
          id: 'setup',
          title: 'Development Environment Setup',
          contentPath: 'onboardingGuide.setup',
        },
        {
          id: 'first_pr',
          title: 'First Pull Request',
          contentPath: 'onboardingGuide.firstPr',
        },
        {
          id: 'resources',
          title: 'Learning Resources',
          contentPath: 'onboardingGuide.resources',
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
    'team-size': 'organization.teamSize',
    'handbook-purpose': 'introduction.purpose',
    'handbook-audience': 'introduction.audience',
    'coding-style': 'developmentStandards.codingStyle',
    'code-review-process': 'developmentStandards.codeReview',
    'branching-strategy': 'developmentStandards.branchingStrategy',
    'design-patterns': 'architecturePrinciples.designPatterns',
    'api-standards': 'architecturePrinciples.apiStandards',
    'database-conventions': 'architecturePrinciples.databaseConventions',
    'unit-testing': 'testingStrategy.unit',
    'integration-testing': 'testingStrategy.integration',
    'e2e-testing': 'testingStrategy.e2e',
    'coverage-targets': 'testingStrategy.coverageTargets',
    'pipeline-config': 'devopsCiCd.pipelineConfig',
    'deployment-process': 'devopsCiCd.deployment',
    'monitoring-setup': 'devopsCiCd.monitoring',
    'on-call-rotation': 'onCallAndSupport.rotation',
    'runbooks': 'onCallAndSupport.runbooks',
    'escalation-procedures': 'onCallAndSupport.escalation',
    'secure-coding': 'securityPractices.secureCoding',
    'dependency-management': 'securityPractices.dependencyManagement',
    'secrets-handling': 'securityPractices.secretsHandling',
    'dev-setup': 'onboardingGuide.setup',
    'first-pr-guide': 'onboardingGuide.firstPr',
    'learning-resources': 'onboardingGuide.resources',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'introduction.howToUse': 'This handbook serves as the definitive reference for engineering practices. Review relevant sections during onboarding and refer back as needed.',
    'securityPractices.dependencyManagement': 'All dependencies must be reviewed for known vulnerabilities before adoption. Automated scanning is required.',
    'securityPractices.secretsHandling': 'Secrets must never be committed to source control. Use a secrets management service for all credentials.',
    'onboardingGuide.firstPr': 'New engineers should submit their first pull request within the first week, ideally a small bug fix or documentation improvement.',
  },
};
