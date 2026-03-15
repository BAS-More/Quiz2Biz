/**
 * Technical section builders: Architecture Dossier, SDLC Playbook, Test Strategy.
 */
import {
  CompiledDocument,
  DocumentSection,
  DeliverableCategory,
  CompilerSession,
  CompilerResponse,
} from '../compiler-types';
import {
  generateId,
  processAndCountWords,
  sumWordCounts,
  countSubSections,
} from '../compiler-utils';

// === Architecture Dossier ===

export function compileArchitectureDossier(
  session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const archResponses = responses.filter((r) => r.question.dimension?.key === 'arch_sec');

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. System Overview',
      content: generateSystemOverview(session, archResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Architecture Decisions',
      content: generateArchitectureDecisions(archResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Security Architecture',
      content: generateSecurityArchitecture(archResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Technology Stack',
      content: generateTechnologyStack(archResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Architecture Dossier',
    category: DeliverableCategory.ARCHITECTURE,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateSystemOverview(session: CompilerSession, responses: CompilerResponse[]): string {
  const questionnaireName = session.questionnaire?.name || 'Assessment';
  const industry = session.industry || 'General';

  return `
## System Overview

This Architecture Dossier documents the system architecture for the ${questionnaireName} assessment.

**Industry:** ${industry}
**Assessment Date:** ${new Date().toISOString().split('T')[0]}
**Questionnaire Version:** ${session.questionnaireVersion}

### Scope
This document covers the architectural decisions, security considerations, and technology stack recommendations based on the readiness assessment responses.

### Key Findings
Based on ${responses.length} architecture-related responses, this document outlines the system design principles and implementation guidelines.
    `.trim();
}

function generateArchitectureDecisions(responses: CompilerResponse[]): string {
  const decisions = responses.filter(
    (r) =>
      r.question.text.toLowerCase().includes('decision') ||
      r.question.text.toLowerCase().includes('architecture'),
  );

  let content = '## Architecture Decisions\n\n';
  content += 'The following architectural decisions have been documented:\n\n';

  for (const resp of decisions.slice(0, 10)) {
    content += `### ${resp.question.text}\n`;
    content += `**Response:** ${JSON.stringify(resp.value)}\n`;
    content += `**Rationale:** Based on assessment requirements\n\n`;
  }

  if (decisions.length === 0) {
    content +=
      'No specific architecture decisions documented. Refer to the questionnaire responses for details.\n';
  }

  return content.trim();
}

function generateSecurityArchitecture(_responses: CompilerResponse[]): string {
  return `
## Security Architecture

### Authentication & Authorization
Based on the assessment responses, the system implements appropriate authentication and authorization controls.

### Data Protection
Data encryption and protection mechanisms are in place according to the security requirements.

### Network Security
Network security controls and segmentation follow industry best practices.

### Security Monitoring
Continuous security monitoring and alerting capabilities are configured.
    `.trim();
}

function generateTechnologyStack(_responses: CompilerResponse[]): string {
  return `
## Technology Stack

### Frontend Technologies
Modern frontend frameworks and libraries as specified in the assessment.

### Backend Technologies
Server-side technologies and frameworks based on requirements.

### Database Technologies
Data storage solutions appropriate for the use case.

### Infrastructure
Cloud and infrastructure components as documented.
    `.trim();
}

// === SDLC Playbook ===

export function compileSDLCPlaybook(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const devResponses = responses.filter(
    (r) =>
      r.question.dimension?.key === 'devops_iac' || r.question.dimension?.key === 'quality_test',
  );

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Development Process',
      content: generateDevelopmentProcess(devResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. CI/CD Pipeline',
      content: generateCICDPipeline(devResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Branching Strategy',
      content: generateBranchingStrategy(devResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Release Management',
      content: generateReleaseManagement(devResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'SDLC Playbook',
    category: DeliverableCategory.SDLC,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateDevelopmentProcess(_responses: CompilerResponse[]): string {
  return `
## Development Process

### Development Workflow
Agile development practices with iterative delivery cycles.

### Code Review Process
Peer review requirements and approval workflows.

### Quality Gates
Automated quality checks and CI/CD integration.
    `.trim();
}

function generateCICDPipeline(_responses: CompilerResponse[]): string {
  return `
## CI/CD Pipeline

### Build Stage
Automated build process with dependency management.

### Test Stage
Automated testing including unit, integration, and E2E tests.

### Deploy Stage
Deployment automation with rollback capabilities.

### Security Stage
SAST, DAST, and SCA scanning integration.
    `.trim();
}

function generateBranchingStrategy(_responses: CompilerResponse[]): string {
  return '## Branching Strategy\n\nGit flow or trunk-based development as appropriate.';
}

function generateReleaseManagement(_responses: CompilerResponse[]): string {
  return '## Release Management\n\nRelease planning and version control processes.';
}

// === Test Strategy ===

export function compileTestStrategy(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const testResponses = responses.filter((r) => r.question.dimension?.key === 'quality_test');

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Test Objectives',
      content: generateTestObjectives(testResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Test Types & Coverage',
      content: generateTestTypesCoverage(testResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Test Automation',
      content: generateTestAutomation(testResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Performance Testing',
      content: generatePerformanceTesting(testResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Test Strategy',
    category: DeliverableCategory.TESTING,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateTestObjectives(_responses: CompilerResponse[]): string {
  return '## Test Objectives\n\nQuality assurance goals and coverage targets.';
}

function generateTestTypesCoverage(_responses: CompilerResponse[]): string {
  return '## Test Types & Coverage\n\nUnit, integration, E2E, and performance testing requirements.';
}

function generateTestAutomation(_responses: CompilerResponse[]): string {
  return '## Test Automation\n\nAutomated testing framework and tooling.';
}

function generatePerformanceTesting(_responses: CompilerResponse[]): string {
  return '## Performance Testing\n\nLoad testing, stress testing, and benchmarking requirements.';
}
