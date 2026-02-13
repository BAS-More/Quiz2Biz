/**
 * Disaster Recovery Plan Document Template
 * Category: CTO
 *
 * This template defines the structure for generating Disaster Recovery Plan documents
 * from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface DisasterRecoveryPlanData {
  organization: {
    name: string;
    industry: string;
    size: string;
  };
  executiveSummary: {
    purpose: string;
    scope: string;
    objectives: string[];
  };
  riskAssessment: {
    threatAnalysis: ThreatEntry[];
    impactAssessment: ImpactEntry[];
    vulnerabilities: string[];
  };
  businessImpact: {
    criticalSystems: CriticalSystem[];
    rtoRpo: RtoRpoTarget[];
    dependencies: SystemDependency[];
  };
  recoveryStrategy: {
    backupStrategy: BackupStrategy;
    failoverProcedures: string[];
    alternativeSites: AlternativeSite[];
  };
  recoveryProcedures: {
    stepByStep: RecoveryStep[];
    systemPriority: PrioritizedSystem[];
    dataRestoration: string[];
  };
  testingAndMaintenance: {
    testSchedule: TestScheduleEntry[];
    testTypes: string[];
    planUpdates: string[];
  };
  communication: {
    stakeholders: StakeholderContact[];
    escalation: EscalationLevel[];
    media: string[];
  };
}

interface ThreatEntry {
  threat: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigations: string[];
}

interface ImpactEntry {
  scenario: string;
  affectedSystems: string[];
  businessImpact: string;
  financialImpact: string;
}

interface CriticalSystem {
  name: string;
  description: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owner: string;
}

interface RtoRpoTarget {
  system: string;
  rto: string;
  rpo: string;
  tier: number;
}

interface SystemDependency {
  system: string;
  dependsOn: string[];
  dependedOnBy: string[];
}

interface BackupStrategy {
  type: string;
  frequency: string;
  retention: string;
  location: string;
  encryption: boolean;
}

interface AlternativeSite {
  type: 'HOT' | 'WARM' | 'COLD';
  location: string;
  capacity: string;
  activationTime: string;
}

interface RecoveryStep {
  order: number;
  action: string;
  responsible: string;
  estimatedDuration: string;
  dependencies: string[];
}

interface PrioritizedSystem {
  system: string;
  priority: number;
  recoveryOrder: number;
  estimatedRecoveryTime: string;
}

interface TestScheduleEntry {
  testType: string;
  frequency: string;
  lastTested: string;
  nextTest: string;
}

interface StakeholderContact {
  name: string;
  role: string;
  contactInfo: string;
  notificationPriority: number;
}

interface EscalationLevel {
  level: number;
  description: string;
  triggerCriteria: string;
  contactPerson: string;
  responseTime: string;
}

/**
 * Template configuration for Disaster Recovery Plan
 */
