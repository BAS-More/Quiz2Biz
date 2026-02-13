import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import {
  HeatmapResultDto,
  HeatmapCellDto,
  HeatmapSummaryDto,
  HeatmapDrilldownDto,
  SeverityBucket,
  SeverityBuckets,
  HeatmapColor,
  HeatmapColors,
} from './dto';

/**
 * Gap Heatmap Generator Service
 *
 * Generates dimension × severity matrix for visualizing readiness gaps.
 * Each cell shows: Sum(Severity × (1 - Coverage)) for questions in that bucket.
 *
 * Color coding:
 * - Green: Residual <= 0.05 (low risk)
 * - Amber: Residual 0.05 - 0.15 (moderate risk)
 * - Red: Residual > 0.15 (high risk)
 */
@Injectable()
export class HeatmapService {
  private readonly logger = new Logger(HeatmapService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly DEFAULT_SEVERITY = 0.7; // §16 risk control

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Generate complete heatmap for a session.
   */
  async generateHeatmap(sessionId: string): Promise<HeatmapResultDto> {
    const startTime = Date.now();

    // Check cache first
    const cached = await this.getCachedHeatmap(sessionId);
    if (cached) {
      this.logger.debug(`Heatmap cache hit for session ${sessionId}`);
      return cached;
    }

    // Load data
    const { dimensions, questions, responses } = await this.loadData(sessionId);

    // Generate cells
    const cells = this.generateCells(dimensions, questions, responses);

    // Calculate summary
    const summary = this.calculateSummary(cells);

    const result: HeatmapResultDto = {
      sessionId,
      cells,
      dimensions: dimensions.map((d: { displayName: string }) => d.displayName),
      severityBuckets: SeverityBuckets.order,
      summary,
      generatedAt: new Date(),
    };

    // Cache result
    await this.cacheHeatmap(sessionId, result);

    const elapsed = Date.now() - startTime;
    this.logger.log(`Heatmap generated for session ${sessionId} in ${elapsed}ms`);

    return result;
  }

  /**
   * Export heatmap to CSV format.
   */
  async exportToCsv(sessionId: string): Promise<string> {
    const result = await this.generateHeatmap(sessionId);
    const lines: string[] = [];

    // Header row
    lines.push('Dimension,' + SeverityBuckets.order.join(','));

    // Group cells by dimension
    const cellsByDimension = this.groupBy(result.cells, (c) => c.dimensionKey);

    for (const [dimKey, dimCells] of Object.entries(cellsByDimension)) {
      const values = [dimKey];
      for (const bucket of SeverityBuckets.order) {
        const cell = dimCells.find((c) => c.severityBucket === bucket);
        values.push(cell?.cellValue.toFixed(4) ?? '0.0000');
      }
      lines.push(values.join(','));
    }

    // Summary
    lines.push('');
    lines.push('# Summary');
    lines.push(`Total Cells,${result.summary.totalCells}`);
    lines.push(`Green (<=0.05),${result.summary.greenCells}`);
    lines.push(`Amber (0.05-0.15),${result.summary.amberCells}`);
    lines.push(`Red (>0.15),${result.summary.redCells}`);
    lines.push(`Critical Gaps,${result.summary.criticalGapCount}`);
    lines.push(`Overall Risk Score,${result.summary.overallRiskScore.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Export heatmap to Markdown format.
   */
  async exportToMarkdown(sessionId: string): Promise<string> {
    const result = await this.generateHeatmap(sessionId);
    const lines: string[] = [];

    lines.push('# Gap Heatmap Report');
    lines.push('');
    lines.push(`**Session ID:** ${sessionId}`);
    lines.push(`**Generated:** ${result.generatedAt.toISOString()}`);
    lines.push('');

    // Table header
    lines.push('| Dimension | ' + SeverityBuckets.order.join(' | ') + ' |');
    lines.push(
      '|' +
        Array(SeverityBuckets.order.length + 1)
          .fill('---')
          .join('|') +
        '|',
    );

    // Group cells by dimension
    const cellsByDimension = this.groupBy(result.cells, (c) => c.dimensionKey);

    for (const [dimKey, dimCells] of Object.entries(cellsByDimension)) {
      const row = [dimKey];
      for (const bucket of SeverityBuckets.order) {
        const cell = dimCells.find((c) => c.severityBucket === bucket);
        if (cell) {
          const emoji =
            cell.colorCode === HeatmapColor.GREEN
              ? 'G'
              : cell.colorCode === HeatmapColor.AMBER
                ? 'A'
                : 'R';
          row.push(`${emoji} ${cell.cellValue.toFixed(2)}`);
        } else {
          row.push('G 0.00');
        }
      }
      lines.push('| ' + row.join(' | ') + ' |');
    }

    // Summary section
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Cells | ${result.summary.totalCells} |`);
    lines.push(`| Green (<=0.05) | ${result.summary.greenCells} |`);
    lines.push(`| Amber (0.05-0.15) | ${result.summary.amberCells} |`);
    lines.push(`| Red (>0.15) | ${result.summary.redCells} |`);
    lines.push(`| Critical Gaps | ${result.summary.criticalGapCount} |`);
    lines.push(`| Overall Risk Score | ${result.summary.overallRiskScore.toFixed(2)}% |`);

    // Legend
    lines.push('');
    lines.push('## Legend');
    lines.push('');
    lines.push('- **Cell Value**: Sum(Severity × (1 - Coverage)) for questions in that bucket');
    lines.push('- **G Green**: Residual <= 0.05 (low risk)');
    lines.push('- **A Amber**: Residual 0.05 - 0.15 (moderate risk)');
    lines.push('- **R Red**: Residual > 0.15 (high risk)');

    return lines.join('\n');
  }

  /**
   * Get heatmap summary statistics only.
   */
  async getSummary(sessionId: string): Promise<HeatmapSummaryDto> {
    const result = await this.generateHeatmap(sessionId);
    return result.summary;
  }

  /**
   * Get filtered cells from heatmap.
   */
  async getCells(
    sessionId: string,
    dimension?: string,
    severity?: string,
  ): Promise<HeatmapCellDto[]> {
    const result = await this.generateHeatmap(sessionId);
    let cells = result.cells;

    if (dimension) {
      cells = cells.filter((c) => c.dimensionKey.toLowerCase() === dimension.toLowerCase());
    }
    if (severity) {
      cells = cells.filter((c) => c.severityBucket.toLowerCase() === severity.toLowerCase());
    }

    return cells;
  }

  /**
   * Drilldown into a specific heatmap cell.
   */
  async drilldown(
    sessionId: string,
    dimensionKey: string,
    severityBucket: string,
  ): Promise<HeatmapDrilldownDto> {
    const { dimensions, questions, responses } = await this.loadData(sessionId);

    // Find matching cell
    const result = await this.generateHeatmap(sessionId);
    const cell = result.cells.find(
      (c) =>
        c.dimensionKey.toLowerCase() === dimensionKey.toLowerCase() &&
        c.severityBucket.toLowerCase() === severityBucket.toLowerCase(),
    );

    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    // Build response lookup
    const responseLookup = new Map(
      responses.map((r: { questionId: string; coverage: any; value?: any }) => [r.questionId, r]),
    );

    // Get questions for this cell
    const bucket = severityBucket as SeverityBucket;
    const dim = dimensions.find(
      (d: { key: string; displayName: string }) =>
        d.key.toLowerCase() === dimensionKey.toLowerCase(),
    );

    const cellQuestions = questions
      .filter((q: { dimensionKey: string | null }) => q.dimensionKey === dim?.key)
      .filter(
        (q: { severity: any }) => SeverityBuckets.getBucket(Number(q.severity || this.DEFAULT_SEVERITY)) === bucket,
      )
      .map((q: { id: string; text: string; severity: any }) => {
        const response = responseLookup.get(q.id) as { coverage: any; value?: any } | undefined;
        const coverage = response?.coverage ? Number(response.coverage) : 0;
        const severity = Number(q.severity || this.DEFAULT_SEVERITY);
        return {
          questionId: q.id,
          questionText: q.text,
          severity,
          coverage,
          residualRisk: severity * (1 - coverage),
          responseValue: response?.value?.toString(),
        };
      });

    const potentialImprovement = cellQuestions.reduce((sum, q) => sum + q.residualRisk, 0);

    return {
      dimensionKey: cell.dimensionKey,
      dimensionName: dim?.displayName || cell.dimensionKey,
      severityBucket: cell.severityBucket,
      cellValue: cell.cellValue,
      colorCode: cell.colorCode,
      questionCount: cellQuestions.length,
      questions: cellQuestions,
      cell,
      potentialImprovement,
    };
  }

  /**
   * Invalidate heatmap cache for a session.
   */
  async invalidateCache(sessionId: string): Promise<void> {
    const cacheKey = `heatmap:${sessionId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Heatmap cache invalidated for session ${sessionId}`);
  }

