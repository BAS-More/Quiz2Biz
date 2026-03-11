import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
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
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly CACHE_KEY_ALL = 'standards:all';
  private static readonly CACHE_KEY_PREFIX = 'standards:category:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<StandardResponse[]> {
    try {
      // Check Redis cache first (GAP-P3)
      const cached = await this.getCached<StandardResponse[]>(StandardsService.CACHE_KEY_ALL);
      if (cached) {
        return cached;
      }

      const standards = await this.prisma.engineeringStandard.findMany({
        where: { isActive: true },
        orderBy: { category: 'asc' },
        take: 200,
      });

      const result = standards.map((standard: EngineeringStandard) => this.mapToResponse(standard));
      await this.setCache(StandardsService.CACHE_KEY_ALL, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch standards:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve standards. Please try again later.',
      );
    }
  }

  async findByCategory(category: StandardCategory): Promise<StandardResponse> {
    try {
      // Check Redis cache first (GAP-P3)
      const cacheKey = `${StandardsService.CACHE_KEY_PREFIX}${category}`;
      const cached = await this.getCached<StandardResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const standard = await this.prisma.engineeringStandard.findUnique({
        where: { category },
      });

      if (!standard) {
        throw new NotFoundException(`Standard category ${category} not found`);
      }

      const result = this.mapToResponse(standard);
      await this.setCache(cacheKey, result);
      return result;
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
        documentTypes: standard.documentMappings.map(
          (mapping: {
            documentType: { id: string; name: string; slug: string };
            sectionTitle: string | null;
            priority: number;
          }) => ({
            id: mapping.documentType.id,
            name: mapping.documentType.name,
            slug: mapping.documentType.slug,
            sectionTitle: mapping.sectionTitle ?? undefined,
            priority: mapping.priority,
          }),
        ),
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

      return documentType.standardMappings.map((mapping: { standard: EngineeringStandard }) =>
        this.mapToResponse(mapping.standard),
      );
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

      const standards = documentType.standardMappings.map(
        (mapping: { standard: EngineeringStandard; sectionTitle: string | null }) => ({
          category: mapping.standard.category,
          title: mapping.sectionTitle || STANDARD_CATEGORY_TITLES[mapping.standard.category],
          principles: mapping.standard.principles as unknown as Principle[],
        }),
      );

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

  // Redis cache helpers (GAP-P3)
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      this.logger.warn(`Cache read failed for ${key}`);
      return null;
    }
  }

  private async setCache(key: string, data: unknown): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(data), StandardsService.CACHE_TTL);
    } catch {
      this.logger.warn(`Cache write failed for ${key}`);
    }
  }

  /** Invalidate all standards caches — call on admin mutations */
  async invalidateCache(): Promise<void> {
    try {
      const keys = await this.redis.keys('standards:*');
      for (const key of keys) {
        await this.redis.del(key);
      }
    } catch {
      this.logger.warn('Standards cache invalidation failed');
    }
  }
}
