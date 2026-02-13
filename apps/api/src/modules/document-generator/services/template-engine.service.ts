import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DocumentCategory } from '@prisma/client';

export interface TemplateData {
  metadata: {
    documentType: string;
    category: DocumentCategory;
    generatedAt: Date;
    version: string;
  };
  content: Record<string, unknown>;
  standards?: StandardSection[];
}

export interface StandardSection {
  category: string;
  title: string;
  description: string;
  principles: {
    title: string;
    description: string;
  }[];
}

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assemble template data from session responses
   */
  async assembleTemplateData(sessionId: string, documentTypeSlug: string): Promise<TemplateData> {
    // Fetch document type
    const documentType = await this.prisma.documentType.findUnique({
      where: { slug: documentTypeSlug },
      include: {
        standardMappings: {
          include: {
            standard: true,
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!documentType) {
      throw new NotFoundException(`Document type with slug '${documentTypeSlug}' not found`);
    }

    // Fetch all responses for the session with their question mappings
    const responses = await this.prisma.response.findMany({
      where: {
        sessionId,
        isValid: true,
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            type: true,
            documentMappings: true,
            options: true,
          },
        },
      },
    });

    // Build content object from responses
    const content = this.mapResponsesToContent(responses, documentTypeSlug);

    // Build standards section for CTO documents
    let standards: StandardSection[] | undefined;
    if (
      documentType.category === DocumentCategory.CTO &&
      documentType.standardMappings.length > 0
    ) {
      standards = this.buildStandardsSections(documentType.standardMappings);
    }

    return {
      metadata: {
        documentType: documentType.name,
        category: documentType.category,
        generatedAt: new Date(),
        version: '1.0',
      },
      content,
      standards,
    };
  }

  /**
   * Map responses to nested content object using documentMappings
   */
  private mapResponsesToContent(
    responses: Array<{
      value: unknown;
      question: {
        id: string;
        text: string;
        type: string;
        documentMappings: unknown;
        options: unknown;
      };
    }>,
    documentTypeSlug: string,
  ): Record<string, unknown> {
    const content: Record<string, unknown> = {};

    for (const response of responses) {
      const mappings = response.question.documentMappings as Record<string, string> | null;

      if (!mappings || !mappings[documentTypeSlug]) {
        continue;
      }

      const path = mappings[documentTypeSlug];
      const value = this.extractResponseValue(response);

      this.setNestedValue(content, path, value);
    }

    return content;
  }

  /**
   * Extract the actual value from a response based on question type
   */
  private extractResponseValue(response: {
    value: unknown;
    question: {
      type: string;
      options: unknown;
    };
  }): unknown {
    const { value, question } = response;
    const responseValue = value as Record<string, unknown>;

    switch (question.type) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'URL':
        return responseValue.text ?? '';

      case 'NUMBER':
        return responseValue.number ?? 0;

      case 'DATE':
        return responseValue.date ?? null;

      case 'SCALE':
        return responseValue.rating ?? 0;

      case 'SINGLE_CHOICE': {
        const selectedId = responseValue.selectedOptionId as string;
        const options = question.options as Array<{
          value: string;
          label: string;
        }> | null;
        const selected = options?.find((o) => o.value === selectedId);
        return selected?.label ?? selectedId;
      }

      case 'MULTIPLE_CHOICE': {
        const selectedIds = responseValue.selectedOptionIds as string[];
        const options = question.options as Array<{
          value: string;
          label: string;
        }> | null;
        return (
          selectedIds?.map((id) => {
            const option = options?.find((o) => o.value === id);
            return option?.label ?? id;
          }) ?? []
        );
      }

      case 'FILE_UPLOAD':
        return responseValue.fileUrl ?? null;

      case 'MATRIX':
        return responseValue.matrix ?? {};

      default:
        return value;
    }
  }

  /**
   * Set a value at a nested path using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Build standards sections for CTO documents
   */
  private buildStandardsSections(
    mappings: Array<{
      sectionTitle: string | null;
      standard: {
        category: string;
        title: string;
        description: string;
        principles: unknown;
      };
    }>,
  ): StandardSection[] {
    return mappings.map((mapping) => ({
      category: mapping.standard.category,
      title: mapping.sectionTitle ?? mapping.standard.title,
      description: mapping.standard.description,
      principles: (
        mapping.standard.principles as Array<{
          title: string;
          description: string;
        }>
      ).slice(0, 5), // Limit to top 5 principles per section
    }));
  }

  /**
   * Get value from template data using dot notation path
   */
  getValue(data: TemplateData, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = data.content;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Check if all required fields are present in template data
   */
  validateRequiredFields(
    data: TemplateData,
    requiredPaths: string[],
  ): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const path of requiredPaths) {
      const value = this.getValue(data, path);
      if (value === undefined || value === null || value === '') {
        missingFields.push(path);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}