  // ========================================
  // Private helpers
  // ========================================

  private async loadData(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { questionnaire: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const dimensions = await this.prisma.dimensionCatalog.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    // Filter questions by session persona
    const questions = await this.prisma.question.findMany({
      where: {
        section: {
          questionnaireId: session.questionnaireId,
        },
        dimensionKey: { not: null },
        ...(session.persona && { persona: session.persona }),
      },
    });

    const responses = await this.prisma.response.findMany({
      where: { sessionId },
    });

    return { session, dimensions, questions, responses };
  }

  private generateCells(
    dimensions: Array<{ key: string; displayName: string }>,
    questions: Array<{ id: string; dimensionKey: string | null; severity: any }>,
    responses: Array<{ questionId: string; coverage: any }>,
  ): HeatmapCellDto[] {
    const responseLookup = new Map(responses.map((r) => [r.questionId, r]));
    const cells: HeatmapCellDto[] = [];

    for (const dimension of dimensions) {
      const dimQuestions = questions.filter((q) => q.dimensionKey === dimension.key);

      for (const bucket of SeverityBuckets.order) {
        const bucketQuestions = dimQuestions.filter(
          (q) => SeverityBuckets.getBucket(Number(q.severity || this.DEFAULT_SEVERITY)) === bucket,
        );

        let cellValue = 0;
        for (const q of bucketQuestions) {
          const response = responseLookup.get(q.id);
          const coverage = response?.coverage ? Number(response.coverage) : 0;
          const severity = Number(q.severity || this.DEFAULT_SEVERITY);
          cellValue += severity * (1 - coverage);
        }

        cells.push(
          new HeatmapCellDto({
            dimensionId: dimension.key, // Use key as identifier
            dimensionKey: dimension.key,
            severityBucket: bucket,
            cellValue: Math.round(cellValue * 10000) / 10000,
            colorCode: HeatmapColors.getColor(cellValue),
            questionCount: bucketQuestions.length,
          }),
        );
      }
    }

    return cells;
  }

  private calculateSummary(cells: HeatmapCellDto[]): HeatmapSummaryDto {
    const greenCells = cells.filter((c) => c.colorCode === HeatmapColor.GREEN).length;
    const amberCells = cells.filter((c) => c.colorCode === HeatmapColor.AMBER).length;
    const redCells = cells.filter((c) => c.colorCode === HeatmapColor.RED).length;
    const criticalGapCount = cells.filter(
      (c) => c.severityBucket === SeverityBucket.CRITICAL && c.colorCode === HeatmapColor.RED,
    ).length;
    const overallRiskScore = cells.reduce((sum, c) => sum + c.cellValue, 0);

    return {
      totalCells: cells.length,
      greenCells,
      amberCells,
      redCells,
      criticalGapCount,
      overallRiskScore: Math.round(overallRiskScore * 100) / 100,
    };
  }

  private async getCachedHeatmap(sessionId: string): Promise<HeatmapResultDto | null> {
    try {
      const cacheKey = `heatmap:${sessionId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        result.generatedAt = new Date(result.generatedAt);
        return result;
      }
    } catch (error) {
      this.logger.warn(`Failed to get cached heatmap for ${sessionId}`, error);
    }
    return null;
  }

  private async cacheHeatmap(sessionId: string, result: HeatmapResultDto): Promise<void> {
    try {
      const cacheKey = `heatmap:${sessionId}`;
      await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache heatmap for ${sessionId}`, error);
    }
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Get severity multiplier for priority calculations
   */
  private getSeverityMultiplier(bucket: SeverityBucket): number {
    switch (bucket) {
      case SeverityBucket.CRITICAL:
        return 2.0;
      case SeverityBucket.HIGH:
        return 1.5;
      case SeverityBucket.MEDIUM:
        return 1.0;
      case SeverityBucket.LOW:
        return 0.5;
      default:
        return 1.0;
    }
  }

  /**
   * Compare heatmaps between two sessions
   * Useful for tracking progress over time
   */
  async compareHeatmaps(sessionId1: string, sessionId2: string): Promise<HeatmapComparisonResult> {
    const [heatmap1, heatmap2] = await Promise.all([
      this.generateHeatmap(sessionId1),
      this.generateHeatmap(sessionId2),
    ]);

    const comparisons: CellComparison[] = [];

    // Create lookup for second heatmap
    const heatmap2Lookup = new Map<string, HeatmapCellDto>();
    for (const cell of heatmap2.cells) {
      const key = `${cell.dimensionKey}:${cell.severityBucket}`;
      heatmap2Lookup.set(key, cell);
    }

    // Compare cells
    for (const cell1 of heatmap1.cells) {
      const key = `${cell1.dimensionKey}:${cell1.severityBucket}`;
      const cell2 = heatmap2Lookup.get(key);

      const change = cell2 ? cell1.cellValue - cell2.cellValue : cell1.cellValue;
      let trend: 'IMPROVED' | 'DEGRADED' | 'STABLE';

      if (Math.abs(change) < 0.01) {
        trend = 'STABLE';
      } else if (change < 0) {
        trend = 'IMPROVED'; // Lower residual is better
      } else {
        trend = 'DEGRADED';
      }

      comparisons.push({
        dimensionKey: cell1.dimensionKey,
        severityBucket: cell1.severityBucket,
        session1Value: cell1.cellValue,
        session2Value: cell2?.cellValue ?? 0,
        absoluteChange: Math.round(change * 10000) / 10000,
        percentageChange: cell2?.cellValue
          ? Math.round((change / cell2.cellValue) * 10000) / 100
          : 0,
        trend,
      });
    }

    // Calculate overall improvement
    const totalChange = heatmap1.summary.overallRiskScore - heatmap2.summary.overallRiskScore;
    const improved = comparisons.filter((c) => c.trend === 'IMPROVED').length;
    const degraded = comparisons.filter((c) => c.trend === 'DEGRADED').length;

    return {
      session1Id: sessionId1,
      session2Id: sessionId2,
      session1GeneratedAt: heatmap1.generatedAt,
      session2GeneratedAt: heatmap2.generatedAt,
      comparisons,
      summary: {
        totalCells: comparisons.length,
        improvedCells: improved,
        degradedCells: degraded,
        stableCells: comparisons.length - improved - degraded,
        overallRiskChange: Math.round(totalChange * 100) / 100,
        overallTrend: totalChange < -0.1 ? 'IMPROVED' : totalChange > 0.1 ? 'DEGRADED' : 'STABLE',
      },
    };
  }

  /**
   * Get priority-ranked gaps for action planning
   * Returns cells sorted by impact potential
   */
  async getPriorityGaps(sessionId: string, limit: number = 10): Promise<PriorityGap[]> {
    const result = await this.generateHeatmap(sessionId);
    const { dimensions, questions, responses } = await this.loadData(sessionId);

    // Get dimension weights
    const dimensionWeights = new Map(
      dimensions.map((d: { key: string; weight: any }) => [d.key, Number(d.weight || 0.1)]),
    );

    const responseLookup = new Map(
      responses.map((r: { questionId: string; coverage: any }) => [r.questionId, r]),
    );

    // Calculate priority score for each cell
    const priorityGaps: PriorityGap[] = [];

    for (const cell of result.cells) {
      if (cell.colorCode === HeatmapColor.GREEN) {
        continue;
      } // Skip low-risk cells

      const dimensionWeight = dimensionWeights.get(cell.dimensionKey) || 0.1;
      const severityMultiplier = this.getSeverityMultiplier(cell.severityBucket as SeverityBucket);

      // Priority score = cell value × dimension weight × severity multiplier
      const priorityScore = cell.cellValue * dimensionWeight * severityMultiplier;

      // Get questions contributing to this cell
      const cellQuestions = questions
        .filter((q: { dimensionKey: string | null }) => q.dimensionKey === cell.dimensionKey)
        .filter(
          (q: { severity: any }) =>
            SeverityBuckets.getBucket(Number(q.severity || this.DEFAULT_SEVERITY)) === cell.severityBucket,
        )
        .map((q: { id: string; text: string; severity: any }) => {
          const response = responseLookup.get(q.id) as { coverage: any } | undefined;
          const coverage = response?.coverage ? Number(response.coverage) : 0;
          return {
            questionId: q.id,
            text: q.text,
            currentCoverage: coverage,
            potentialGain: Number(q.severity || this.DEFAULT_SEVERITY) * (1 - coverage),
          };
        })
        .sort(
          (a: { potentialGain: number }, b: { potentialGain: number }) =>
            b.potentialGain - a.potentialGain,
        )
        .slice(0, 3); // Top 3 questions per cell

      priorityGaps.push({
        dimensionKey: cell.dimensionKey,
        severityBucket: cell.severityBucket,
        colorCode: cell.colorCode,
        cellValue: cell.cellValue,
        priorityScore: Math.round(priorityScore * 10000) / 10000,
        questionCount: cell.questionCount,
        topQuestions: cellQuestions,
        recommendation: this.generateGapRecommendation(cell, cellQuestions),
      });
    }

    // Sort by priority score (descending)
    priorityGaps.sort((a, b) => b.priorityScore - a.priorityScore);

    return priorityGaps.slice(0, limit);
  }

  /**
   * Generate action plan from heatmap
   * Returns structured improvement recommendations
   */
  async generateActionPlan(sessionId: string): Promise<ActionPlan> {
    const priorityGaps = await this.getPriorityGaps(sessionId, 20);
    const result = await this.generateHeatmap(sessionId);

    const phases: ActionPhase[] = [];

    // Phase 1: Critical gaps (red cells in critical/high severity)
    const criticalGaps = priorityGaps.filter(
      (g) =>
        String(g.colorCode) === String(HeatmapColor.RED) &&
        (String(g.severityBucket) === String(SeverityBucket.CRITICAL) ||
          String(g.severityBucket) === String(SeverityBucket.HIGH)),
    );
    if (criticalGaps.length > 0) {
      phases.push({
        name: 'Immediate Priority',
        description: 'Address critical gaps that pose significant risk',
        duration: '1-2 weeks',
        gaps: criticalGaps.slice(0, 5),
        estimatedImpact: this.calculatePhaseImpact(criticalGaps.slice(0, 5)),
      });
    }

    // Phase 2: High-value improvements (amber and red cells)
    const highValueGaps = priorityGaps.filter(
      (g) => !criticalGaps.includes(g) && g.colorCode !== HeatmapColor.GREEN,
    );
    if (highValueGaps.length > 0) {
      phases.push({
        name: 'Quick Wins',
        description: 'High-impact improvements with moderate effort',
        duration: '2-4 weeks',
        gaps: highValueGaps.slice(0, 5),
        estimatedImpact: this.calculatePhaseImpact(highValueGaps.slice(0, 5)),
      });
    }

    // Phase 3: Remaining gaps
    const remainingGaps = priorityGaps.filter(
      (g) => !criticalGaps.includes(g) && !highValueGaps.slice(0, 5).includes(g),
    );
    if (remainingGaps.length > 0) {
      phases.push({
        name: 'Continuous Improvement',
        description: 'Address remaining gaps for comprehensive coverage',
        duration: '1-3 months',
        gaps: remainingGaps.slice(0, 5),
        estimatedImpact: this.calculatePhaseImpact(remainingGaps.slice(0, 5)),
      });
    }

    const totalEstimatedImpact = phases.reduce((sum, p) => sum + p.estimatedImpact, 0);
    const projectedScore = Math.min(100, result.summary.overallRiskScore + totalEstimatedImpact);

    return {
      sessionId,
      generatedAt: new Date(),
      currentRiskScore: result.summary.overallRiskScore,
      projectedRiskScore: Math.round(projectedScore * 100) / 100,
      totalGapsIdentified: priorityGaps.length,
      phases,
      summary: {
        totalActions: phases.reduce((sum, p) => sum + p.gaps.length, 0),
        estimatedDuration: phases.length > 0 ? phases[phases.length - 1].duration : 'N/A',
        expectedImprovement: Math.round(totalEstimatedImpact * 100) / 100,
      },
    };
  }

  /**
   * Export heatmap as JSON for visualization tools
   */
  async exportToVisualizationFormat(sessionId: string): Promise<VisualizationData> {
    const result = await this.generateHeatmap(sessionId);
    const { dimensions } = await this.loadData(sessionId);

    // Transform for D3.js / Chart.js compatible format
    const matrix: number[][] = [];
    const dimensionLabels: string[] = [];

    const cellsByDimension = this.groupBy(result.cells, (c) => c.dimensionKey);

    for (const dim of dimensions as Array<{ key: string; displayName: string }>) {
      const dimCells = cellsByDimension[dim.key] || [];
      dimensionLabels.push(dim.displayName);

      const row: number[] = [];
      for (const bucket of SeverityBuckets.order) {
        const cell = dimCells.find((c) => c.severityBucket === bucket);
        row.push(cell?.cellValue || 0);
      }
      matrix.push(row);
    }

    return {
      sessionId,
      generatedAt: result.generatedAt,
      dimensions: dimensionLabels,
      severityBuckets: SeverityBuckets.order,
      matrix,
      colorScale: {
        green: { max: 0.05, color: '#22c55e' },
        amber: { max: 0.15, color: '#f59e0b' },
        red: { max: 1.0, color: '#ef4444' },
      },
      summary: result.summary,
    };
  }

  /**
   * Generate recommendation text for a gap
   */
  private generateGapRecommendation(
    cell: HeatmapCellDto,
    topQuestions: Array<{ text: string; currentCoverage: number }>,
  ): string {
    const severity = cell.severityBucket.toLowerCase();
    const riskLevel = cell.colorCode === HeatmapColor.RED ? 'high' : 'moderate';

    if (topQuestions.length === 0) {
      return `Review ${severity} severity items in ${cell.dimensionKey} dimension.`;
    }

    const lowCoverageCount = topQuestions.filter((q) => q.currentCoverage < 0.5).length;

    if (lowCoverageCount === topQuestions.length) {
      return `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk: ${topQuestions.length} questions in ${cell.dimensionKey} have low coverage. Priority: Address "${topQuestions[0].text.substring(0, 50)}..."`;
    }

    return `Improve coverage on ${lowCoverageCount} questions in ${cell.dimensionKey} (${severity} severity) to reduce residual risk by ${cell.cellValue.toFixed(2)}.`;
  }

  /**
   * Calculate estimated impact of addressing a phase's gaps
   */
  private calculatePhaseImpact(gaps: PriorityGap[]): number {
    return gaps.reduce((sum, g) => sum + g.cellValue * 0.7, 0); // Assume 70% improvement achievable
  }
}

/**
 * Heatmap comparison result
 */
export interface HeatmapComparisonResult {
  session1Id: string;
  session2Id: string;
  session1GeneratedAt: Date;
  session2GeneratedAt: Date;
  comparisons: CellComparison[];
  summary: {
    totalCells: number;
    improvedCells: number;
    degradedCells: number;
    stableCells: number;
    overallRiskChange: number;
    overallTrend: 'IMPROVED' | 'DEGRADED' | 'STABLE';
  };
}

/**
 * Cell comparison entry
 */
export interface CellComparison {
  dimensionKey: string;
  severityBucket: string;
  session1Value: number;
  session2Value: number;
  absoluteChange: number;
  percentageChange: number;
  trend: 'IMPROVED' | 'DEGRADED' | 'STABLE';
}

/**
 * Priority gap for action planning
 */
export interface PriorityGap {
  dimensionKey: string;
  severityBucket: string;
  colorCode: HeatmapColor;
  cellValue: number;
  priorityScore: number;
  questionCount: number;
  topQuestions: Array<{
    questionId: string;
    text: string;
    currentCoverage: number;
    potentialGain: number;
  }>;
  recommendation: string;
}

/**
 * Action plan structure
 */
export interface ActionPlan {
  sessionId: string;
  generatedAt: Date;
  currentRiskScore: number;
  projectedRiskScore: number;
  totalGapsIdentified: number;
  phases: ActionPhase[];
  summary: {
    totalActions: number;
    estimatedDuration: string;
    expectedImprovement: number;
  };
}

/**
 * Action phase
 */
export interface ActionPhase {
  name: string;
  description: string;
  duration: string;
  gaps: PriorityGap[];
  estimatedImpact: number;
}

/**
 * Visualization-ready data format
 */
export interface VisualizationData {
  sessionId: string;
  generatedAt: Date;
  dimensions: string[];
  severityBuckets: string[];
  matrix: number[][];
  colorScale: {
    green: { max: number; color: string };
    amber: { max: number; color: string };
    red: { max: number; color: string };
  };
  summary: HeatmapSummaryDto;
}
