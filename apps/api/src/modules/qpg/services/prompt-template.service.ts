/**
 * Prompt Template Service
 * Manages prompt templates for all 11 readiness dimensions
 */
import { Injectable, Logger } from '@nestjs/common';
import { PromptTemplate, EvidenceType } from '../types';

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);

  /**
   * In-memory template store (can be moved to database later)
   */
  private readonly templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Get template for a specific dimension
   */
  async getTemplateForDimension(dimensionKey: string): Promise<PromptTemplate | null> {
    return this.templates.get(dimensionKey) || null;
  }

  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * Initialize default templates for all 11 dimensions
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      // Architecture & Security (weight: 0.15)
      {
        id: 'tpl-arch-sec',
        dimensionKey: 'arch_sec',
        version: '1.0.0',
        goalTemplate:
          'Implement {{bestPractice}} to address the security/architecture gap in {{dimensionName}}',
        taskTemplates: [
          {
            order: 1,
            template: 'Review current {{dimensionName}} implementation against {{standardRefs}}',
          },
          { order: 2, template: 'Design solution architecture following {{bestPractice}}' },
          { order: 3, template: 'Implement security controls as specified' },
          { order: 4, template: 'Create architecture documentation with C4 diagrams' },
          { order: 5, template: 'Conduct security review and threat modeling' },
        ],
        defaultAcceptanceCriteria: [
          'All OWASP Top 10 vulnerabilities addressed',
          'Architecture diagram updated and reviewed',
          'Security controls documented and tested',
          'Penetration testing passed with no HIGH/CRITICAL findings',
        ],
        defaultConstraints: [
          'Must comply with {{standardRefs}} requirements',
          'Must not introduce breaking changes to existing APIs',
          'Must maintain backward compatibility',
        ],
        defaultDeliverables: [
          'Updated architecture documentation',
          'Security control implementation',
          'Test reports and evidence',
          'Threat model document',
        ],
        evidenceType: EvidenceType.ARCHITECTURE_DIAGRAM,
        baseEffortHours: 16,
      },

      // DevOps & Infrastructure (weight: 0.12)
      {
        id: 'tpl-devops-iac',
        dimensionKey: 'devops_iac',
        version: '1.0.0',
        goalTemplate: 'Establish {{bestPractice}} for DevOps and infrastructure automation',
        taskTemplates: [
          { order: 1, template: 'Audit current CI/CD pipeline configuration' },
          { order: 2, template: 'Implement infrastructure as code using Terraform/Bicep' },
          { order: 3, template: 'Configure automated security scanning in pipeline' },
          { order: 4, template: 'Set up monitoring and alerting' },
          { order: 5, template: 'Document deployment procedures' },
        ],
        defaultAcceptanceCriteria: [
          'CI/CD pipeline passes all quality gates',
          'Infrastructure is version controlled',
          'Deployment is fully automated',
          'Monitoring dashboards operational',
        ],
        defaultConstraints: [
          'Must use approved cloud services only',
          'Must implement least-privilege access',
          'Must maintain audit logs',
        ],
        defaultDeliverables: [
          'Updated pipeline configuration',
          'IaC templates',
          'Runbook documentation',
          'Monitoring dashboard',
        ],
        evidenceType: EvidenceType.CONFIG,
        baseEffortHours: 12,
      },

      // Quality & Testing (weight: 0.10)
      {
        id: 'tpl-quality-test',
        dimensionKey: 'quality_test',
        version: '1.0.0',
        goalTemplate: 'Implement {{bestPractice}} to ensure software quality and testing coverage',
        taskTemplates: [
          { order: 1, template: 'Define testing strategy and coverage requirements' },
          { order: 2, template: 'Implement unit tests for critical business logic' },
          { order: 3, template: 'Create integration test suite' },
          { order: 4, template: 'Set up automated testing in CI/CD' },
          { order: 5, template: 'Document testing procedures and standards' },
        ],
        defaultAcceptanceCriteria: [
          'Code coverage >= 80%',
          'All critical paths have tests',
          'No HIGH/CRITICAL bugs in production',
          'Performance benchmarks met',
        ],
        defaultConstraints: [
          'Tests must run in < 10 minutes',
          'Must not affect production data',
          'Must be repeatable and deterministic',
        ],
        defaultDeliverables: [
          'Test suite implementation',
          'Coverage reports',
          'Testing documentation',
          'CI/CD integration',
        ],
        evidenceType: EvidenceType.TEST_REPORT,
        baseEffortHours: 10,
      },

      // Finance (weight: 0.10)
      {
        id: 'tpl-finance',
        dimensionKey: 'finance',
        version: '1.0.0',
        goalTemplate: 'Establish {{bestPractice}} for financial controls and unit economics',
        taskTemplates: [
          { order: 1, template: 'Document unit economics model' },
          { order: 2, template: 'Implement cost tracking and attribution' },
          { order: 3, template: 'Set up financial dashboards' },
          { order: 4, template: 'Create budget and forecast models' },
          { order: 5, template: 'Establish financial controls and approval workflows' },
        ],
        defaultAcceptanceCriteria: [
          'Unit economics clearly documented',
          'Cost attribution implemented',
          'Financial controls in place',
          'Monthly reporting operational',
        ],
        defaultConstraints: [
          'Must comply with accounting standards',
          'Must maintain audit trail',
          'Must integrate with existing systems',
        ],
        defaultDeliverables: [
          'Financial model documentation',
          'Cost tracking implementation',
          'Dashboard and reports',
          'Control procedures',
        ],
        evidenceType: EvidenceType.DOCUMENT,
        baseEffortHours: 8,
      },

      // Strategy (weight: 0.08)
      {
        id: 'tpl-strategy',
        dimensionKey: 'strategy',
        version: '1.0.0',
        goalTemplate: 'Define {{bestPractice}} for strategic alignment and vision',
        taskTemplates: [
          { order: 1, template: 'Document strategic vision and objectives' },
          { order: 2, template: 'Create OKR framework' },
          { order: 3, template: 'Align product roadmap with strategy' },
          { order: 4, template: 'Establish strategic review cadence' },
        ],
        defaultAcceptanceCriteria: [
          'Strategy document approved by stakeholders',
          'OKRs defined and measurable',
          'Roadmap aligned with strategy',
        ],
        defaultConstraints: [
          'Must align with company mission',
          'Must be achievable within resources',
        ],
        defaultDeliverables: ['Strategy document', 'OKR framework', 'Aligned roadmap'],
        evidenceType: EvidenceType.DOCUMENT,
        baseEffortHours: 6,
      },

      // Requirements (weight: 0.08)
      {
        id: 'tpl-requirements',
        dimensionKey: 'requirements',
        version: '1.0.0',
        goalTemplate: 'Implement {{bestPractice}} for requirements management',
        taskTemplates: [
          { order: 1, template: 'Document functional requirements' },
          { order: 2, template: 'Define acceptance criteria for each requirement' },
          { order: 3, template: 'Create requirements traceability matrix' },
          { order: 4, template: 'Establish change control process' },
        ],
        defaultAcceptanceCriteria: [
          'All requirements documented and approved',
          'Traceability matrix complete',
          'Change control process operational',
        ],
        defaultConstraints: ['Must follow standard templates', 'Must be version controlled'],
        defaultDeliverables: [
          'Requirements document',
          'Traceability matrix',
          'Change control procedures',
        ],
        evidenceType: EvidenceType.DOCUMENT,
        baseEffortHours: 6,
      },

      // Data & AI (weight: 0.08)
      {
        id: 'tpl-data-ai',
        dimensionKey: 'data_ai',
        version: '1.0.0',
        goalTemplate: 'Establish {{bestPractice}} for data governance and AI ethics',
        taskTemplates: [
          { order: 1, template: 'Document data classification scheme' },
          { order: 2, template: 'Implement data quality controls' },
          { order: 3, template: 'Create AI ethics guidelines' },
          { order: 4, template: 'Set up data lineage tracking' },
        ],
        defaultAcceptanceCriteria: [
          'Data classification implemented',
          'Quality metrics defined and tracked',
          'AI ethics guidelines documented',
        ],
        defaultConstraints: [
          'Must comply with data protection regulations',
          'Must maintain data integrity',
        ],
        defaultDeliverables: [
          'Data governance documentation',
          'Quality control implementation',
          'AI ethics policy',
        ],
        evidenceType: EvidenceType.POLICY,
        baseEffortHours: 8,
      },

      // Privacy & Legal (weight: 0.08)
      {
        id: 'tpl-privacy-legal',
        dimensionKey: 'privacy_legal',
        version: '1.0.0',
        goalTemplate: 'Implement {{bestPractice}} for privacy and legal compliance',
        taskTemplates: [
          { order: 1, template: 'Conduct privacy impact assessment' },
          { order: 2, template: 'Implement data subject rights workflows' },
          { order: 3, template: 'Create privacy policy and notices' },
          { order: 4, template: 'Document consent management' },
        ],
        defaultAcceptanceCriteria: [
          'Privacy impact assessment complete',
          'Data subject rights automated',
          'Privacy documentation published',
        ],
        defaultConstraints: ['Must comply with GDPR/CCPA', 'Must maintain consent records'],
        defaultDeliverables: [
          'Privacy impact assessment',
          'Rights management implementation',
          'Privacy documentation',
        ],
        evidenceType: EvidenceType.POLICY,
        baseEffortHours: 8,
      },

      // Service Operations (weight: 0.08)
      {
        id: 'tpl-service-ops',
        dimensionKey: 'service_ops',
        version: '1.0.0',
        goalTemplate: 'Establish {{bestPractice}} for service operations and support',
        taskTemplates: [
          { order: 1, template: 'Define SLAs and SLOs' },
          { order: 2, template: 'Implement incident management process' },
          { order: 3, template: 'Create runbooks for common issues' },
          { order: 4, template: 'Set up on-call rotation and escalation' },
        ],
        defaultAcceptanceCriteria: [
          'SLAs defined and monitored',
          'Incident process documented',
          'Runbooks complete for top issues',
        ],
        defaultConstraints: ['Must maintain audit trail', 'Must meet response time SLAs'],
        defaultDeliverables: [
          'SLA documentation',
          'Incident management process',
          'Operational runbooks',
        ],
        evidenceType: EvidenceType.DOCUMENT,
        baseEffortHours: 6,
      },

      // Compliance & Policy (weight: 0.07)
      {
        id: 'tpl-compliance-policy',
        dimensionKey: 'compliance_policy',
        version: '1.0.0',
        goalTemplate: 'Implement {{bestPractice}} for compliance and policy management',
        taskTemplates: [
          { order: 1, template: 'Map controls to regulatory requirements' },
          { order: 2, template: 'Implement compliance monitoring' },
          { order: 3, template: 'Create policy documentation' },
          { order: 4, template: 'Set up compliance reporting' },
        ],
        defaultAcceptanceCriteria: [
          'Control mapping complete',
          'Compliance monitoring operational',
          'Policies documented and approved',
        ],
        defaultConstraints: [
          'Must align with {{standardRefs}}',
          'Must maintain evidence for audits',
        ],
        defaultDeliverables: [
          'Control mapping',
          'Monitoring implementation',
          'Policy documentation',
        ],
        evidenceType: EvidenceType.AUDIT_LOG,
        baseEffortHours: 8,
      },

      // People & Change (weight: 0.06)
      {
        id: 'tpl-people-change',
        dimensionKey: 'people_change',
        version: '1.0.0',
        goalTemplate: 'Establish {{bestPractice}} for people management and change adoption',
        taskTemplates: [
          { order: 1, template: 'Document roles and responsibilities' },
          { order: 2, template: 'Create training plan' },
          { order: 3, template: 'Implement change communication strategy' },
          { order: 4, template: 'Set up feedback mechanisms' },
        ],
        defaultAcceptanceCriteria: [
          'RACI matrix documented',
          'Training materials complete',
          'Communication plan executed',
        ],
        defaultConstraints: ['Must align with HR policies', 'Must maintain confidentiality'],
        defaultDeliverables: ['RACI matrix', 'Training materials', 'Communication plan'],
        evidenceType: EvidenceType.DOCUMENT,
        baseEffortHours: 4,
      },
    ];

    // Load templates into map
    for (const template of defaultTemplates) {
      this.templates.set(template.dimensionKey, template);
    }

    this.logger.log(`Initialized ${this.templates.size} prompt templates`);
  }
}
