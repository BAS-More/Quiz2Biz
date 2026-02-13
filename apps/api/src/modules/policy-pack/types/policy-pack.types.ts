/**
 * Policy Pack Types
 * Core interfaces for the Policy Pack Generator
 */

/**
 * Policy hierarchy: Policy → Standard → Procedure
 */
export interface PolicyDocument {
  /** Unique identifier */
  id: string;

  /** Policy title */
  title: string;

  /** Policy version */
  version: string;

  /** Policy type */
  type: PolicyType;

  /** Which dimension this policy addresses */
  dimensionKey: string;

  /** Policy objective/purpose */
  objective: string;

  /** Policy scope */
  scope: string;

  /** Policy statements */
  statements: PolicyStatement[];

  /** Related standards (child documents) */
  standards: StandardDocument[];

  /** Control mappings to compliance frameworks */
  controlMappings: ControlMapping[];

  /** Effective date */
  effectiveDate: Date;

  /** Review date */
  reviewDate: Date;

  /** Document owner */
  owner: string;

  /** Approval status */
  status: DocumentStatus;

  /** Tags for categorization */
  tags: string[];

  /** Generated from gap analysis */
  generatedFromGap?: boolean;

  /** Session ID if generated from gap */
  sourceSessionId?: string;
}

export enum PolicyType {
  SECURITY = 'SECURITY',
  PRIVACY = 'PRIVACY',
  DATA_GOVERNANCE = 'DATA_GOVERNANCE',
  OPERATIONAL = 'OPERATIONAL',
  COMPLIANCE = 'COMPLIANCE',
  RISK = 'RISK',
  CHANGE_MANAGEMENT = 'CHANGE_MANAGEMENT',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  RETIRED = 'RETIRED',
}

export interface PolicyStatement {
  /** Statement ID */
  id: string;

  /** Statement text */
  text: string;

  /** Requirement level */
  requirement: RequirementLevel;

  /** Control ID reference */
  controlRef?: string;

  /** Evidence requirement */
  evidenceRequired?: boolean;
}

export enum RequirementLevel {
  SHALL = 'SHALL', // Mandatory
  SHOULD = 'SHOULD', // Recommended
  MAY = 'MAY', // Optional
}

/**
 * Standard document (implements a policy)
 */
export interface StandardDocument {
  /** Unique identifier */
  id: string;

  /** Parent policy ID */
  policyId: string;

  /** Standard title */
  title: string;

  /** Standard version */
  version: string;

  /** Technical/process requirements */
  requirements: StandardRequirement[];

  /** Related procedures (child documents) */
  procedures: ProcedureDocument[];

  /** Control mappings */
  controlMappings: ControlMapping[];
}

export interface StandardRequirement {
  /** Requirement ID */
  id: string;

  /** Requirement description */
  description: string;

  /** Technical specification */
  specification: string;

  /** Verification method */
  verificationMethod: string;

  /** Metric/threshold */
  metric?: string;
}

/**
 * Procedure document (implements a standard)
 */
export interface ProcedureDocument {
  /** Unique identifier */
  id: string;

  /** Parent standard ID */
  standardId: string;

  /** Procedure title */
  title: string;

  /** Procedure version */
  version: string;

  /** Step-by-step instructions */
  steps: ProcedureStep[];

  /** Roles involved */
  roles: string[];

  /** Tools/systems required */
  toolsRequired: string[];

  /** Frequency of execution */
  frequency?: string;
}

export interface ProcedureStep {
  /** Step number */
  order: number;

  /** Step description */
  description: string;

  /** Role responsible */
  responsibleRole: string;

  /** Expected output */
  expectedOutput?: string;

  /** Verification criteria */
  verification?: string;
}

/**
 * Control mapping to compliance frameworks
 */
export interface ControlMapping {
  /** Framework name */
  framework: ComplianceFramework;

  /** Control ID in the framework */
  controlId: string;

  /** Control description */
  controlDescription: string;

  /** Mapping strength */
  mappingStrength: MappingStrength;
}

export enum ComplianceFramework {
  ISO_27001 = 'ISO_27001',
  NIST_CSF = 'NIST_CSF',
  OWASP_ASVS = 'OWASP_ASVS',
  SOC2 = 'SOC2',
  GDPR = 'GDPR',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  CIS_CONTROLS = 'CIS_CONTROLS',
}

export enum MappingStrength {
  FULL = 'FULL', // Fully addresses the control
  PARTIAL = 'PARTIAL', // Partially addresses the control
  SUPPORTIVE = 'SUPPORTIVE', // Supports but doesn't fully address
}

/**
 * OPA/Rego policy for infrastructure validation
 */
export interface OpaPolicy {
  /** Policy name */
  name: string;

  /** Package name for Rego */
  packageName: string;

  /** Rego policy code */
  regoCode: string;

  /** Description */
  description: string;

  /** Severity of violations */
  severity: PolicySeverity;

  /** Resources this policy applies to */
  resourceTypes: string[];

  /** Test cases */
  tests: OpaPolicyTest[];
}

export enum PolicySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export interface OpaPolicyTest {
  /** Test name */
  name: string;

  /** Input data */
  input: Record<string, unknown>;

  /** Expected result */
  expected: boolean;
}

/**
 * Policy pack bundle for export
 */
export interface PolicyPackBundle {
  /** Bundle ID */
  id: string;

  /** Bundle name */
  name: string;

  /** Bundle version */
  version: string;

  /** Generated timestamp */
  generatedAt: Date;

  /** Policies included */
  policies: PolicyDocument[];

  /** OPA policies for IaC validation */
  opaPolicies: OpaPolicy[];

  /** Terraform compliance rules */
  terraformRules: string;

  /** README content */
  readmeContent: string;

  /** Session ID if generated from gap analysis */
  sourceSessionId?: string;

  /** Score at generation time */
  scoreAtGeneration?: number;
}
