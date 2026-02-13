/**
 * Technology Roadmap Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Technology Roadmap documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface TechnologyRoadmapData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  currentState: {
    techStack: string[];
    infrastructure: string;
    painPoints: string[];
    technicalDebt: string;
  };
  futureState: {
    businessGoals: string[];
    techVision: string;
    targetArchitecture: string;
    scalabilityRequirements: string;
  };
  initiatives: {
    shortTerm: TechInitiative[];
    mediumTerm: TechInitiative[];
    longTerm: TechInitiative[];
  };
  resources: {
    budget: string;
    teamCapacity: string;
    skillGaps: string[];
    trainingNeeds: string[];
  };
  riskAssessment: {
    technicalRisks: Risk[];
    mitigationStrategies: string[];
  };
  timeline: {
    phases: RoadmapPhase[];
    milestones: Milestone[];
  };
}

interface TechInitiative {
  name: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedEffort: string;
  expectedBenefit: string;
}

interface Risk {
  description: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RoadmapPhase {
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
}

interface Milestone {
  name: string;
  targetDate: string;
  criteria: string[];
}

/**
 * Template configuration for Technology Roadmap
 */
export const TECHNOLOGY_ROADMAP_TEMPLATE = {
  slug: 'technology-roadmap',
  name: 'Technology Roadmap',
  category: DocumentCategory.CTO,
  description:
    'Strategic technology planning document outlining current state, future vision, and implementation roadmap',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'currentState.techStack',
    'futureState.businessGoals',
    'initiatives.shortTerm',
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
      id: 'current_state',
      title: 'Current State Assessment',
      required: true,
      subsections: [
        {
          id: 'tech_stack',
          title: 'Current Technology Stack',
          contentPath: 'currentState.techStack',
        },
        {
          id: 'infrastructure',
          title: 'Infrastructure Overview',
          contentPath: 'currentState.infrastructure',
        },
        {
          id: 'pain_points',
          title: 'Pain Points & Challenges',
          contentPath: 'currentState.painPoints',
        },
        {
          id: 'technical_debt',
          title: 'Technical Debt Analysis',
          contentPath: 'currentState.technicalDebt',
        },
      ],
    },
    {
      id: 'future_vision',
      title: 'Future State Vision',
      required: true,
      subsections: [
        {
          id: 'business_goals',
          title: 'Business Goals Alignment',
          contentPath: 'futureState.businessGoals',
        },
        { id: 'tech_vision', title: 'Technology Vision', contentPath: 'futureState.techVision' },
        {
          id: 'target_architecture',
          title: 'Target Architecture',
          contentPath: 'futureState.targetArchitecture',
        },
        {
          id: 'scalability',
          title: 'Scalability Requirements',
          contentPath: 'futureState.scalabilityRequirements',
        },
      ],
    },
    {
      id: 'roadmap_initiatives',
      title: 'Strategic Initiatives',
      required: true,
      subsections: [
        {
          id: 'short_term',
          title: 'Short-Term (0-6 months)',
          contentPath: 'initiatives.shortTerm',
        },
        {
          id: 'medium_term',
          title: 'Medium-Term (6-18 months)',
          contentPath: 'initiatives.mediumTerm',
        },
        { id: 'long_term', title: 'Long-Term (18-36 months)', contentPath: 'initiatives.longTerm' },
      ],
    },
    {
      id: 'resources',
      title: 'Resource Planning',
      required: true,
      subsections: [
        { id: 'budget', title: 'Budget Allocation', contentPath: 'resources.budget' },
        { id: 'team_capacity', title: 'Team Capacity', contentPath: 'resources.teamCapacity' },
        { id: 'skill_gaps', title: 'Skill Gap Analysis', contentPath: 'resources.skillGaps' },
        { id: 'training', title: 'Training Requirements', contentPath: 'resources.trainingNeeds' },
      ],
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      required: true,
      subsections: [
        {
          id: 'technical_risks',
          title: 'Technical Risks',
          contentPath: 'riskAssessment.technicalRisks',
        },
        {
          id: 'mitigation',
          title: 'Mitigation Strategies',
          contentPath: 'riskAssessment.mitigationStrategies',
        },
      ],
    },
    {
      id: 'timeline',
      title: 'Implementation Timeline',
      required: true,
      subsections: [
        { id: 'phases', title: 'Project Phases', contentPath: 'timeline.phases' },
        { id: 'milestones', title: 'Key Milestones', contentPath: 'timeline.milestones' },
      ],
    },
    {
      id: 'engineering_standards',
      title: 'Engineering Standards',
      required: false,
      includeStandards: true,
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
    'current-tech-stack': 'currentState.techStack',
    'current-infrastructure': 'currentState.infrastructure',
    'current-pain-points': 'currentState.painPoints',
    'technical-debt-level': 'currentState.technicalDebt',
    'business-goals': 'futureState.businessGoals',
    'technology-vision': 'futureState.techVision',
    'target-architecture': 'futureState.targetArchitecture',
    'scalability-requirements': 'futureState.scalabilityRequirements',
    'short-term-initiatives': 'initiatives.shortTerm',
    'medium-term-initiatives': 'initiatives.mediumTerm',
    'long-term-initiatives': 'initiatives.longTerm',
    'technology-budget': 'resources.budget',
    'team-capacity': 'resources.teamCapacity',
    'skill-gaps': 'resources.skillGaps',
    'training-needs': 'resources.trainingNeeds',
    'technical-risks': 'riskAssessment.technicalRisks',
    'risk-mitigation': 'riskAssessment.mitigationStrategies',
    'implementation-phases': 'timeline.phases',
    'key-milestones': 'timeline.milestones',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'resources.budget': 'To be determined',
    'riskAssessment.mitigationStrategies': ['Regular risk reviews', 'Contingency planning'],
  },
};
