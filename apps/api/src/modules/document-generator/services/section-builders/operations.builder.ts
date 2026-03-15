/**
 * Operations section builders: Observability Guide, Finance & Economics.
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

// === Observability Document ===

export function compileObservabilityDocument(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const obsResponses = responses.filter((r) => r.question.dimension?.key === 'observe_sre');

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Monitoring Strategy',
      content: generateMonitoringStrategy(obsResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Logging Architecture',
      content: generateLoggingArchitecture(obsResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Alerting & Runbooks',
      content: generateAlertingRunbooks(obsResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. SLOs & Error Budgets',
      content: generateSLOsErrorBudgets(obsResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Observability Guide',
    category: DeliverableCategory.OBSERVABILITY,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateMonitoringStrategy(_responses: CompilerResponse[]): string {
  return '## Monitoring Strategy\n\nApplication and infrastructure monitoring approach.';
}

function generateLoggingArchitecture(_responses: CompilerResponse[]): string {
  return '## Logging Architecture\n\nCentralized logging and log management.';
}

function generateAlertingRunbooks(_responses: CompilerResponse[]): string {
  return '## Alerting & Runbooks\n\nAlert configuration and incident runbooks.';
}

function generateSLOsErrorBudgets(_responses: CompilerResponse[]): string {
  return '## SLOs & Error Budgets\n\nService level objectives and error budget policies.';
}

// === Finance Document ===

export function compileFinanceDocument(
  _session: CompilerSession,
  responses: CompilerResponse[],
  _dimensions: Record<string, number>,
  autoSection: boolean,
  maxWords: number,
): CompiledDocument {
  const financeResponses = responses.filter((r) => r.question.dimension?.key === 'finance_unit');

  const sections: DocumentSection[] = [
    {
      id: generateId(),
      title: '1. Cost Analysis',
      content: generateCostAnalysis(financeResponses),
      wordCount: 0,
      order: 0,
    },
    {
      id: generateId(),
      title: '2. Unit Economics',
      content: generateUnitEconomics(financeResponses),
      wordCount: 0,
      order: 1,
    },
    {
      id: generateId(),
      title: '3. Budget Allocation',
      content: generateBudgetAllocation(financeResponses),
      wordCount: 0,
      order: 2,
    },
    {
      id: generateId(),
      title: '4. ROI Projections',
      content: generateROIProjections(financeResponses),
      wordCount: 0,
      order: 3,
    },
  ];

  const processedSections = processAndCountWords(sections, autoSection, maxWords);

  return {
    id: generateId(),
    title: 'Finance & Economics',
    category: DeliverableCategory.FINANCE,
    sections: processedSections,
    wordCount: sumWordCounts(processedSections),
    subSectionCount: countSubSections(processedSections),
    generatedAt: new Date(),
  };
}

function generateCostAnalysis(_responses: CompilerResponse[]): string {
  return '## Cost Analysis\n\nTotal cost of ownership and cost optimization.';
}

function generateUnitEconomics(_responses: CompilerResponse[]): string {
  return '## Unit Economics\n\nPer-unit cost analysis and profitability metrics.';
}

function generateBudgetAllocation(_responses: CompilerResponse[]): string {
  return '## Budget Allocation\n\nResource allocation and budget planning.';
}

function generateROIProjections(_responses: CompilerResponse[]): string {
  return '## ROI Projections\n\nReturn on investment analysis and projections.';
}
