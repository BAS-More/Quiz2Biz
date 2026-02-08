/**
 * User Stories/Use Cases Document Template
 * Category: BA
 *
 * This template defines the structure for generating User Stories and Use Case
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface UserStoriesData {
  overview: string;
  userPersonas: {
    roles: UserPersona[];
    goals: PersonaGoal[];
    contexts: UsageContext[];
  };
  epicOverview: {
    themes: Theme[];
    epics: Epic[];
    dependencies: EpicDependency[];
  };
  userStories: {
    storyCards: StoryCard[];
  };
  useCases: {
    cases: UseCase[];
  };
  nonFunctionalStories: {
    performance: NFStory[];
    security: NFStory[];
    usability: NFStory[];
  };
  storyMap: {
    releasePlanning: Release[];
    mvpScope: MVPScope;
  };
  appendices: {
    supportingDocuments: string[];
    personaResearch: string;
    prioritizationMatrix: string;
  };
}

interface UserPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  demographics: string;
  technicalProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  painPoints: string[];
  needs: string[];
}

interface PersonaGoal {
  personaId: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  frequency: string;
}

interface UsageContext {
  personaId: string;
  environment: string;
  device: string;
  constraints: string[];
}

interface Theme {
  id: string;
  name: string;
  description: string;
  businessValue: string;
}

interface Epic {
  id: string;
  themeId: string;
  title: string;
  description: string;
  businessValue: string;
  estimatedSize: 'XL' | 'L' | 'M' | 'S';
  storyCount: number;
}

interface EpicDependency {
  epicId: string;
  dependsOnEpicId: string;
  type: 'BLOCKS' | 'RELATES_TO' | 'REQUIRED_BY';
  description: string;
}

interface StoryCard {
  id: string;
  epicId: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  storyPoints: number;
  notes: string;
}

interface UseCase {
  id: string;
  title: string;
  actors: string[];
  preconditions: string[];
  mainFlow: UseCaseStep[];
  alternateFlows: AlternateFlow[];
  postconditions: string[];
  businessRules: string[];
}

interface UseCaseStep {
  stepNumber: number;
  actor: string;
  action: string;
}

interface AlternateFlow {
  id: string;
  name: string;
  branchesFromStep: number;
  steps: UseCaseStep[];
  condition: string;
}

interface NFStory {
  id: string;
  category: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  metric: string;
  target: string;
}

interface Release {
  id: string;
  name: string;
  targetDate: string;
  themes: string[];
  epicIds: string[];
  storyIds: string[];
  description: string;
}

interface MVPScope {
  description: string;
  includedEpics: string[];
  includedStories: string[];
  excludedItems: string[];
  rationale: string;
}

/**
 * Template configuration for User Stories/Use Cases
 */
export const USER_STORIES_TEMPLATE = {
  slug: 'user-stories',
  name: 'User Stories/Use Cases',
  category: DocumentCategory.BA,
  description:
    'Comprehensive user stories and use cases document covering personas, epics, story cards with acceptance criteria, use case flows, and release planning',
  estimatedPages: 18,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'userPersonas.roles',
    'epicOverview.epics',
    'userStories.storyCards',
    'storyMap.mvpScope',
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
      contentPath: 'overview',
    },
    {
      id: 'user_personas',
      title: 'User Personas',
      required: true,
      subsections: [
        {
          id: 'roles',
          title: 'Roles',
          contentPath: 'userPersonas.roles',
        },
        {
          id: 'goals',
          title: 'Goals',
          contentPath: 'userPersonas.goals',
        },
        {
          id: 'contexts',
          title: 'Usage Contexts',
          contentPath: 'userPersonas.contexts',
        },
      ],
    },
    {
      id: 'epic_overview',
      title: 'Epic Overview',
      required: true,
      subsections: [
        {
          id: 'themes',
          title: 'Themes',
          contentPath: 'epicOverview.themes',
        },
        {
          id: 'epics',
          title: 'Epics',
          contentPath: 'epicOverview.epics',
        },
        {
          id: 'epic_dependencies',
          title: 'Dependencies',
          contentPath: 'epicOverview.dependencies',
        },
      ],
    },
    {
      id: 'user_stories',
      title: 'User Stories',
      required: true,
      subsections: [
        {
          id: 'story_cards',
          title: 'Story Cards',
          contentPath: 'userStories.storyCards',
        },
      ],
    },
    {
      id: 'use_cases',
      title: 'Use Cases',
      required: true,
      subsections: [
        {
          id: 'cases',
          title: 'Use Case Specifications',
          contentPath: 'useCases.cases',
        },
      ],
    },
    {
      id: 'non_functional_stories',
      title: 'Non-Functional Stories',
      required: true,
      subsections: [
        {
          id: 'performance_stories',
          title: 'Performance Stories',
          contentPath: 'nonFunctionalStories.performance',
        },
        {
          id: 'security_stories',
          title: 'Security Stories',
          contentPath: 'nonFunctionalStories.security',
        },
        {
          id: 'usability_stories',
          title: 'Usability Stories',
          contentPath: 'nonFunctionalStories.usability',
        },
      ],
    },
    {
      id: 'story_map',
      title: 'Story Map',
      required: true,
      subsections: [
        {
          id: 'release_planning',
          title: 'Release Planning',
          contentPath: 'storyMap.releasePlanning',
        },
        {
          id: 'mvp_scope',
          title: 'MVP Scope',
          contentPath: 'storyMap.mvpScope',
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
          id: 'persona_research',
          title: 'Persona Research',
          contentPath: 'appendices.personaResearch',
        },
        {
          id: 'prioritization_matrix',
          title: 'Prioritization Matrix',
          contentPath: 'appendices.prioritizationMatrix',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'user-roles': 'userPersonas.roles',
    'user-goals': 'userPersonas.goals',
    'usage-contexts': 'userPersonas.contexts',
    'project-themes': 'epicOverview.themes',
    'epic-list': 'epicOverview.epics',
    'epic-dependencies': 'epicOverview.dependencies',
    'user-stories-list': 'userStories.storyCards',
    'use-case-list': 'useCases.cases',
    'performance-stories': 'nonFunctionalStories.performance',
    'security-stories': 'nonFunctionalStories.security',
    'usability-stories': 'nonFunctionalStories.usability',
    'release-plan': 'storyMap.releasePlanning',
    'mvp-scope': 'storyMap.mvpScope',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'appendices.personaResearch': 'Persona research to be gathered through user interviews and surveys',
    'appendices.prioritizationMatrix': 'MoSCoW prioritization method applied to all stories',
    'epicOverview.dependencies': '[]',
  },
};
