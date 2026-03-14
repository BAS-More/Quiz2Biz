/**
 * Governance section builders: Policy & Governance Pack, Decision Log, Readiness Report.
 */
import { DecisionStatus } from '@prisma/client';
import {
  CompiledDocument,
  DocumentSection,
  DeliverableCategory,
  CompilerSession,
  CompilerResponse,
  CompilerDecision,
  CompilerEvidence,
} from '../compiler-types';
import {
  generateId,
  processAndCountWords,
  sumWordCounts,
  countSubSections,
} from '../compiler-utils';

// === Policy Document ===

export function compilePolicyDocument(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const policyResponses = responses.filter(
    (r) =>
      r.question.dimension?.key === 'governance_risk' ||
      r.question.dimension?.key === 'policy_ctrl',
  );

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Policies',
      content: generatePolicies(policyResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Standards',
      content: generateStandards(policyResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Procedures',
      content: generateProcedures(policyResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Control Mappings',
      content: generateControlMappings(policyResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Policy & Governance Pack',
    category: DeliverableCategory.GOVERNANCE,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generatePolicies(_responses: CompilerResponse[]): string {
  return '## Policies\n\nHigh-level governance policies and principles.';
}

function generateStandards(_responses: CompilerResponse[]): string {
  return '## Standards\n\nTechnical and operational standards.';
}

function generateProcedures(_responses: CompilerResponse[]): string {
  return '## Procedures\n\nOperational procedures and work instructions.';
}

function generateControlMappings(_responses: CompilerResponse[]): string {
  return '## Control Mappings\n\nISO 27001, NIST CSF, and OWASP control mappings.';
}

// === Decision Log ===

export function compileDecisionLog(
  _session: CompilerSession,
  decisions: CompilerDecision[],
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const sections: DocumentSection[] = [];

  const lockedDecisions = decisions.filter((d) => d.status === DecisionStatus.LOCKED);
  const draftDecisions = decisions.filter((d) => d.status === DecisionStatus.DRAFT);

  sections.push({
    id: generateId(),
    title: '1. Approved Decisions',
    content: formatDecisions(lockedDecisions),
    wordCount: 0,
    order: 0,
  });

  sections.push({
    id: generateId(),
    title: '2. Pending Decisions',
    content: formatDecisions(draftDecisions),
    wordCount: 0,
    order: 1,
  });

  sections.push({
    id: generateId(),
    title: '3. Decision Timeline',
    content: generateDecisionTimeline(decisions),
    wordCount: 0,
    order: 2,
  });

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Decision Log',
    category: DeliverableCategory.GOVERNANCE,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function formatDecisions(decisions: CompilerDecision[]): string {
  if (decisions.length === 0) {
    return 'No decisions in this category.\n';
  }

  let content = '';
  for (const decision of decisions) {
    content += `### ${decision.statement}\n`;
    content += `**Status:** ${decision.status}\n`;
    content += `**Created:** ${decision.createdAt.toISOString()}\n`;
    content += `**Description:** ${decision.description || 'N/A'}\n\n`;
  }
  return content;
}

function generateDecisionTimeline(decisions: CompilerDecision[]): string {
  if (decisions.length === 0) {
    return 'No decisions recorded.\n';
  }

  let content = '## Decision Timeline\n\n';
  const sorted = [...decisions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const decision of sorted) {
    content += `- **${decision.createdAt.toISOString().split('T')[0]}:** ${decision.statement} (${decision.status})\n`;
  }
  return content;
}

// === Readiness Report ===

export function compileReadinessReport(
  session: CompilerSession,
  dimensions: Record<string, number>,
  evidenceItems: CompilerEvidence[],
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Executive Summary',
      content: generateExecutiveSummary(session, dimensions),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Dimension Analysis',
      content: generateDimensionAnalysis(dimensions),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Evidence Summary',
      content: generateEvidenceSummary(evidenceItems),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. Gap Analysis',
      content: generateGapAnalysis(dimensions),
      wordCount: 0,
      order: 3,
    },
    {
      id: generateId(),
      title: '5. Recommendations',
      content: generateRecommendations(dimensions),
      wordCount: 0,
      order: 4,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Readiness Report',
    category: DeliverableCategory.READINESS,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateExecutiveSummary(session: CompilerSession, dimensions: Record<string, number>): string {
  const score = session.readinessScore ? Number(session.readinessScore) : 0;
  const dimensionCount = Object.keys(dimensions).length;

  return `
## Executive Summary

**Overall Readiness Score:** ${score.toFixed(1)}%

This readiness report summarizes the assessment results across ${dimensionCount} dimensions.

### Key Metrics
- Total Dimensions Assessed: ${dimensionCount}
- Assessment Completion: 100%
- Questionnaire Version: ${session.questionnaireVersion}
- Industry: ${session.industry || 'General'}
    `.trim();
}

function generateDimensionAnalysis(dimensions: Record<string, number>): string {
  let content = '## Dimension Analysis\n\n';
  content += '| Dimension | Score | Status |\n';
  content += '|-----------|-------|--------|\n';

  for (const [key, score] of Object.entries(dimensions)) {
    const status = score >= 80 ? 'Strong' : score >= 50 ? 'Adequate' : 'Needs Improvement';
    content += `| ${key} | ${score.toFixed(1)}% | ${status} |\n`;
  }

  return content;
}

function generateEvidenceSummary(evidenceItems: CompilerEvidence[]): string {
  const verified = evidenceItems.filter((e) => e.verified).length;
  const pending = evidenceItems.length - verified;

  return `
## Evidence Summary

**Total Evidence Items:** ${evidenceItems.length}
**Verified:** ${verified}
**Pending Verification:** ${pending}

Evidence items support the coverage claims across all dimensions.
    `.trim();
}

function generateGapAnalysis(dimensions: Record<string, number>): string {
  const gaps = Object.entries(dimensions)
    .filter(([_, score]) => score < 80)
    .sort((a, b) => a[1] - b[1]);

  let content = '## Gap Analysis\n\n';

  if (gaps.length === 0) {
    content += 'No significant gaps identified. All dimensions meet the target threshold.\n';
  } else {
    content += 'The following dimensions require attention:\n\n';
    for (const [key, score] of gaps) {
      content += `- **${key}**: ${score.toFixed(1)}% (Gap: ${(80 - score).toFixed(1)}%)\n`;
    }
  }

  return content;
}

function generateRecommendations(dimensions: Record<string, number>): string {
  const weakDimensions = Object.entries(dimensions)
    .filter(([_, score]) => score < 60)
    .map(([key]) => key);

  let content = '## Recommendations\n\n';

  if (weakDimensions.length === 0) {
    content += '1. Continue current practices and maintain documentation\n';
    content += '2. Schedule periodic re-assessment to track improvements\n';
    content += '3. Consider extending coverage to additional areas\n';
  } else {
    content += `Priority improvements needed in: ${weakDimensions.join(', ')}\n\n`;
    content += '1. Focus remediation efforts on low-scoring dimensions\n';
    content += '2. Implement recommended controls and practices\n';
    content += '3. Gather additional evidence to support coverage claims\n';
    content += '4. Schedule follow-up assessment in 30-60 days\n';
  }

  return content;
}
