/**
 * Policy Generator Service
 * Creates Policy → Standard → Procedure documents from gaps
 */
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  PolicyDocument,
  PolicyType,
  DocumentStatus,
  RequirementLevel,
  StandardDocument,
  StandardRequirement,
  ProcedureDocument,
  ProcedureStep,
} from '../types';
import { ControlMappingService } from './control-mapping.service';
import { GapContext } from '../../qpg/types';

interface PolicyTemplate {
  dimensionKey: string;
  policyType: PolicyType;
  titleTemplate: string;
  objectiveTemplate: string;
  scopeTemplate: string;
  statementTemplates: { text: string; requirement: RequirementLevel }[];
  standardRequirements: { description: string; specification: string }[];
  procedureSteps: { description: string; role: string }[];
}

@Injectable()
export class PolicyGeneratorService {
  private readonly logger = new Logger(PolicyGeneratorService.name);

  constructor(private readonly controlMappingService: ControlMappingService) {}

  /**
   * Policy templates by dimension
   */
  private readonly templates: PolicyTemplate[] = [
    {
      dimensionKey: 'arch_sec',
      policyType: PolicyType.SECURITY,
      titleTemplate: 'Information Security Policy',
      objectiveTemplate: 'Establish security controls to protect information assets',
      scopeTemplate: 'All systems, applications, and data processing activities',
      statementTemplates: [
        {
          text: 'All systems shall implement defense-in-depth security controls',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'Security architecture shall be reviewed quarterly',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'All code should undergo security review before deployment',
          requirement: RequirementLevel.SHOULD,
        },
      ],
      standardRequirements: [
        {
          description: 'Implement TLS 1.3 for all data in transit',
          specification: 'TLS 1.3+ required',
        },
        {
          description: 'Encrypt data at rest using AES-256',
          specification: 'AES-256-GCM encryption',
        },
        { description: 'Implement rate limiting on all APIs', specification: '100 req/min per IP' },
      ],
      procedureSteps: [
        { description: 'Review security architecture diagram', role: 'Security Lead' },
        { description: 'Run automated security scans', role: 'DevOps Engineer' },
        { description: 'Document findings and remediation plan', role: 'Security Lead' },
      ],
    },
    {
      dimensionKey: 'devops_iac',
      policyType: PolicyType.OPERATIONAL,
      titleTemplate: 'DevOps and Infrastructure Policy',
      objectiveTemplate: 'Ensure reliable, secure, and automated infrastructure operations',
      scopeTemplate: 'All infrastructure, CI/CD pipelines, and deployment processes',
      statementTemplates: [
        {
          text: 'All infrastructure shall be managed as code',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'Changes shall be deployed through automated pipelines',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'Production deployments should require approval',
          requirement: RequirementLevel.SHOULD,
        },
      ],
      standardRequirements: [
        {
          description: 'Use Terraform/Bicep for infrastructure provisioning',
          specification: 'IaC required',
        },
        { description: 'CI/CD pipeline with security gates', specification: 'SAST/DAST required' },
        {
          description: 'Immutable infrastructure deployment',
          specification: 'Blue-green deployment',
        },
      ],
      procedureSteps: [
        { description: 'Create infrastructure change request', role: 'Developer' },
        { description: 'Review IaC changes in pull request', role: 'Platform Engineer' },
        { description: 'Execute terraform plan and review', role: 'Platform Engineer' },
        { description: 'Apply changes with approval', role: 'Platform Lead' },
      ],
    },
    {
      dimensionKey: 'privacy_legal',
      policyType: PolicyType.PRIVACY,
      titleTemplate: 'Data Privacy and Protection Policy',
      objectiveTemplate: 'Protect personal data and ensure regulatory compliance',
      scopeTemplate: 'All personal data processing activities',
      statementTemplates: [
        {
          text: 'Personal data shall be processed lawfully and transparently',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'Data subject rights shall be facilitated within 30 days',
          requirement: RequirementLevel.SHALL,
        },
        {
          text: 'Privacy impact assessments should be conducted for new processing',
          requirement: RequirementLevel.SHOULD,
        },
      ],
      standardRequirements: [
        {
          description: 'Maintain data processing register',
          specification: 'GDPR Article 30 compliant',
        },
        {
          description: 'Implement consent management',
          specification: 'Granular, revocable consent',
        },
        {
          description: 'Enable data subject rights automation',
          specification: '< 30 day response',
        },
      ],
      procedureSteps: [
        { description: 'Document data processing purpose', role: 'Data Protection Officer' },
        { description: 'Conduct DPIA for high-risk processing', role: 'Privacy Analyst' },
        { description: 'Implement privacy controls', role: 'Developer' },
        { description: 'Review and approve processing', role: 'DPO' },
      ],
    },
    // Add more templates for other dimensions...
  ];

