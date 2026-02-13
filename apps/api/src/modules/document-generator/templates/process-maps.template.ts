/**
 * Process Maps/Flowcharts Document Template
 * Category: BA
 *
 * This template defines the structure for generating Process Maps and Flowchart
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface ProcessMapsData {
  overview: string;
  currentState: {
    asIsProcesses: Process[];
    painPoints: PainPoint[];
    bottlenecks: Bottleneck[];
  };
  futureState: {
    toBeProcesses: Process[];
    improvements: Improvement[];
    automationOpportunities: AutomationOpportunity[];
  };
  processDetails: {
    triggers: Trigger[];
    inputs: ProcessInput[];
    steps: ProcessStep[];
    outputs: ProcessOutput[];
    exceptions: ProcessException[];
  };
  swimlaneDiagrams: {
    roles: SwimLaneRole[];
    handoffs: Handoff[];
    decisionPoints: DecisionPoint[];
  };
  integrationPoints: {
    systemInteractions: SystemInteraction[];
    dataFlows: DataFlow[];
  };
  metrics: {
    processKPIs: ProcessKPI[];
    cycleTimes: CycleTime[];
    efficiencyTargets: EfficiencyTarget[];
  };
  appendices: {
    supportingDocuments: string[];
    processNotation: string;
    glossary: string;
  };
}

interface Process {
  id: string;
  name: string;
  description: string;
  owner: string;
  frequency: string;
  steps: string[];
}

interface PainPoint {
  id: string;
  processId: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedStakeholders: string[];
}

interface Bottleneck {
  id: string;
  processId: string;
  description: string;
  cause: string;
  averageDelay: string;
}

interface Improvement {
  id: string;
  processId: string;
  description: string;
  expectedBenefit: string;
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AutomationOpportunity {
  id: string;
  processId: string;
  description: string;
  automationType: string;
  estimatedSavings: string;
}

interface Trigger {
  id: string;
  processId: string;
  description: string;
  type: 'EVENT' | 'SCHEDULE' | 'MANUAL' | 'CONDITION';
}

interface ProcessInput {
  id: string;
  name: string;
  source: string;
  format: string;
}

interface ProcessStep {
  id: string;
  name: string;
  description: string;
  responsible: string;
  duration: string;
  type: 'ACTION' | 'DECISION' | 'SUBPROCESS' | 'WAIT';
}

interface ProcessOutput {
  id: string;
  name: string;
  destination: string;
  format: string;
}

interface ProcessException {
  id: string;
  stepId: string;
  description: string;
  handlingProcedure: string;
}

interface SwimLaneRole {
  id: string;
  name: string;
  department: string;
  responsibilities: string[];
}

interface Handoff {
  id: string;
  fromRole: string;
  toRole: string;
  artifact: string;
  description: string;
}

interface DecisionPoint {
  id: string;
  description: string;
  criteria: string;
  outcomes: string[];
}

interface SystemInteraction {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  interactionType: string;
  description: string;
}

interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  frequency: string;
  volume: string;
}

interface ProcessKPI {
  name: string;
  description: string;
  target: string;
  currentValue: string;
  measurementMethod: string;
}

interface CycleTime {
  processId: string;
  processName: string;
  currentTime: string;
  targetTime: string;
  unit: string;
}

interface EfficiencyTarget {
  processId: string;
  metric: string;
  currentValue: string;
  targetValue: string;
  timeline: string;
}

/**
 * Template configuration for Process Maps/Flowcharts
 */
