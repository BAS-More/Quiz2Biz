/**
 * Quality Scoring Service
 * 
 * Evaluates project facts against quality dimensions and benchmark criteria
 * to produce quality scores for document generation pricing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ExtractedFact, QualityDimension, Prisma } from '@prisma/client';
import {
  ProjectQualityScore,
  DimensionScore,
  CriteriaScore,
  QualityImprovement,
} from '../interfaces';

/**
 * Benchmark criterion from QualityDimension
 */
interface BenchmarkCriterion {
  key: string;
  description: string;
  weight: number;
}

@Injectable()
export class QualityScoringService {
  private readonly logger = new Logger(QualityScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate quality score for a project
   */
  async calculateProjectScore(
    projectId: string,
    projectTypeSlug: string,
  ): Promise<ProjectQualityScore> {
    this.logger.log(`Calculating quality score for project ${projectId}`);

    // Get project type
    const projectType = await this.prisma.projectType.findUnique({
      where: { slug: projectTypeSlug },
    });

    if (!projectType) {
      this.logger.warn(`Project type ${projectTypeSlug} not found`);
      return this.emptyScore(projectId);
    }

    // Get quality dimensions for this project type
    const dimensions = await this.prisma.qualityDimension.findMany({
      where: { projectTypeId: projectType.id },
      orderBy: { weight: 'desc' },
      take: 200,
    });

    if (dimensions.length === 0) {
      this.logger.warn(`No quality dimensions found for ${projectTypeSlug}`);
      return this.emptyScore(projectId);
    }

    // Get extracted facts for the project
    const facts = await this.prisma.extractedFact.findMany({
      where: { projectId },
      take: 1000,
      orderBy: { createdAt: 'asc' },
    });

    // Calculate dimension scores
    const dimensionScores = dimensions.map((dim) =>
      this.scoreDimension(dim, facts),
    );

    // Calculate overall scores
    const totalWeight = dimensionScores.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore =
      dimensionScores.reduce((sum, d) => sum + d.score * d.weight, 0) /
      (totalWeight || 1);

    const completenessScore = this.calculateCompleteness(facts, dimensions);
    const confidenceScore = this.calculateConfidence(facts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(dimensionScores);

    return {
      projectId,
      overallScore: Math.round(weightedScore),
      completenessScore,
      confidenceScore,
      dimensionScores,
      recommendations,
      scoredAt: new Date(),
    };
  }

  /**
   * Score a single dimension based on facts
   */
  private scoreDimension(
    dimension: QualityDimension,
    facts: ExtractedFact[],
  ): DimensionScore {
    // Parse benchmark criteria from JSON
    const criteria = this.parseBenchmarkCriteria(dimension.benchmarkCriteria);
    
    if (criteria.length === 0) {
      return {
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        weight: dimension.weight.toNumber(),
        score: 0,
        completeness: 0,
        criteriaScores: [],
      };
    }

    // Score each criterion
    const criteriaScores: CriteriaScore[] = criteria.map((criterion) => {
      // Find a fact that matches this criterion
      const matchingFact = this.findMatchingFact(criterion, facts);
      
      return {
        criterionKey: criterion.key,
        criterionDescription: criterion.description,
        met: matchingFact !== null,
        confidence: matchingFact?.confidence.toNumber() ?? 0,
        sourceFactKey: matchingFact?.fieldName,
      };
    });

    // Calculate dimension score
    const metCriteria = criteriaScores.filter((c) => c.met);
    const completeness = metCriteria.length / criteria.length;
    
    // Score is weighted average of met criteria confidence
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedConfidence = criteriaScores.reduce((sum, cs, i) => {
      if (!cs.met) {return sum;}
      return sum + cs.confidence * criteria[i].weight;
    }, 0);
    
    const score = totalWeight > 0 
      ? (weightedConfidence / totalWeight) * 100
      : 0;

    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      weight: dimension.weight.toNumber(),
      score: Math.round(score),
      completeness,
      criteriaScores,
    };
  }

  /**
   * Parse benchmark criteria from JSON
   */
  private parseBenchmarkCriteria(json: Prisma.JsonValue): BenchmarkCriterion[] {
    if (!json || !Array.isArray(json)) {
      return [];
    }

    return json.map((item: unknown) => {
      const criterion = item as Record<string, unknown>;
      return {
        key: String(criterion.key || ''),
        description: String(criterion.description || ''),
        weight: Number(criterion.weight || 1),
      };
    });
  }

  /**
   * Find a fact that matches a benchmark criterion
   */
  private findMatchingFact(
    criterion: BenchmarkCriterion,
    facts: ExtractedFact[],
  ): ExtractedFact | null {
    // Try exact key match first
    const exactMatch = facts.find(
      (f) => f.fieldName.toLowerCase() === criterion.key.toLowerCase(),
    );
    if (exactMatch) {return exactMatch;}

    // Try partial key match (criterion key might be part of fact field name)
    const partialMatch = facts.find((f) =>
      f.fieldName.toLowerCase().includes(criterion.key.toLowerCase()) ||
      criterion.key.toLowerCase().includes(f.fieldName.toLowerCase()),
    );
    if (partialMatch) {return partialMatch;}

    // Try matching based on category or description keywords
    const keywordMatch = facts.find((f) => {
      const keywords = criterion.description.toLowerCase().split(' ');
      return keywords.some(
        (kw) =>
          kw.length > 4 &&
          (f.fieldName.toLowerCase().includes(kw) ||
            f.fieldValue.toLowerCase().includes(kw)),
      );
    });

    return keywordMatch || null;
  }

  /**
   * Calculate overall completeness score
   */
  private calculateCompleteness(
    facts: ExtractedFact[],
    dimensions: QualityDimension[],
  ): number {
    // Count total expected criteria across all dimensions
    let totalCriteria = 0;
    let metCriteria = 0;

    for (const dim of dimensions) {
      const criteria = this.parseBenchmarkCriteria(dim.benchmarkCriteria);
      totalCriteria += criteria.length;
      
      for (const criterion of criteria) {
        if (this.findMatchingFact(criterion, facts)) {
          metCriteria++;
        }
      }
    }

    return totalCriteria > 0
      ? Math.round((metCriteria / totalCriteria) * 100)
      : 0;
  }

  /**
   * Calculate average confidence score
   */
  private calculateConfidence(facts: ExtractedFact[]): number {
    if (facts.length === 0) {return 0;}

    const avgConfidence =
      facts.reduce((sum, f) => sum + f.confidence.toNumber(), 0) / facts.length;

    return Math.round(avgConfidence * 100);
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    dimensionScores: DimensionScore[],
  ): string[] {
    const recommendations: string[] = [];

    // Sort by score (lowest first) to prioritize improvement areas
    const sortedDimensions = [...dimensionScores].sort(
      (a, b) => a.score - b.score,
    );

    for (const dim of sortedDimensions.slice(0, 3)) {
      if (dim.score < 50) {
        const unmetCriteria = dim.criteriaScores
          .filter((c) => !c.met)
          .slice(0, 2);

        if (unmetCriteria.length > 0) {
          const criteriaList = unmetCriteria
            .map((c) => c.criterionDescription)
            .join(', ');
          recommendations.push(
            `Improve "${dim.dimensionName}": Add information about ${criteriaList}`,
          );
        }
      }
    }

    if (recommendations.length === 0 && sortedDimensions[0]?.score < 80) {
      recommendations.push(
        'Continue the conversation to provide more details about your project',
      );
    }

    return recommendations;
  }

  /**
   * Get quality improvements for a project
   */
  async getImprovements(
    projectId: string,
    projectTypeSlug: string,
  ): Promise<QualityImprovement[]> {
    const score = await this.calculateProjectScore(projectId, projectTypeSlug);
    
    const improvements: QualityImprovement[] = score.dimensionScores
      .filter((d) => d.score < 80)
      .map((d) => {
        const missingCriteria = d.criteriaScores
          .filter((c) => !c.met)
          .map((c) => c.criterionDescription);

        const suggestedQuestions = missingCriteria.slice(0, 3).map((criterion) =>
          `Can you tell me more about ${criterion.toLowerCase()}?`,
        );

        return {
          dimensionId: d.dimensionId,
          dimensionName: d.dimensionName,
          currentScore: d.score,
          potentialScore: Math.min(100, d.score + 30),
          missingCriteria,
          suggestedQuestions,
        };
      })
      .sort((a, b) => a.currentScore - b.currentScore);

    return improvements;
  }

  /**
   * Return empty score for missing data
   */
  private emptyScore(projectId: string): ProjectQualityScore {
    return {
      projectId,
      overallScore: 0,
      completenessScore: 0,
      confidenceScore: 0,
      dimensionScores: [],
      recommendations: ['Start a conversation to begin building your project profile'],
      scoredAt: new Date(),
    };
  }

  /**
   * Save quality score to project
   */
  async saveProjectScore(
    projectId: string,
    score: ProjectQualityScore,
  ): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        qualityScore: new Prisma.Decimal(score.overallScore),
        lastActivityAt: new Date(),
      },
    });
  }
}
