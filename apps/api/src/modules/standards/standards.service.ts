import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { StandardCategory, EngineeringStandard } from '@prisma/client';
import {
  StandardResponse,
  StandardWithMappings,
  GeneratedStandardsSection,
  Principle,
  STANDARD_CATEGORY_TITLES,
} from './types/standard.types';

@Injectable()
export class StandardsService {
  private readonly logger = new Logger(StandardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<StandardResponse[]> {
    try {
      const standards = await this.prisma.engineeringStandard.findMany({
        where: { isActive: true },
        orderBy: { category: 'asc' },
      });

      return standards.map((standard) => this.mapToResponse(standard));
    } catch (error) {
      this.logger.error('Failed to fetch standards:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve standards. Please try again later.',
      );
    }
  }

  async findByCategory(category: StandardCategory): Promise<StandardResponse> {
    try {
      const standard = await this.prisma.engineeringStandard.findUnique({
        where: { category },
      });

      if (!standard) {
        throw new NotFoundException(`Standard category ${category} not found`);
      }

      return this.mapToResponse(standard);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch standard by category ${category}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve standard. Please try again later.',
      );
    }
  }

  async findWithMappings(category: StandardCategory): Promise<StandardWithMappings> {
    try {
      const standard = await this.prisma.engineeringStandard.findUnique({
        where: { category },
        include: {
          documentMappings: {
            include: {
              documentType: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: { priority: 'asc' },
          },
        },
      });

      if (!standard) {
        throw new NotFoundException(`Standard category ${category} not found`);
      }

      return {
        ...this.mapToResponse(standard),
        documentTypes: standard.documentMappings.map((mapping) => ({
          id: mapping.documentType.id,
          name: mapping.documentType.name,
          slug: mapping.documentType.slug,
          sectionTitle: mapping.sectionTitle ?? undefined,
          priority: mapping.priority,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch standard with mappings for ${category}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve standard. Please try again later.',
      );
    }
  }

  async getStandardsForDocument(documentTypeIdOrSlug: string): Promise<StandardResponse[]> {
    try {
      // Try to find by ID first, then by slug
      const documentType = await this.prisma.documentType.findFirst({
        where: {
          OR: [{ id: documentTypeIdOrSlug }, { slug: documentTypeIdOrSlug }],
        },
        include: {
          standardMappings: {
            where: {
              standard: {
                isActive: true,
              },
            },
            include: {
              standard: true,
            },
            orderBy: { priority: 'asc' },
          },
        },
      });

      if (!documentType) {
        throw new NotFoundException(`Document type ${documentTypeIdOrSlug} not found`);
      }

      return documentType.standardMappings.map((mapping) => this.mapToResponse(mapping.standard));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch standards for document ${documentTypeIdOrSlug}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve standards for document. Please try again later.',
      );
    }
  }

  async generateStandardsSection(documentTypeIdOrSlug: string): Promise<GeneratedStandardsSection> {
    try {
      const documentType = await this.prisma.documentType.findFirst({
        where: {
          OR: [{ id: documentTypeIdOrSlug }, { slug: documentTypeIdOrSlug }],
        },
        include: {
          standardMappings: {
            where: {
              standard: {
                isActive: true,
              },
            },
            include: {
              standard: true,
            },
            orderBy: { priority: 'asc' },
          },
        },
      });

      if (!documentType) {
        throw new NotFoundException(`Document type ${documentTypeIdOrSlug} not found`);
      }

      if (documentType.standardMappings.length === 0) {
        return {
          markdown: '',
          standards: [],
        };
      }

      const standards = documentType.standardMappings.map((mapping) => ({
        category: mapping.standard.category,
        title: mapping.sectionTitle || STANDARD_CATEGORY_TITLES[mapping.standard.category],
        principles: mapping.standard.principles as unknown as Principle[],
      }));

      const markdown = this.generateMarkdown(standards);

      return {
        markdown,
        standards,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to generate standards section for ${documentTypeIdOrSlug}:`, error);
      throw new InternalServerErrorException(
        'Failed to generate standards section. Please try again later.',
      );
    }
  }

  private generateMarkdown(
    standards: { category: StandardCategory; title: string; principles: Principle[] }[],
  ): string {
    if (standards.length === 0) {
      return '';
    }

    const lines: string[] = [
      '## Engineering Standards Applied',
      '',
      'This document adheres to the following engineering standards and best practices:',
      '',
    ];

    for (const standard of standards) {
      lines.push(`### ${standard.title}`);
      lines.push('');

      for (const principle of standard.principles) {
        lines.push(`- **${principle.title}**: ${principle.description}`);
      }

      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Standards Version: 2026*');

    return lines.join('\n');
  }

  private mapToResponse(standard: EngineeringStandard): StandardResponse {
    return {
      id: standard.id,
      category: standard.category,
      title: standard.title,
      description: standard.description,
      principles: standard.principles as unknown as Principle[],
      version: standard.version,
      isActive: standard.isActive,
    };
  }
}