export const PROCESS_MAPS_TEMPLATE = {
  slug: 'process-maps',
  name: 'Process Maps/Flowcharts',
  category: DocumentCategory.BA,
  description:
    'Process mapping document covering current and future state processes, swimlane diagrams, integration points, and process metrics',
  estimatedPages: 12,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'currentState.asIsProcesses',
    'futureState.toBeProcesses',
    'processDetails.steps',
    'swimlaneDiagrams.roles',
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
      id: 'current_state',
      title: 'Current State',
      required: true,
      subsections: [
        {
          id: 'as_is_processes',
          title: 'As-Is Processes',
          contentPath: 'currentState.asIsProcesses',
        },
        {
          id: 'pain_points',
          title: 'Pain Points',
          contentPath: 'currentState.painPoints',
        },
        {
          id: 'bottlenecks',
          title: 'Bottlenecks',
          contentPath: 'currentState.bottlenecks',
        },
      ],
    },
    {
      id: 'future_state',
      title: 'Future State',
      required: true,
      subsections: [
        {
          id: 'to_be_processes',
          title: 'To-Be Processes',
          contentPath: 'futureState.toBeProcesses',
        },
        {
          id: 'improvements',
          title: 'Improvements',
          contentPath: 'futureState.improvements',
        },
        {
          id: 'automation',
          title: 'Automation Opportunities',
          contentPath: 'futureState.automationOpportunities',
        },
      ],
    },
    {
      id: 'process_details',
      title: 'Process Details',
      required: true,
      subsections: [
        {
          id: 'triggers',
          title: 'Triggers',
          contentPath: 'processDetails.triggers',
        },
        {
          id: 'inputs',
          title: 'Inputs',
          contentPath: 'processDetails.inputs',
        },
        {
          id: 'steps',
          title: 'Process Steps',
          contentPath: 'processDetails.steps',
        },
        {
          id: 'outputs',
          title: 'Outputs',
          contentPath: 'processDetails.outputs',
        },
        {
          id: 'exceptions',
          title: 'Exceptions',
          contentPath: 'processDetails.exceptions',
        },
      ],
    },
    {
      id: 'swimlane_diagrams',
      title: 'Swimlane Diagrams',
      required: true,
      subsections: [
        {
          id: 'roles',
          title: 'Roles',
          contentPath: 'swimlaneDiagrams.roles',
        },
        {
          id: 'handoffs',
          title: 'Handoffs',
          contentPath: 'swimlaneDiagrams.handoffs',
        },
        {
          id: 'decision_points',
          title: 'Decision Points',
          contentPath: 'swimlaneDiagrams.decisionPoints',
        },
      ],
    },
    {
      id: 'integration_points',
      title: 'Integration Points',
      required: true,
      subsections: [
        {
          id: 'system_interactions',
          title: 'System Interactions',
          contentPath: 'integrationPoints.systemInteractions',
        },
        {
          id: 'data_flows',
          title: 'Data Flows',
          contentPath: 'integrationPoints.dataFlows',
        },
      ],
    },
    {
      id: 'metrics',
      title: 'Metrics',
      required: true,
      subsections: [
        {
          id: 'process_kpis',
          title: 'Process KPIs',
          contentPath: 'metrics.processKPIs',
        },
        {
          id: 'cycle_times',
          title: 'Cycle Times',
          contentPath: 'metrics.cycleTimes',
        },
        {
          id: 'efficiency',
          title: 'Efficiency Targets',
          contentPath: 'metrics.efficiencyTargets',
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
          id: 'process_notation',
          title: 'Process Notation Guide',
          contentPath: 'appendices.processNotation',
        },
        {
          id: 'glossary',
          title: 'Glossary',
          contentPath: 'appendices.glossary',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'current-processes': 'currentState.asIsProcesses',
    'process-pain-points': 'currentState.painPoints',
    'process-bottlenecks': 'currentState.bottlenecks',
    'future-state-processes': 'futureState.toBeProcesses',
    'process-improvements': 'futureState.improvements',
    'automation-opportunities': 'futureState.automationOpportunities',
    'process-triggers': 'processDetails.triggers',
    'process-inputs': 'processDetails.inputs',
    'process-steps': 'processDetails.steps',
    'process-outputs': 'processDetails.outputs',
    'process-exceptions': 'processDetails.exceptions',
    'process-roles': 'swimlaneDiagrams.roles',
    'process-handoffs': 'swimlaneDiagrams.handoffs',
    'decision-points': 'swimlaneDiagrams.decisionPoints',
    'system-interactions': 'integrationPoints.systemInteractions',
    'data-flows': 'integrationPoints.dataFlows',
    'process-kpis': 'metrics.processKPIs',
    'cycle-times': 'metrics.cycleTimes',
    'efficiency-targets': 'metrics.efficiencyTargets',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'appendices.processNotation': 'BPMN 2.0 notation used for all process diagrams',
    'appendices.glossary': 'Process terminology glossary to be maintained by process owner',
  },
};
