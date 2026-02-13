/**
 * User Flow/Journey Maps Document Template
 * Category: CTO
 *
 * This template defines the structure for generating User Flow and Journey Map
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface UserFlowMapsData {
  organization: {
    name: string;
    product: string;
  };
  userPersonas: {
    profiles: PersonaProfile[];
    goals: string[];
    painPoints: string[];
  };
  journeyMaps: {
    touchpoints: Touchpoint[];
    emotions: EmotionMapping[];
    opportunities: string[];
  };
  userFlows: {
    registration: FlowDefinition;
    coreWorkflows: FlowDefinition[];
    edgeCases: EdgeCase[];
  };
  wireframes: {
    keyScreens: ScreenDefinition[];
    navigation: NavigationStructure;
    responsiveDesign: string;
  };
  accessibility: {
    wcagCompliance: string;
    assistiveTech: string[];
  };
  userResearch: {
    findings: ResearchFinding[];
    recommendations: string[];
  };
}

interface PersonaProfile {
  name: string;
  role: string;
  demographics: string;
  behaviors: string[];
  needs: string[];
}

interface Touchpoint {
  stage: string;
  channel: string;
  action: string;
  expectation: string;
  satisfaction: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EmotionMapping {
  stage: string;
  emotion: string;
  intensity: number;
  trigger: string;
}

interface FlowDefinition {
  name: string;
  description: string;
  steps: FlowStep[];
  successCriteria: string;
}

interface FlowStep {
  order: number;
  action: string;
  screen: string;
  expectedOutcome: string;
}

interface EdgeCase {
  scenario: string;
  flow: string;
  handling: string;
}

interface ScreenDefinition {
  name: string;
  purpose: string;
  components: string[];
  interactions: string[];
}

interface NavigationStructure {
  type: string;
  hierarchy: string;
  patterns: string[];
}

interface ResearchFinding {
  method: string;
  finding: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

/**
 * Template configuration for User Flow/Journey Maps
 */
export const USER_FLOW_MAPS_TEMPLATE = {
  slug: 'user-flow-maps',
  name: 'User Flow/Journey Maps',
  category: DocumentCategory.CTO,
  description:
    'User experience documentation covering personas, journey maps, user flows, wireframes, and accessibility requirements',
  estimatedPages: 12,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'userPersonas.profiles',
    'journeyMaps.touchpoints',
    'userFlows.coreWorkflows',
    'wireframes.keyScreens',
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
          id: 'profiles',
          title: 'Persona Profiles',
          contentPath: 'userPersonas.profiles',
        },
        {
          id: 'goals',
          title: 'User Goals',
          contentPath: 'userPersonas.goals',
        },
        {
          id: 'pain_points',
          title: 'Pain Points',
          contentPath: 'userPersonas.painPoints',
        },
      ],
    },
    {
      id: 'journey_maps',
      title: 'Journey Maps',
      required: true,
      subsections: [
        {
          id: 'touchpoints',
          title: 'Touchpoints',
          contentPath: 'journeyMaps.touchpoints',
        },
        {
          id: 'emotions',
          title: 'Emotional Journey',
          contentPath: 'journeyMaps.emotions',
        },
        {
          id: 'opportunities',
          title: 'Opportunities',
          contentPath: 'journeyMaps.opportunities',
        },
      ],
    },
    {
      id: 'user_flows',
      title: 'User Flows',
      required: true,
      subsections: [
        {
          id: 'registration',
          title: 'Registration Flow',
          contentPath: 'userFlows.registration',
        },
        {
          id: 'core_workflows',
          title: 'Core Workflows',
          contentPath: 'userFlows.coreWorkflows',
        },
        {
          id: 'edge_cases',
          title: 'Edge Cases',
          contentPath: 'userFlows.edgeCases',
        },
      ],
    },
    {
      id: 'wireframes',
      title: 'Wireframes',
      required: true,
      subsections: [
        {
          id: 'key_screens',
          title: 'Key Screens',
          contentPath: 'wireframes.keyScreens',
        },
        {
          id: 'navigation',
          title: 'Navigation Structure',
          contentPath: 'wireframes.navigation',
        },
        {
          id: 'responsive_design',
          title: 'Responsive Design',
          contentPath: 'wireframes.responsiveDesign',
        },
      ],
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      required: true,
      subsections: [
        {
          id: 'wcag_compliance',
          title: 'WCAG Compliance',
          contentPath: 'accessibility.wcagCompliance',
        },
        {
          id: 'assistive_tech',
          title: 'Assistive Technology Support',
          contentPath: 'accessibility.assistiveTech',
        },
      ],
    },
    {
      id: 'user_research',
      title: 'User Research',
      required: false,
      subsections: [
        {
          id: 'findings',
          title: 'Research Findings',
          contentPath: 'userResearch.findings',
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          contentPath: 'userResearch.recommendations',
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
    'product-name': 'organization.product',
    'user-personas': 'userPersonas.profiles',
    'user-goals': 'userPersonas.goals',
    'user-pain-points': 'userPersonas.painPoints',
    'journey-touchpoints': 'journeyMaps.touchpoints',
    'emotional-journey': 'journeyMaps.emotions',
    'journey-opportunities': 'journeyMaps.opportunities',
    'registration-flow': 'userFlows.registration',
    'core-user-workflows': 'userFlows.coreWorkflows',
    'edge-case-scenarios': 'userFlows.edgeCases',
    'key-screens': 'wireframes.keyScreens',
    'navigation-structure': 'wireframes.navigation',
    'responsive-design-approach': 'wireframes.responsiveDesign',
    'wcag-compliance-level': 'accessibility.wcagCompliance',
    'assistive-technology-support': 'accessibility.assistiveTech',
    'research-findings': 'userResearch.findings',
    'ux-recommendations': 'userResearch.recommendations',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'accessibility.wcagCompliance': 'WCAG 2.1 Level AA compliance targeted',
    'wireframes.responsiveDesign': 'Mobile-first responsive design with breakpoints at 768px and 1024px',
    'userResearch.recommendations': ['Conduct usability testing with target personas', 'Iterate on flows based on analytics data'],
  },
};