  /**
   * Generate complete policy pack for a gap
   */
  async generatePolicyForGap(gap: GapContext): Promise<PolicyDocument> {
    const template = this.templates.find((t) => t.dimensionKey === gap.dimensionKey);

    if (!template) {
      // Use a generic template
      return this.generateGenericPolicy(gap);
    }

    const policyId = `pol-${uuidv4()}`;
    const now = new Date();

    // Generate standards
    const standards = this.generateStandards(policyId, template, gap);

    // Get control mappings
    const controlMappings = this.controlMappingService.getMappingsForDimension(gap.dimensionKey);

    const policy: PolicyDocument = {
      id: policyId,
      title: template.titleTemplate,
      version: '1.0.0',
      type: template.policyType,
      dimensionKey: gap.dimensionKey,
      objective: this.interpolate(template.objectiveTemplate, gap),
      scope: template.scopeTemplate,
      statements: template.statementTemplates.map((st, i) => ({
        id: `stmt-${i + 1}`,
        text: st.text,
        requirement: st.requirement,
        evidenceRequired: st.requirement === RequirementLevel.SHALL,
      })),
      standards,
      controlMappings,
      effectiveDate: now,
      reviewDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
      owner: 'Information Security',
      status: DocumentStatus.DRAFT,
      tags: [gap.dimensionKey, template.policyType.toLowerCase()],
      generatedFromGap: true,
      sourceSessionId: gap.sessionId,
    };

    return policy;
  }

  /**
   * Generate standards for a policy
   */
  private generateStandards(
    policyId: string,
    template: PolicyTemplate,
    gap: GapContext,
  ): StandardDocument[] {
    const standardId = `std-${uuidv4()}`;

    const requirements: StandardRequirement[] = template.standardRequirements.map((req, i) => ({
      id: `req-${i + 1}`,
      description: req.description,
      specification: req.specification,
      verificationMethod: 'Automated scanning and manual review',
    }));

    const procedures = this.generateProcedures(standardId, template, gap);

    const standard: StandardDocument = {
      id: standardId,
      policyId,
      title: `${template.titleTemplate} - Technical Standard`,
      version: '1.0.0',
      requirements,
      procedures,
      controlMappings: this.controlMappingService.getMappingsForDimension(gap.dimensionKey),
    };

    return [standard];
  }

  /**
   * Generate procedures for a standard
   */
  private generateProcedures(
    standardId: string,
    template: PolicyTemplate,
    _gap: GapContext,
  ): ProcedureDocument[] {
    const procedureId = `proc-${uuidv4()}`;

    const steps: ProcedureStep[] = template.procedureSteps.map((step, i) => ({
      order: i + 1,
      description: step.description,
      responsibleRole: step.role,
    }));

    const procedure: ProcedureDocument = {
      id: procedureId,
      standardId,
      title: `${template.titleTemplate} - Operating Procedure`,
      version: '1.0.0',
      steps,
      roles: [...new Set(template.procedureSteps.map((s) => s.role))],
      toolsRequired: ['Documentation system', 'Version control'],
      frequency: 'As needed / Quarterly review',
    };

    return [procedure];
  }

  /**
   * Generate generic policy for dimensions without specific template
   */
  private generateGenericPolicy(gap: GapContext): PolicyDocument {
    const policyId = `pol-${uuidv4()}`;
    const now = new Date();

    return {
      id: policyId,
      title: `${gap.dimensionName} Policy`,
      version: '1.0.0',
      type: PolicyType.OPERATIONAL,
      dimensionKey: gap.dimensionKey,
      objective: `Establish controls and procedures for ${gap.dimensionName}`,
      scope: `All activities related to ${gap.dimensionName}`,
      statements: [
        {
          id: 'stmt-1',
          text: `${gap.bestPractice}`,
          requirement: RequirementLevel.SHALL,
          evidenceRequired: true,
        },
      ],
      standards: [],
      controlMappings: this.controlMappingService.getMappingsForDimension(gap.dimensionKey),
      effectiveDate: now,
      reviewDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      owner: 'Operations',
      status: DocumentStatus.DRAFT,
      tags: [gap.dimensionKey],
      generatedFromGap: true,
      sourceSessionId: gap.sessionId,
    };
  }

  /**
   * Interpolate template with gap context
   */
  private interpolate(template: string, gap: GapContext): string {
    return template
      .replace(/\{\{dimensionName\}\}/g, gap.dimensionName)
      .replace(/\{\{bestPractice\}\}/g, gap.bestPractice);
  }
}
