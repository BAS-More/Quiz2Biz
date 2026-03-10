/**
 * Shared utility functions for the Deliverables Compiler.
 * Pure functions — no service dependencies.
 */
import * as crypto from 'crypto';
import {
  DocumentSection,
  CompiledDocument,
  PackSummary,
  DeliverableCategory,
} from './compiler-types';

/** Generate a unique ID for sections/documents */
export function generateId(): string {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

/** Count words in a string */
export function countWords(content: string): number {
  return content.split(/\s+/).filter((word) => word.length > 0).length;
}

/** Auto-section content if it exceeds max words */
export function autoSectionContent(content: string, maxWords: number): DocumentSection[] {
  const words = content.split(/\s+/);
  const wordCount = words.length;

  if (wordCount <= maxWords) {
    return [
      {
        id: generateId(),
        title: 'Content',
        content,
        wordCount,
        order: 0,
      },
    ];
  }

  const sections: DocumentSection[] = [];
  let currentWords: string[] = [];
  let sectionIndex = 0;

  for (const word of words) {
    currentWords.push(word);

    if (currentWords.length >= maxWords) {
      sections.push({
        id: generateId(),
        title: `Part ${sectionIndex + 1}`,
        content: currentWords.join(' '),
        wordCount: currentWords.length,
        order: sectionIndex,
      });
      currentWords = [];
      sectionIndex++;
    }
  }

  if (currentWords.length > 0) {
    sections.push({
      id: generateId(),
      title: `Part ${sectionIndex + 1}`,
      content: currentWords.join(' '),
      wordCount: currentWords.length,
      order: sectionIndex,
    });
  }

  return sections;
}

/** Process sections: count words and apply auto-sectioning */
export function processAndCountWords(
  sections: DocumentSection[],
  autoSection: boolean,
  maxWords: number,
): DocumentSection[] {
  return sections.map((section) => {
    const wc = countWords(section.content);

    if (autoSection && wc > maxWords) {
      const subSections = autoSectionContent(section.content, maxWords);
      return { ...section, wordCount: wc, subSections };
    }

    return { ...section, wordCount: wc };
  });
}

/** Sum word counts across sections */
export function sumWordCounts(sections: DocumentSection[]): number {
  return sections.reduce((sum, s) => sum + s.wordCount, 0);
}

/** Count sub-sections across sections */
export function countSubSections(sections: DocumentSection[]): number {
  return sections.reduce((sum, s) => sum + (s.subSections?.length || 0), 0);
}

/** Build summary statistics for the deliverables pack */
export function buildPackSummary(documents: CompiledDocument[]): PackSummary {
  const categories: Record<DeliverableCategory, number> = {
    [DeliverableCategory.ARCHITECTURE]: 0,
    [DeliverableCategory.SDLC]: 0,
    [DeliverableCategory.TESTING]: 0,
    [DeliverableCategory.DEVSECOPS]: 0,
    [DeliverableCategory.PRIVACY]: 0,
    [DeliverableCategory.OBSERVABILITY]: 0,
    [DeliverableCategory.FINANCE]: 0,
    [DeliverableCategory.GOVERNANCE]: 0,
    [DeliverableCategory.READINESS]: 0,
  };

  let totalWordCount = 0;
  let totalSections = 0;

  for (const doc of documents) {
    categories[doc.category]++;
    totalWordCount += doc.wordCount;
    totalSections += doc.sections.length + doc.subSectionCount;
  }

  const expectedCategories = Object.keys(categories).length;
  const presentCategories = Object.values(categories).filter((c) => c > 0).length;
  const completenessScore = Math.round((presentCategories / expectedCategories) * 100);

  return {
    totalDocuments: documents.length,
    totalSections,
    totalWordCount,
    categories,
    completenessScore,
  };
}