export const DISASTER_RECOVERY_PLAN_TEMPLATE = {
  slug: 'disaster-recovery-plan',
  name: 'Disaster Recovery Plan',
  category: DocumentCategory.CTO,
  description:
    'Comprehensive disaster recovery plan covering risk assessment, business impact analysis, recovery strategies, and testing procedures',
  estimatedPages: 15,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'organization.name',
    'riskAssessment.threatAnalysis',
    'businessImpact.criticalSystems',
    'businessImpact.rtoRpo',
    'recoveryStrategy.backupStrategy',
    'recoveryProcedures.stepByStep',
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
      id: 'risk_assessment',
      title: 'Risk Assessment',
      required: true,
      subsections: [
        {
          id: 'threat_analysis',
          title: 'Threat Analysis',
          contentPath: 'riskAssessment.threatAnalysis',
        },
        {
          id: 'impact_assessment',
          title: 'Impact Assessment',
          contentPath: 'riskAssessment.impactAssessment',
        },
        {
          id: 'vulnerabilities',
          title: 'Vulnerabilities',
          contentPath: 'riskAssessment.vulnerabilities',
        },
      ],
    },
    {
      id: 'business_impact',
      title: 'Business Impact Analysis',
      required: true,
      subsections: [
        {
          id: 'critical_systems',
          title: 'Critical Systems',
          contentPath: 'businessImpact.criticalSystems',
        },
        {
          id: 'rto_rpo',
          title: 'RTO/RPO Targets',
          contentPath: 'businessImpact.rtoRpo',
        },
        {
          id: 'dependencies',
          title: 'System Dependencies',
          contentPath: 'businessImpact.dependencies',
        },
      ],
    },
    {
      id: 'recovery_strategy',
      title: 'Recovery Strategy',
      required: true,
      subsections: [
        {
          id: 'backup_strategy',
          title: 'Backup Strategy',
          contentPath: 'recoveryStrategy.backupStrategy',
        },
        {
          id: 'failover_procedures',
          title: 'Failover Procedures',
          contentPath: 'recoveryStrategy.failoverProcedures',
        },
        {
          id: 'alternative_sites',
          title: 'Alternative Sites',
          contentPath: 'recoveryStrategy.alternativeSites',
        },
      ],
    },
    {
      id: 'recovery_procedures',
      title: 'Recovery Procedures',
      required: true,
      subsections: [
        {
          id: 'step_by_step',
          title: 'Step-by-Step Recovery',
          contentPath: 'recoveryProcedures.stepByStep',
        },
        {
          id: 'system_priority',
          title: 'System Recovery Priority',
          contentPath: 'recoveryProcedures.systemPriority',
        },
        {
          id: 'data_restoration',
          title: 'Data Restoration',
          contentPath: 'recoveryProcedures.dataRestoration',
        },
      ],
    },
    {
      id: 'testing_and_maintenance',
      title: 'Testing & Maintenance',
      required: true,
      subsections: [
        {
          id: 'test_schedule',
          title: 'Test Schedule',
          contentPath: 'testingAndMaintenance.testSchedule',
        },
        {
          id: 'test_types',
          title: 'Test Types',
          contentPath: 'testingAndMaintenance.testTypes',
        },
        {
          id: 'plan_updates',
          title: 'Plan Updates & Maintenance',
          contentPath: 'testingAndMaintenance.planUpdates',
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
          title: 'Stakeholder Contacts',
          contentPath: 'communication.stakeholders',
        },
        {
          id: 'escalation',
          title: 'Escalation Procedures',
          contentPath: 'communication.escalation',
        },
        {
          id: 'media',
          title: 'Media Communication',
          contentPath: 'communication.media',
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
    'threat-analysis': 'riskAssessment.threatAnalysis',
    'impact-assessment': 'riskAssessment.impactAssessment',
    'vulnerabilities': 'riskAssessment.vulnerabilities',
    'critical-systems': 'businessImpact.criticalSystems',
    'rto-rpo-targets': 'businessImpact.rtoRpo',
    'system-dependencies': 'businessImpact.dependencies',
    'backup-strategy': 'recoveryStrategy.backupStrategy',
    'failover-procedures': 'recoveryStrategy.failoverProcedures',
    'alternative-sites': 'recoveryStrategy.alternativeSites',
    'recovery-steps': 'recoveryProcedures.stepByStep',
    'system-priority': 'recoveryProcedures.systemPriority',
    'data-restoration': 'recoveryProcedures.dataRestoration',
    'test-schedule': 'testingAndMaintenance.testSchedule',
    'test-types': 'testingAndMaintenance.testTypes',
    'plan-updates': 'testingAndMaintenance.planUpdates',
    'stakeholder-contacts': 'communication.stakeholders',
    'escalation-procedures': 'communication.escalation',
    'media-communication': 'communication.media',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'testingAndMaintenance.testTypes': ['Tabletop exercise', 'Walkthrough test', 'Simulation test', 'Full interruption test'],
    'testingAndMaintenance.planUpdates': ['Review and update annually', 'Update after any major incident', 'Update after significant infrastructure changes'],
    'communication.media': ['All media inquiries directed to designated spokesperson', 'No unauthorized public statements'],
  },
};
