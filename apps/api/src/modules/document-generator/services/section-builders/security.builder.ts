/**
 * Security & privacy section builders: DevSecOps Guide, Privacy & Data Protection.
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

// === DevSecOps Document ===

export function compileDevSecOpsDocument(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const securityResponses = responses.filter(
    (r) => r.question.dimension?.key === 'arch_sec' || r.question.dimension?.key === 'devops_iac',
  );

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Security Integration',
      content: generateSecurityIntegration(securityResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Vulnerability Management',
      content: generateVulnerabilityManagement(securityResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Compliance Automation',
      content: generateComplianceAutomation(securityResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Incident Response',
      content: generateIncidentResponse(securityResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'DevSecOps Guide',
    category: DeliverableCategory.DEVSECOPS,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateSecurityIntegration(_responses: CompilerResponse[]): string {
  return '## Security Integration\n\nShift-left security practices and DevSecOps integration.';
}

function generateVulnerabilityManagement(_responses: CompilerResponse[]): string {
  return '## Vulnerability Management\n\nVulnerability scanning and remediation processes.';
}

function generateComplianceAutomation(_responses: CompilerResponse[]): string {
  return '## Compliance Automation\n\nAutomated compliance checking and reporting.';
}

function generateIncidentResponse(_responses: CompilerResponse[]): string {
  return '## Incident Response\n\nSecurity incident detection and response procedures.';
}

// === Privacy & Data Protection Document ===

export function compilePrivacyDocument(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const privacyResponses = responses.filter((r) => r.question.dimension?.key === 'privacy_data');

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Data Classification',
      content: generateDataClassification(privacyResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Privacy Controls',
      content: generatePrivacyControls(privacyResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Data Retention',
      content: generateDataRetention(privacyResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. GDPR Compliance',
      content: generateGDPRCompliance(privacyResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Privacy & Data Protection',
    category: DeliverableCategory.PRIVACY,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateDataClassification(_responses: CompilerResponse[]): string {
  return '## Data Classification\n\nData sensitivity levels and handling requirements.';
}

function generatePrivacyControls(_responses: CompilerResponse[]): string {
  return '## Privacy Controls\n\nPrivacy protection mechanisms and controls.';
}

function generateDataRetention(_responses: CompilerResponse[]): string {
  return '## Data Retention\n\nData lifecycle management and retention policies.';
}

function generateGDPRCompliance(_responses: CompilerResponse[]): string {
  return '## GDPR Compliance\n\nGDPR requirements and compliance measures.';
}
