/**
 * Requirements Traceability Matrix Template
 * Category: BA
 *
 * This template defines the structure for generating Requirements Traceability Matrix
 * documents from questionnaire responses.
 */

import { DocumentCategory } from '@prisma/client';

export interface RequirementsTraceabilityData {
  overview: string;
  traceabilityMatrix: {
    requirements: TraceabilityEntry[];
  };
  coverageAnalysis: {
    requirementsCoverage: CoverageMetric[];
    testCoverage: CoverageMetric[];
    gaps: CoverageGap[];
  };
  changeLog: {
    changeRequests: ChangeRequest[];
    impactAnalysis: ImpactAnalysis[];
    approvals: Approval[];
  };
  verificationValidation: {
    testResults: TestResult[];
    signOff: SignOff[];
  };
  appendices: {
    supportingDocuments: string[];
    traceabilityTools: string;
    auditTrail: string;
  };
}

interface TraceabilityEntry {
  requirementId: string;
  description: string;
  source: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PROPOSED' | 'APPROVED' | 'IMPLEMENTED' | 'VERIFIED' | 'DEFERRED' | 'REJECTED';
  testCaseId: string;
  implementationRef: string;
  designRef: string;
  owner: string;
  releaseVersion: string;
}

interface CoverageMetric {
  category: string;
  totalItems: number;
  coveredItems: number;
  coveragePercentage: number;
  status: 'GREEN' | 'AMBER' | 'RED';
}

interface CoverageGap {
  id: string;
  requirementId: string;
  gapType: 'NO_TEST' | 'NO_IMPLEMENTATION' | 'NO_DESIGN' | 'PARTIAL';
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  remediationPlan: string;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestDate: string;
  affectedRequirements: string[];
  status: 'OPEN' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ImpactAnalysis {
  changeRequestId: string;
  scopeImpact: string;
  scheduleImpact: string;
  budgetImpact: string;
  riskImpact: string;
  affectedComponents: string[];
  recommendation: string;
}

interface Approval {
  changeRequestId: string;
  approver: string;
  role: string;
  decision: 'APPROVED' | 'REJECTED' | 'DEFERRED';
  date: string;
  conditions: string;
  comments: string;
}

interface TestResult {
  testCaseId: string;
  requirementId: string;
  testDate: string;
  tester: string;
  result: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';
  defectId: string;
  notes: string;
}

interface SignOff {
  requirementId: string;
  signedOffBy: string;
  role: string;
  date: string;
  status: 'ACCEPTED' | 'CONDITIONAL' | 'REJECTED';
  comments: string;
}

/**
 * Template configuration for Requirements Traceability Matrix
 */
export const REQUIREMENTS_TRACEABILITY_TEMPLATE = {
  slug: 'requirements-traceability',
  name: 'Requirements Traceability Matrix',
  category: DocumentCategory.BA,
  description:
    'Requirements traceability matrix document covering requirement tracking, coverage analysis, change management, and verification sign-off',
  estimatedPages: 10,

  /**
   * Required content paths that must be populated from questionnaire
   */
  requiredFields: [
    'traceabilityMatrix.requirements',
    'coverageAnalysis.requirementsCoverage',
    'verificationValidation.testResults',
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
      id: 'traceability_matrix',
      title: 'Traceability Matrix',
      required: true,
      subsections: [
        {
          id: 'requirements',
          title: 'Requirements Traceability',
          contentPath: 'traceabilityMatrix.requirements',
        },
      ],
    },
    {
      id: 'coverage_analysis',
      title: 'Coverage Analysis',
      required: true,
      subsections: [
        {
          id: 'requirements_coverage',
          title: 'Requirements Coverage',
          contentPath: 'coverageAnalysis.requirementsCoverage',
        },
        {
          id: 'test_coverage',
          title: 'Test Coverage',
          contentPath: 'coverageAnalysis.testCoverage',
        },
        {
          id: 'gaps',
          title: 'Coverage Gaps',
          contentPath: 'coverageAnalysis.gaps',
        },
      ],
    },
    {
      id: 'change_log',
      title: 'Change Log',
      required: true,
      subsections: [
        {
          id: 'change_requests',
          title: 'Change Requests',
          contentPath: 'changeLog.changeRequests',
        },
        {
          id: 'impact_analysis',
          title: 'Impact Analysis',
          contentPath: 'changeLog.impactAnalysis',
        },
        {
          id: 'approvals',
          title: 'Approvals',
          contentPath: 'changeLog.approvals',
        },
      ],
    },
    {
      id: 'verification_validation',
      title: 'Verification & Validation',
      required: true,
      subsections: [
        {
          id: 'test_results',
          title: 'Test Results',
          contentPath: 'verificationValidation.testResults',
        },
        {
          id: 'sign_off',
          title: 'Sign-Off',
          contentPath: 'verificationValidation.signOff',
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
          id: 'traceability_tools',
          title: 'Traceability Tools',
          contentPath: 'appendices.traceabilityTools',
        },
        {
          id: 'audit_trail',
          title: 'Audit Trail',
          contentPath: 'appendices.auditTrail',
        },
      ],
    },
  ],

  /**
   * Question to content field mappings (question slug -> content path)
   */
  questionMappings: {
    'requirements-list': 'traceabilityMatrix.requirements',
    'requirements-coverage': 'coverageAnalysis.requirementsCoverage',
    'test-coverage': 'coverageAnalysis.testCoverage',
    'coverage-gaps': 'coverageAnalysis.gaps',
    'change-requests': 'changeLog.changeRequests',
    'impact-analysis': 'changeLog.impactAnalysis',
    'change-approvals': 'changeLog.approvals',
    'test-results': 'verificationValidation.testResults',
    'requirement-sign-off': 'verificationValidation.signOff',
  },

  /**
   * Default values for optional fields
   */
  defaults: {
    'appendices.traceabilityTools': 'Requirements managed using organizational standard traceability tooling',
    'appendices.auditTrail': 'Full audit trail maintained in requirements management system',
    'changeLog.changeRequests': '[]',
    'changeLog.impactAnalysis': '[]',
  },
};
