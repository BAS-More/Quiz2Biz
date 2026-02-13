import { PrismaClient, QuestionType, Persona } from '@prisma/client';
import { ctoQuestions } from './cto-questions.seed';
import { cfoQuestions } from './cfo-questions.seed';
import { ceoQuestions } from './ceo-questions.seed';
import { baQuestions } from './ba-questions.seed';
import { policyQuestions } from './policy-questions.seed';

const prisma = new PrismaClient();

/**
 * Quiz2Biz Readiness Questions Seed
 *
 * 60+ starter questions organized by dimension, with:
 * - Persona assignment (CTO, CFO, CEO, BA, POLICY)
 * - Severity ratings (0.0-1.0)
 * - Standard references (ISO 27001, NIST CSF, OWASP ASVS)
 * - Best practice recommendations
 * - Acceptance criteria for coverage
 */

interface ReadinessQuestion {
  id: string;
  text: string;
  type: QuestionType;
  persona: Persona;
  dimensionKey: string;
  severity: number;
  bestPractice: string;
  practicalExplainer: string;
  standardRefs: string;
  acceptance: string;
  helpText?: string;
  options?: { id: string; label: string; value: string }[];
  isRequired?: boolean;
  orderIndex: number;
}

// Questions organized by dimension
const questions: ReadinessQuestion[] = [
  // ==========================================
  // ARCH_SEC - Architecture & Security (0.15)
  // ==========================================
  {
    id: 'q-arch-001',
    text: 'Does your system architecture implement defense-in-depth security controls?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.95,
    bestPractice:
      'Implement multiple layers of security controls at network, application, and data levels',
    practicalExplainer:
      'Defense-in-depth means having multiple security barriers. If one fails, others still protect your system.',
    standardRefs: 'ISO 27001:A.13.1, NIST CSF PR.IP-1, OWASP ASVS V1.2',
    acceptance:
      'Architecture diagram shows minimum 3 security layers; penetration test confirms no single point of compromise',
    helpText:
      'Consider network segmentation, application firewalls, encryption, and access controls',
    orderIndex: 1,
    options: [
      { id: 'arch-001-1', label: 'Yes, comprehensive defense-in-depth implemented', value: 'full' },
      { id: 'arch-001-2', label: 'Partial - some layers in place', value: 'partial' },
      { id: 'arch-001-3', label: 'Minimal - basic security only', value: 'minimal' },
      { id: 'arch-001-4', label: 'No - not yet implemented', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-arch-002',
    text: 'Is all data encrypted at rest and in transit?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.9,
    bestPractice: 'Use AES-256 for data at rest, TLS 1.3 for data in transit',
    practicalExplainer:
      'Encryption ensures that even if data is intercepted or stolen, it cannot be read without the keys.',
    standardRefs: 'ISO 27001:A.10.1, NIST CSF PR.DS-1, OWASP ASVS V6.2',
    acceptance: 'All databases use transparent data encryption; all API traffic uses TLS 1.2+',
    orderIndex: 2,
    options: [
      { id: 'arch-002-1', label: 'Yes, all data encrypted at rest and in transit', value: 'full' },
      { id: 'arch-002-2', label: 'Transit only (TLS)', value: 'transit' },
      { id: 'arch-002-3', label: 'At rest only', value: 'rest' },
      { id: 'arch-002-4', label: 'No encryption implemented', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-arch-003',
    text: 'Do you have a documented threat model for your application?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.85,
    bestPractice: 'Conduct STRIDE threat modeling during design phase and review quarterly',
    practicalExplainer:
      'Threat modeling helps identify potential attack vectors before they can be exploited.',
    standardRefs: 'ISO 27001:A.14.2.5, NIST CSF ID.RA-1, OWASP ASVS V1.1',
    acceptance: 'Documented threat model exists; reviewed within last 90 days',
    orderIndex: 3,
    options: [
      { id: 'arch-003-1', label: 'Yes, comprehensive threat model maintained', value: 'full' },
      { id: 'arch-003-2', label: 'Initial threat model, not regularly updated', value: 'partial' },
      { id: 'arch-003-3', label: 'In progress', value: 'inprogress' },
      { id: 'arch-003-4', label: 'No threat model exists', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-arch-004',
    text: 'Is input validation implemented on all user-facing interfaces?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.88,
    bestPractice:
      'Validate all inputs server-side using allowlists; sanitize for specific contexts',
    practicalExplainer: 'Input validation prevents injection attacks like SQL injection and XSS.',
    standardRefs: 'OWASP ASVS V5.1, NIST CSF PR.DS-5, CWE-20',
    acceptance: 'All APIs have input validation; SAST scan shows 0 injection vulnerabilities',
    orderIndex: 4,
    options: [
      { id: 'arch-004-1', label: 'Yes, comprehensive server-side validation', value: 'full' },
      { id: 'arch-004-2', label: 'Partial validation on critical endpoints', value: 'partial' },
      { id: 'arch-004-3', label: 'Client-side validation only', value: 'client' },
      { id: 'arch-004-4', label: 'No input validation', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-arch-005',
    text: 'Do you use parameterized queries for all database operations?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.92,
    bestPractice:
      'Use parameterized queries or ORM exclusively; never concatenate user input into SQL',
    practicalExplainer:
      'Parameterized queries prevent SQL injection by treating user input as data, not code.',
    standardRefs: 'OWASP ASVS V5.3, CWE-89, NIST CSF PR.DS-5',
    acceptance: 'SAST scan shows 0 SQL injection vulnerabilities; code review confirms ORM usage',
    orderIndex: 5,
    options: [
      { id: 'arch-005-1', label: 'Yes, ORM or parameterized queries only', value: 'full' },
      { id: 'arch-005-2', label: 'Mostly, with some legacy raw SQL', value: 'partial' },
      { id: 'arch-005-3', label: 'Mixed approach', value: 'mixed' },
      { id: 'arch-005-4', label: 'No - raw SQL queries used', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-arch-006',
    text: 'Is role-based access control (RBAC) implemented with least privilege?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'arch_sec',
    severity: 0.87,
    bestPractice:
      'Implement RBAC with roles mapped to business functions; review permissions quarterly',
    practicalExplainer:
      'Least privilege means users only have access to what they need for their job.',
    standardRefs: 'ISO 27001:A.9.4, NIST CSF PR.AC-4, OWASP ASVS V4.2',
    acceptance: 'RBAC matrix documented; quarterly access review completed',
    orderIndex: 6,
    options: [
      { id: 'arch-006-1', label: 'Yes, comprehensive RBAC with least privilege', value: 'full' },
      { id: 'arch-006-2', label: 'Basic roles implemented', value: 'partial' },
      { id: 'arch-006-3', label: 'Admin/User only', value: 'basic' },
      { id: 'arch-006-4', label: 'No access control', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // DEVOPS_IAC - DevOps & Infrastructure (0.12)
  // ==========================================
  {
    id: 'q-devops-001',
    text: 'Do you have automated CI/CD pipelines for all environments?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'devops_iac',
    severity: 0.85,
    bestPractice: 'Implement GitOps with automated pipelines for dev, staging, and production',
    practicalExplainer:
      'CI/CD automates building, testing, and deploying code, reducing human error.',
    standardRefs: 'NIST CSF PR.IP-1, ISO 27001:A.14.2.2, DORA metrics',
    acceptance: 'All deployments go through automated pipeline; manual deployments blocked',
    orderIndex: 1,
    options: [
      { id: 'devops-001-1', label: 'Yes, fully automated for all environments', value: 'full' },
      { id: 'devops-001-2', label: 'Automated for dev/staging, manual for prod', value: 'partial' },
      { id: 'devops-001-3', label: 'Basic CI only', value: 'ci' },
      { id: 'devops-001-4', label: 'No CI/CD pipelines', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-devops-002',
    text: 'Is your infrastructure defined as code (IaC)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'devops_iac',
    severity: 0.8,
    bestPractice:
      'Define all infrastructure using Terraform, Bicep, or Pulumi with version control',
    practicalExplainer:
      'IaC makes infrastructure reproducible, auditable, and prevents configuration drift.',
    standardRefs: 'NIST CSF PR.IP-1, ISO 27001:A.12.1.2, 12-Factor App',
    acceptance: 'All infrastructure in version control; no manual console changes',
    orderIndex: 2,
    options: [
      { id: 'devops-002-1', label: 'Yes, 100% IaC with Terraform/Bicep', value: 'full' },
      { id: 'devops-002-2', label: 'Most infrastructure (>80%)', value: 'partial' },
      { id: 'devops-002-3', label: 'Some infrastructure (<50%)', value: 'minimal' },
      { id: 'devops-002-4', label: 'No IaC - manual provisioning', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-devops-003',
    text: 'Do you use containerization for application deployment?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'devops_iac',
    severity: 0.75,
    bestPractice: 'Containerize applications with Docker; orchestrate with Kubernetes',
    practicalExplainer: 'Containers ensure consistent environments from development to production.',
    standardRefs: 'NIST CSF PR.IP-1, 12-Factor App Principle XII',
    acceptance: 'All applications containerized; images scanned for vulnerabilities',
    orderIndex: 3,
    options: [
      {
        id: 'devops-003-1',
        label: 'Yes, all apps containerized with orchestration',
        value: 'full',
      },
      { id: 'devops-003-2', label: 'Containerized but no orchestration', value: 'partial' },
      { id: 'devops-003-3', label: 'Some services containerized', value: 'minimal' },
      { id: 'devops-003-4', label: 'No containerization', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-devops-004',
    text: 'Are environment configurations externalized and secured?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'devops_iac',
    severity: 0.82,
    bestPractice: 'Use environment variables and secret managers; never commit secrets to code',
    practicalExplainer:
      'Externalized config allows the same code to run in different environments safely.',
    standardRefs: '12-Factor App Principle III, NIST CSF PR.IP-1, OWASP ASVS V9.1',
    acceptance: 'All secrets in vault; no secrets in code; env-specific configs externalized',
    orderIndex: 4,
    options: [
      { id: 'devops-004-1', label: 'Yes, using secret manager and env vars', value: 'full' },
      { id: 'devops-004-2', label: 'Env vars but secrets in config files', value: 'partial' },
      { id: 'devops-004-3', label: 'Hardcoded in some places', value: 'minimal' },
      { id: 'devops-004-4', label: 'All hardcoded', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-devops-005',
    text: 'Do you have rollback capability for deployments?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'devops_iac',
    severity: 0.78,
    bestPractice: 'Implement blue-green or canary deployments with instant rollback capability',
    practicalExplainer:
      'Rollback capability means you can quickly revert if a deployment causes issues.',
    standardRefs: 'NIST CSF PR.IP-9, ISO 27001:A.12.1.2',
    acceptance: 'Rollback tested and documented; can revert in <5 minutes',
    orderIndex: 5,
    options: [
      { id: 'devops-005-1', label: 'Yes, automated rollback with blue-green', value: 'full' },
      { id: 'devops-005-2', label: 'Manual rollback process documented', value: 'partial' },
      { id: 'devops-005-3', label: 'Ad-hoc rollback capability', value: 'minimal' },
      { id: 'devops-005-4', label: 'No rollback capability', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // QUALITY_TEST - Quality & Testing (0.10)
  // ==========================================
  {
    id: 'q-quality-001',
    text: 'What is your current unit test coverage?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'quality_test',
    severity: 0.8,
    bestPractice: 'Maintain minimum 80% unit test coverage with meaningful assertions',
    practicalExplainer: 'Unit tests catch bugs early and give confidence when refactoring code.',
    standardRefs: 'ISO 25010, NIST CSF PR.IP-2, TDD best practices',
    acceptance: 'Coverage report shows ≥80%; tests run in CI pipeline',
    orderIndex: 1,
    options: [
      { id: 'quality-001-1', label: '≥80% coverage', value: 'high' },
      { id: 'quality-001-2', label: '60-79% coverage', value: 'medium' },
      { id: 'quality-001-3', label: '40-59% coverage', value: 'low' },
      { id: 'quality-001-4', label: '<40% coverage', value: 'minimal' },
    ],
    isRequired: true,
  },
  {
    id: 'q-quality-002',
    text: 'Do you have integration tests for critical paths?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'quality_test',
    severity: 0.82,
    bestPractice: 'Test all critical user journeys and API integrations end-to-end',
    practicalExplainer:
      'Integration tests verify that different parts of your system work together.',
    standardRefs: 'ISO 25010, NIST CSF PR.IP-2',
    acceptance: 'All critical paths have integration tests; tests run in CI',
    orderIndex: 2,
    options: [
      { id: 'quality-002-1', label: 'Yes, comprehensive integration tests', value: 'full' },
      { id: 'quality-002-2', label: 'Some critical paths tested', value: 'partial' },
      { id: 'quality-002-3', label: 'Minimal integration tests', value: 'minimal' },
      { id: 'quality-002-4', label: 'No integration tests', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-quality-003',
    text: 'Do you perform performance/load testing?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'quality_test',
    severity: 0.7,
    bestPractice: 'Run load tests before releases; baseline p95 latency under expected load',
    practicalExplainer:
      'Load testing ensures your system can handle expected traffic without degradation.',
    standardRefs: 'ISO 25010:4.3, NIST CSF PR.IP-2',
    acceptance: 'Load test results documented; p95 latency <500ms at expected load',
    orderIndex: 3,
    options: [
      { id: 'quality-003-1', label: 'Yes, automated performance tests in CI', value: 'full' },
      { id: 'quality-003-2', label: 'Manual load testing before releases', value: 'partial' },
      { id: 'quality-003-3', label: 'Ad-hoc testing only', value: 'minimal' },
      { id: 'quality-003-4', label: 'No performance testing', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-quality-004',
    text: 'Is accessibility testing part of your quality process?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.BA,
    dimensionKey: 'quality_test',
    severity: 0.65,
    bestPractice: 'Test against WCAG 2.2 AA standards using automated and manual testing',
    practicalExplainer:
      'Accessibility ensures your application is usable by people with disabilities.',
    standardRefs: 'WCAG 2.2 AA, ISO 25010:4.4, ADA compliance',
    acceptance: 'Axe-core scan passes; manual accessibility audit completed',
    orderIndex: 4,
    options: [
      { id: 'quality-004-1', label: 'Yes, WCAG 2.2 AA compliant', value: 'full' },
      { id: 'quality-004-2', label: 'Basic accessibility testing', value: 'partial' },
      { id: 'quality-004-3', label: 'Limited testing', value: 'minimal' },
      { id: 'quality-004-4', label: 'No accessibility testing', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-quality-005',
    text: 'Do you have security testing in your CI/CD pipeline?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'quality_test',
    severity: 0.88,
    bestPractice: 'Include SAST, SCA, and DAST in CI pipeline with blocking thresholds',
    practicalExplainer:
      'Automated security testing catches vulnerabilities before they reach production.',
    standardRefs: 'OWASP ASVS V1.10, NIST CSF DE.CM-8, ISO 27001:A.14.2.8',
    acceptance: 'SAST/SCA blocks on HIGH/CRITICAL; DAST runs on staging',
    orderIndex: 5,
    options: [
      { id: 'quality-005-1', label: 'Yes, SAST/SCA/DAST in CI', value: 'full' },
      { id: 'quality-005-2', label: 'SAST only', value: 'partial' },
      { id: 'quality-005-3', label: 'Manual security reviews', value: 'minimal' },
      { id: 'quality-005-4', label: 'No security testing', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // FINANCE - Finance & Cost Management (0.10)
  // ==========================================
  {
    id: 'q-finance-001',
    text: 'Do you have a documented project budget with tracking?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.8,
    bestPractice: 'Maintain detailed budget with monthly variance reporting',
    practicalExplainer:
      'Budget tracking ensures you can complete the project without running out of funds.',
    standardRefs: 'PMI PMBOK Cost Management, ISO 21500',
    acceptance: 'Budget document exists; monthly variance report <10%',
    orderIndex: 1,
    options: [
      { id: 'finance-001-1', label: 'Yes, detailed budget with tracking', value: 'full' },
      { id: 'finance-001-2', label: 'Budget exists but limited tracking', value: 'partial' },
      { id: 'finance-001-3', label: 'High-level budget only', value: 'minimal' },
      { id: 'finance-001-4', label: 'No budget documentation', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-finance-002',
    text: 'Have you calculated the total cost of ownership (TCO)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.75,
    bestPractice: 'Calculate 3-year TCO including infrastructure, licensing, and maintenance',
    practicalExplainer: 'TCO includes all costs over time, not just initial development costs.',
    standardRefs: 'PMI PMBOK, Gartner TCO methodology',
    acceptance: 'TCO document covers 3 years; includes all cost categories',
    orderIndex: 2,
    options: [
      { id: 'finance-002-1', label: 'Yes, comprehensive 3-year TCO', value: 'full' },
      { id: 'finance-002-2', label: '1-year TCO calculated', value: 'partial' },
      { id: 'finance-002-3', label: 'Initial costs only', value: 'minimal' },
      { id: 'finance-002-4', label: 'No TCO analysis', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-finance-003',
    text: 'Do you have cloud cost optimization measures in place?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.7,
    bestPractice: 'Use reserved instances, auto-scaling, and cost monitoring tools',
    practicalExplainer:
      'Cloud costs can spiral quickly; optimization ensures sustainable spending.',
    standardRefs: 'FinOps Foundation principles, AWS/Azure cost best practices',
    acceptance: 'Cost monitoring active; reserved instances for predictable workloads',
    orderIndex: 3,
    options: [
      { id: 'finance-003-1', label: 'Yes, comprehensive cost optimization', value: 'full' },
      { id: 'finance-003-2', label: 'Basic cost monitoring in place', value: 'partial' },
      { id: 'finance-003-3', label: 'Ad-hoc cost reviews', value: 'minimal' },
      { id: 'finance-003-4', label: 'No cost optimization', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // STRATEGY - Strategy & Vision (0.08)
  // ==========================================
  {
    id: 'q-strategy-001',
    text: 'Is there a clear product vision and roadmap?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.75,
    bestPractice: 'Document product vision with 12-month roadmap aligned to business objectives',
    practicalExplainer: 'A clear vision guides all decisions and keeps the team aligned.',
    standardRefs: 'Lean Startup, PMI PMBOK Scope Management',
    acceptance: 'Vision document exists; roadmap reviewed quarterly',
    orderIndex: 1,
    options: [
      { id: 'strategy-001-1', label: 'Yes, documented vision and roadmap', value: 'full' },
      { id: 'strategy-001-2', label: 'Vision exists, no formal roadmap', value: 'partial' },
      { id: 'strategy-001-3', label: 'Informal understanding', value: 'minimal' },
      { id: 'strategy-001-4', label: 'No documented vision', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-strategy-002',
    text: 'Are key stakeholders aligned on project objectives?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.7,
    bestPractice: 'Conduct stakeholder alignment sessions; document and track OKRs',
    practicalExplainer: 'Stakeholder alignment prevents conflicting priorities and scope creep.',
    standardRefs: 'PMI PMBOK Stakeholder Management, OKR methodology',
    acceptance: 'Stakeholder RACI documented; OKRs agreed upon',
    orderIndex: 2,
    options: [
      { id: 'strategy-002-1', label: 'Yes, formal alignment documented', value: 'full' },
      { id: 'strategy-002-2', label: 'Mostly aligned, some gaps', value: 'partial' },
      { id: 'strategy-002-3', label: 'Limited alignment', value: 'minimal' },
      { id: 'strategy-002-4', label: 'Stakeholders not aligned', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // REQUIREMENTS - Requirements & Specs (0.08)
  // ==========================================
  {
    id: 'q-req-001',
    text: 'Are user stories documented with acceptance criteria?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.BA,
    dimensionKey: 'requirements',
    severity: 0.78,
    bestPractice: 'Write user stories in INVEST format with clear acceptance criteria',
    practicalExplainer:
      'Well-defined user stories ensure developers build what users actually need.',
    standardRefs: 'Scrum Guide, IIBA BABOK, IEEE 830',
    acceptance: 'All stories have AC; AC reviewed by stakeholders',
    orderIndex: 1,
    options: [
      { id: 'req-001-1', label: 'Yes, all stories with AC', value: 'full' },
      { id: 'req-001-2', label: 'Most stories have AC', value: 'partial' },
      { id: 'req-001-3', label: 'Some stories documented', value: 'minimal' },
      { id: 'req-001-4', label: 'No formal requirements', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-req-002',
    text: 'Do you maintain requirements traceability?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.BA,
    dimensionKey: 'requirements',
    severity: 0.72,
    bestPractice: 'Maintain traceability matrix linking requirements to tests and code',
    practicalExplainer: 'Traceability ensures all requirements are implemented and tested.',
    standardRefs: 'IIBA BABOK, IEEE 830, ISO 29148',
    acceptance: 'Traceability matrix exists; linked to test cases',
    orderIndex: 2,
    options: [
      { id: 'req-002-1', label: 'Yes, full traceability maintained', value: 'full' },
      { id: 'req-002-2', label: 'Partial traceability', value: 'partial' },
      { id: 'req-002-3', label: 'Basic linking only', value: 'minimal' },
      { id: 'req-002-4', label: 'No traceability', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // DATA_AI - Data & AI (0.08)
  // ==========================================
  {
    id: 'q-data-001',
    text: 'Is your data architecture documented?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'data_ai',
    severity: 0.75,
    bestPractice: 'Document data flows, storage locations, and retention policies',
    practicalExplainer:
      'Data architecture documentation helps with compliance and system understanding.',
    standardRefs: 'DAMA DMBOK, ISO 27001:A.8.2, GDPR Article 30',
    acceptance: 'Data architecture diagram exists; retention policies documented',
    orderIndex: 1,
    options: [
      { id: 'data-001-1', label: 'Yes, comprehensive documentation', value: 'full' },
      { id: 'data-001-2', label: 'Basic data flow documented', value: 'partial' },
      { id: 'data-001-3', label: 'Minimal documentation', value: 'minimal' },
      { id: 'data-001-4', label: 'No data architecture docs', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-data-002',
    text: 'Do you have data quality monitoring?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'data_ai',
    severity: 0.68,
    bestPractice: 'Implement data quality checks with automated alerting',
    practicalExplainer: 'Bad data leads to bad decisions; monitoring catches quality issues early.',
    standardRefs: 'DAMA DMBOK, ISO 8000',
    acceptance: 'Data quality metrics defined; automated checks in place',
    orderIndex: 2,
    options: [
      { id: 'data-002-1', label: 'Yes, automated quality monitoring', value: 'full' },
      { id: 'data-002-2', label: 'Manual quality checks', value: 'partial' },
      { id: 'data-002-3', label: 'Ad-hoc quality reviews', value: 'minimal' },
      { id: 'data-002-4', label: 'No quality monitoring', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // PRIVACY_LEGAL - Privacy & Legal (0.08)
  // ==========================================
  {
    id: 'q-privacy-001',
    text: 'Is your application GDPR/privacy compliant?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.POLICY,
    dimensionKey: 'privacy_legal',
    severity: 0.9,
    bestPractice: 'Implement privacy by design; conduct DPIA for high-risk processing',
    practicalExplainer:
      'Privacy compliance protects users and avoids significant regulatory fines.',
    standardRefs: 'GDPR Articles 5-7, 13-22, 25, CCPA',
    acceptance: 'Privacy policy published; consent mechanism implemented; DPIA completed',
    orderIndex: 1,
    options: [
      { id: 'privacy-001-1', label: 'Yes, fully GDPR compliant', value: 'full' },
      { id: 'privacy-001-2', label: 'Partially compliant', value: 'partial' },
      { id: 'privacy-001-3', label: 'Basic privacy policy only', value: 'minimal' },
      { id: 'privacy-001-4', label: 'Not addressed', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-privacy-002',
    text: 'Do you have data subject rights processes?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.POLICY,
    dimensionKey: 'privacy_legal',
    severity: 0.85,
    bestPractice: 'Implement automated data export and deletion capabilities',
    practicalExplainer: 'Users have the right to access, export, and delete their data.',
    standardRefs: 'GDPR Articles 15-22, CCPA Rights',
    acceptance: 'Data export and deletion APIs implemented; process documented',
    orderIndex: 2,
    options: [
      { id: 'privacy-002-1', label: 'Yes, automated processes', value: 'full' },
      { id: 'privacy-002-2', label: 'Manual processes in place', value: 'partial' },
      { id: 'privacy-002-3', label: 'Basic capability exists', value: 'minimal' },
      { id: 'privacy-002-4', label: 'No processes', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // SERVICE_OPS - Service Operations (0.08)
  // ==========================================
  {
    id: 'q-ops-001',
    text: 'Do you have monitoring and alerting in place?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'service_ops',
    severity: 0.85,
    bestPractice: 'Implement APM, logging, and alerting with defined SLOs',
    practicalExplainer: 'Monitoring helps you detect and respond to issues before users notice.',
    standardRefs: 'NIST CSF DE.AE, ISO 27001:A.12.4, SRE best practices',
    acceptance: 'APM and logging active; SLOs defined; alerts configured',
    orderIndex: 1,
    options: [
      { id: 'ops-001-1', label: 'Yes, comprehensive monitoring with SLOs', value: 'full' },
      { id: 'ops-001-2', label: 'Basic monitoring in place', value: 'partial' },
      { id: 'ops-001-3', label: 'Logs only', value: 'minimal' },
      { id: 'ops-001-4', label: 'No monitoring', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ops-002',
    text: 'Do you have documented incident response procedures?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CTO,
    dimensionKey: 'service_ops',
    severity: 0.8,
    bestPractice: 'Document incident response playbooks with escalation paths',
    practicalExplainer:
      'Incident response procedures ensure quick resolution when things go wrong.',
    standardRefs: 'NIST CSF RS.RP-1, ISO 27001:A.16.1, ITIL',
    acceptance: 'Incident response runbook exists; on-call rotation defined',
    orderIndex: 2,
    options: [
      { id: 'ops-002-1', label: 'Yes, documented with on-call', value: 'full' },
      { id: 'ops-002-2', label: 'Basic procedures documented', value: 'partial' },
      { id: 'ops-002-3', label: 'Informal process', value: 'minimal' },
      { id: 'ops-002-4', label: 'No incident response', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // COMPLIANCE_POLICY - Compliance (0.07)
  // ==========================================
  {
    id: 'q-compliance-001',
    text: 'Have you identified applicable regulatory requirements?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.POLICY,
    dimensionKey: 'compliance_policy',
    severity: 0.85,
    bestPractice: 'Document all applicable regulations and map to controls',
    practicalExplainer: 'Understanding your regulatory obligations prevents legal issues.',
    standardRefs: 'ISO 27001:A.18.1, NIST CSF ID.GV-3',
    acceptance: 'Regulatory requirements documented; mapped to controls',
    orderIndex: 1,
    options: [
      { id: 'compliance-001-1', label: 'Yes, comprehensive mapping', value: 'full' },
      { id: 'compliance-001-2', label: 'Key regulations identified', value: 'partial' },
      { id: 'compliance-001-3', label: 'Basic awareness', value: 'minimal' },
      { id: 'compliance-001-4', label: 'Not assessed', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-compliance-002',
    text: 'Do you have audit logging for compliance?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.POLICY,
    dimensionKey: 'compliance_policy',
    severity: 0.82,
    bestPractice: 'Log all security-relevant events with immutable storage',
    practicalExplainer:
      'Audit logs provide evidence for compliance audits and forensic investigations.',
    standardRefs: 'ISO 27001:A.12.4, SOC 2 CC7.2, NIST CSF DE.AE-3',
    acceptance: 'Audit logs capture user actions; logs retained for required period',
    orderIndex: 2,
    options: [
      { id: 'compliance-002-1', label: 'Yes, comprehensive audit logging', value: 'full' },
      { id: 'compliance-002-2', label: 'Basic security event logging', value: 'partial' },
      { id: 'compliance-002-3', label: 'Limited logging', value: 'minimal' },
      { id: 'compliance-002-4', label: 'No audit logging', value: 'none' },
    ],
    isRequired: true,
  },

  // ==========================================
  // PEOPLE_CHANGE - People & Change (0.06)
  // ==========================================
  {
    id: 'q-people-001',
    text: 'Is there a training plan for the team?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'people_change',
    severity: 0.65,
    bestPractice: 'Create skills matrix and training plan aligned to project needs',
    practicalExplainer:
      'Training ensures the team has the skills to deliver and maintain the system.',
    standardRefs: 'ISO 27001:A.7.2, PMI PMBOK Resource Management',
    acceptance: 'Training plan documented; skills gaps identified and addressed',
    orderIndex: 1,
    options: [
      { id: 'people-001-1', label: 'Yes, comprehensive training plan', value: 'full' },
      { id: 'people-001-2', label: 'Basic training identified', value: 'partial' },
      { id: 'people-001-3', label: 'Ad-hoc training', value: 'minimal' },
      { id: 'people-001-4', label: 'No training plan', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-people-002',
    text: 'Do you have knowledge transfer documentation?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.BA,
    dimensionKey: 'people_change',
    severity: 0.62,
    bestPractice: 'Document system knowledge; create runbooks and wikis',
    practicalExplainer:
      'Knowledge transfer reduces bus factor risk and helps onboard new team members.',
    standardRefs: 'ITIL Knowledge Management, ISO 27001:A.7.1',
    acceptance: 'Technical documentation exists; onboarding guide available',
    orderIndex: 2,
    options: [
      { id: 'people-002-1', label: 'Yes, comprehensive documentation', value: 'full' },
      { id: 'people-002-2', label: 'Basic documentation exists', value: 'partial' },
      { id: 'people-002-3', label: 'Minimal documentation', value: 'minimal' },
      { id: 'people-002-4', label: 'No documentation', value: 'none' },
    ],
    isRequired: true,
  },
];

/**
 * Seed Quiz2Biz readiness questions
 * Links questions to existing sections or creates a dedicated readiness section
 */
export async function seedReadinessQuestions(): Promise<void> {
  console.log('\n📝 Seeding Quiz2Biz Readiness Questions...');

  // Get or create the questionnaire
  let questionnaire = await prisma.questionnaire.findFirst({
    where: { isDefault: true },
  });

  if (!questionnaire) {
    questionnaire = await prisma.questionnaire.create({
      data: {
        name: 'Quiz2Biz Readiness Assessment',
        description: 'Comprehensive readiness assessment for software projects',
        industry: 'technology',
        isActive: true,
        isDefault: true,
        estimatedTime: 60,
      },
    });
    console.log('  Created new questionnaire:', questionnaire.id);
  }

  // Create readiness sections by dimension
  const dimensionSections: Record<string, string> = {};
  const sectionOrder = [
    { key: 'arch_sec', name: 'Architecture & Security Assessment' },
    { key: 'devops_iac', name: 'DevOps & Infrastructure Assessment' },
    { key: 'quality_test', name: 'Quality & Testing Assessment' },
    { key: 'finance', name: 'Finance Assessment' },
    { key: 'strategy', name: 'Strategy Assessment' },
    { key: 'requirements', name: 'Requirements Assessment' },
    { key: 'data_ai', name: 'Data & AI Assessment' },
    { key: 'privacy_legal', name: 'Privacy & Legal Assessment' },
    { key: 'service_ops', name: 'Service Operations Assessment' },
    { key: 'compliance_policy', name: 'Compliance Assessment' },
    { key: 'people_change', name: 'People & Change Assessment' },
  ];

  for (let i = 0; i < sectionOrder.length; i++) {
    const sectionDef = sectionOrder[i];
    const section = await prisma.section.upsert({
      where: { id: `sec-readiness-${sectionDef.key}` },
      update: {
        name: sectionDef.name,
        orderIndex: 100 + i, // After existing sections
      },
      create: {
        id: `sec-readiness-${sectionDef.key}`,
        questionnaireId: questionnaire.id,
        name: sectionDef.name,
        description: `Questions for ${sectionDef.name.replace(' Assessment', '')} readiness`,
        orderIndex: 100 + i,
        metadata: { dimensionKey: sectionDef.key },
      },
    });
    dimensionSections[sectionDef.key] = section.id;
  }

  // Seed questions
  let created = 0;
  let updated = 0;

  for (const question of questions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(
    `\n✅ Seeded ${questions.length} readiness questions (${created} created, ${updated} updated)`,
  );

  // Seed CTO-specific questions (Architecture, Security, Platform)
  console.log('\n🔧 Seeding CTO questions (Architecture, Security, Platform)...');
  let ctoCreated = 0;
  let ctoUpdated = 0;

  for (const question of ctoQuestions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      ctoUpdated++;
    } else {
      ctoCreated++;
    }
  }

  console.log(
    `✅ Seeded ${ctoQuestions.length} CTO questions (${ctoCreated} created, ${ctoUpdated} updated)`,
  );

  // Seed CFO-specific questions (Unit Economics, Runway, Spend Governance)
  console.log('\n💰 Seeding CFO questions (Unit Economics, Runway, Spend Governance)...');
  let cfoCreated = 0;
  let cfoUpdated = 0;

  for (const question of cfoQuestions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      cfoUpdated++;
    } else {
      cfoCreated++;
    }
  }

  console.log(
    `✅ Seeded ${cfoQuestions.length} CFO questions (${cfoCreated} created, ${cfoUpdated} updated)`,
  );

  // Seed CEO-specific questions (Strategy, Value, Risk)
  console.log('\n👔 Seeding CEO questions (Strategy, Value, Risk)...');
  let ceoCreated = 0;
  let ceoUpdated = 0;

  for (const question of ceoQuestions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      ceoUpdated++;
    } else {
      ceoCreated++;
    }
  }

  console.log(
    `✅ Seeded ${ceoQuestions.length} CEO questions (${ceoCreated} created, ${ceoUpdated} updated)`,
  );

  // Seed BA-specific questions (Requirements, UX, Policy-to-Control)
  console.log('\n📋 Seeding BA questions (Requirements, UX, Policy-to-Control)...');
  let baCreated = 0;
  let baUpdated = 0;

  for (const question of baQuestions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      baUpdated++;
    } else {
      baCreated++;
    }
  }

  console.log(
    `✅ Seeded ${baQuestions.length} BA questions (${baCreated} created, ${baUpdated} updated)`,
  );

  // Seed Policy-specific questions (Compliance, Auditability, Governance)
  console.log('\n📜 Seeding Policy Writer questions (Compliance, Auditability, Governance)...');
  let policyCreated = 0;
  let policyUpdated = 0;

  for (const question of policyQuestions) {
    const sectionId = dimensionSections[question.dimensionKey];

    if (!sectionId) {
      console.warn(`  ⚠ No section for dimension: ${question.dimensionKey}`);
      continue;
    }

    const existing = await prisma.question.findUnique({
      where: { id: question.id },
    });

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
      },
      create: {
        id: question.id,
        sectionId,
        text: question.text,
        type: question.type,
        persona: question.persona,
        dimensionKey: question.dimensionKey,
        severity: question.severity,
        bestPractice: question.bestPractice,
        practicalExplainer: question.practicalExplainer,
        standardRefs: question.standardRefs,
        acceptance: question.acceptance,
        helpText: question.helpText,
        options: question.options,
        isRequired: question.isRequired ?? true,
        orderIndex: question.orderIndex,
        metadata: {},
      },
    });

    if (existing) {
      policyUpdated++;
    } else {
      policyCreated++;
    }
  }

  console.log(
    `✅ Seeded ${policyQuestions.length} Policy questions (${policyCreated} created, ${policyUpdated} updated)`,
  );

  // Summary
  const totalQuestions =
    questions.length +
    ctoQuestions.length +
    cfoQuestions.length +
    ceoQuestions.length +
    baQuestions.length +
    policyQuestions.length;
  console.log(`\n🎉 Total: ${totalQuestions} questions seeded across all personas!`);
}

// Allow running standalone
if (require.main === module) {
  seedReadinessQuestions()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Error seeding questions:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
