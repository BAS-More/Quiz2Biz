/**
 * Facts Controller
 * REST endpoints for managing extracted facts
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { PrismaService } from '@libs/database';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

interface JwtUser {
  id: string;
  email: string;
}

class UpdateFactDto {
  @IsOptional()
  @IsString()
  fieldValue?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

interface FactResponse {
  id: string;
  projectId: string;
  fieldName: string;
  fieldValue: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  sourceMessageId?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FactsListResponse {
  projectId: string;
  projectName: string;
  facts: FactResponse[];
  factsByCategory: Record<string, FactResponse[]>;
  totalFacts: number;
  verifiedCount: number;
  highConfidenceCount: number;
}

@Controller('api/v1/facts')
@UseGuards(JwtAuthGuard)
export class FactsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all facts for a project
   * GET /api/v1/facts/:projectId
   */
  @Get(':projectId')
  async getProjectFacts(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<FactsListResponse> {
    // Verify project belongs to user's organization
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organization: { users: { some: { id: user.id } } } },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all facts
    const facts = await this.prisma.extractedFact.findMany({
      where: { projectId },
      orderBy: [{ category: 'asc' }, { fieldName: 'asc' }],
    });

    // Transform to response format
    const transformedFacts: FactResponse[] = facts.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      fieldName: f.fieldName,
      fieldValue: f.fieldValue,
      category: f.category ?? 'general',
      confidence: this.decimalToConfidence(f.confidence.toNumber()),
      sourceMessageId: f.sourceMessageId ?? undefined,
      isVerified: f.confirmedByUser,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    // Group by category
    const factsByCategory: Record<string, FactResponse[]> = {};
    for (const fact of transformedFacts) {
      if (!factsByCategory[fact.category]) {
        factsByCategory[fact.category] = [];
      }
      factsByCategory[fact.category].push(fact);
    }

    return {
      projectId,
      projectName: project.name,
      facts: transformedFacts,
      factsByCategory,
      totalFacts: transformedFacts.length,
      verifiedCount: transformedFacts.filter((f) => f.isVerified).length,
      highConfidenceCount: transformedFacts.filter((f) => f.confidence === 'high').length,
    };
  }

  /**
   * Update a fact
   * PATCH /api/v1/facts/:factId
   */
  @Patch(':factId')
  async updateFact(
    @Param('factId') factId: string,
    @Body() dto: UpdateFactDto,
    @CurrentUser() user: JwtUser,
  ): Promise<FactResponse> {
    // Get fact and verify ownership through organization membership
    const fact = await this.prisma.extractedFact.findFirst({
      where: {
        id: factId,
        project: { organization: { users: { some: { id: user.id } } } },
      },
      include: { project: true },
    });

    if (!fact) {
      throw new NotFoundException('Fact not found');
    }

    // Update
    const updated = await this.prisma.extractedFact.update({
      where: { id: factId },
      data: {
        ...(dto.fieldValue !== undefined && { fieldValue: dto.fieldValue }),
        ...(dto.isVerified !== undefined && { confirmedByUser: dto.isVerified }),
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      fieldName: updated.fieldName,
      fieldValue: updated.fieldValue,
      category: updated.category ?? 'general',
      confidence: this.decimalToConfidence(updated.confidence.toNumber()),
      sourceMessageId: updated.sourceMessageId ?? undefined,
      isVerified: updated.confirmedByUser,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a fact
   * DELETE /api/v1/facts/:factId
   */
  @Delete(':factId')
  async deleteFact(
    @Param('factId') factId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    // Get fact and verify ownership through organization membership
    const fact = await this.prisma.extractedFact.findFirst({
      where: {
        id: factId,
        project: { organization: { users: { some: { id: user.id } } } },
      },
    });

    if (!fact) {
      throw new NotFoundException('Fact not found');
    }

    await this.prisma.extractedFact.delete({
      where: { id: factId },
    });
  }

  /**
   * Verify all facts for a project
   * POST /api/v1/facts/:projectId/verify-all
   */
  @Post(':projectId/verify-all')
  async verifyAllFacts(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    // Verify project belongs to user's organization
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organization: { users: { some: { id: user.id } } } },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.extractedFact.updateMany({
      where: { projectId },
      data: { confirmedByUser: true },
    });
  }

  /**
   * Convert decimal confidence to level string
   */
  private decimalToConfidence(value: number): 'high' | 'medium' | 'low' {
    if (value >= 0.8) {return 'high';}
    if (value >= 0.5) {return 'medium';}
    return 'low';
  }
}
