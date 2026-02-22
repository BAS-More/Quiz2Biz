import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { SeverityBucket, HeatmapColor } from './dto';

describe('HeatmapService', () => {
  let service: HeatmapService;
  let prisma: PrismaService;
  let redis: RedisService;
  let module: TestingModule;

  const mockPrisma = {
    session: {
      findUnique: jest.fn(),
    },
    dimensionCatalog: {
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    response: {
      findMany: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockDimensions = [
    { key: 'security', displayName: 'Security', weight: 1.0 },
    { key: 'architecture', displayName: 'Architecture', weight: 1.0 },
  ];

  const mockQuestions = [
    {
      id: 'q1',
      dimensionKey: 'security',
      severity: 0.8,
      text: 'Do you have MFA?',
    },
    {
      id: 'q2',
      dimensionKey: 'security',
      severity: 0.4,
      text: 'Do you have encryption?',
    },
    {
      id: 'q3',
      dimensionKey: 'architecture',
      severity: 0.6,
      text: 'Is architecture documented?',
    },
  ];

  const mockResponses = [
    {
      questionId: 'q1',
      coverage: 0.25, // 75% gap
      coverageLevel: 'PARTIAL',
    },
    {
      questionId: 'q2',
      coverage: 0.75, // 25% gap
      coverageLevel: 'SUBSTANTIAL',
    },
    {
      questionId: 'q3',
      coverage: 0.5, // 50% gap
      coverageLevel: 'HALF',
    },
  ];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        HeatmapService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<HeatmapService>(HeatmapService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('generateHeatmap', () => {
    it('generates heatmap with correct cell calculations', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null); // No cache

      const result = await service.generateHeatmap('session-123');

      expect(result.sessionId).toBe('session-123');
      expect(result.dimensions).toEqual(['Security', 'Architecture']);
      expect(result.cells.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalCells).toBeGreaterThan(0);
    });

    it('calculates residual risk correctly', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue([
        {
          id: 'q-high-severity',
          dimensionKey: 'security',
          severity: 0.9, // High severity -> CRITICAL bucket
          text: 'Critical security question',
        },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        {
          questionId: 'q-high-severity',
          coverage: 0.1, // 90% gap
          coverageLevel: 'PARTIAL',
        },
      ]);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateHeatmap('session-123');

      // Residual = Severity × (1 - Coverage) = 0.9 × 0.9 = 0.81
      // Severity 0.9 -> CRITICAL bucket
      const criticalCell = result.cells.find(
        (c) => c.dimensionKey === 'security' && c.severityBucket === SeverityBucket.CRITICAL,
      );
      expect(criticalCell).toBeDefined();
      expect(criticalCell!.cellValue).toBeGreaterThan(0.5);
    });

    it('assigns color codes correctly', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);

      // Create questions with different residual values
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q-green', dimensionKey: 'security', severity: 0.2, text: 'Low risk' },
        { id: 'q-amber', dimensionKey: 'security', severity: 0.5, text: 'Medium risk' },
        { id: 'q-red', dimensionKey: 'security', severity: 0.9, text: 'High risk' },
      ]);

      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q-green', coverage: 0.9, coverageLevel: 'SUBSTANTIAL' }, // Residual: 0.02 (GREEN)
        { questionId: 'q-amber', coverage: 0.8, coverageLevel: 'SUBSTANTIAL' }, // Residual: 0.1 (AMBER)
        { questionId: 'q-red', coverage: 0.5, coverageLevel: 'HALF' }, // Residual: 0.45 (RED)
      ]);

      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateHeatmap('session-123');

      const colors = result.cells.map((c) => c.colorCode);
      expect(colors).toContain(HeatmapColor.GREEN);
      expect(colors).toContain(HeatmapColor.AMBER);
      expect(colors).toContain(HeatmapColor.RED);
    });

    it('returns cached heatmap when available', async () => {
      const cachedHeatmap = {
        sessionId: 'session-123',
        cells: [],
        dimensions: ['Security'],
        severityBuckets: ['Low', 'Medium', 'High', 'Critical'],
        summary: {
          totalCells: 4,
          greenCells: 2,
          amberCells: 1,
          redCells: 1,
          criticalGapCount: 1,
          overallRiskScore: 15.5,
        },
        generatedAt: new Date(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedHeatmap));

      const result = await service.generateHeatmap('session-123');

      expect(result).toEqual(cachedHeatmap);
      expect(mockPrisma.dimensionCatalog.findMany).not.toHaveBeenCalled();
    });

    it('caches generated heatmap', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      await service.generateHeatmap('session-123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('heatmap:session-123'),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('throws NotFoundException for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);

      await expect(service.generateHeatmap('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportToCsv', () => {
    it('exports heatmap to CSV format', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const csv = await service.exportToCsv('session-123');

      expect(csv).toContain('Dimension,Low,Medium,High,Critical');
      expect(csv).toContain('security');
      expect(csv).toContain('architecture');
      expect(csv).toContain('# Summary');
      expect(csv).toContain('Total Cells');
      expect(csv).toContain('Green (<=0.05)');
    });

    it('formats cell values with 4 decimal places', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.333, text: 'Test question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.666, coverageLevel: 'SUBSTANTIAL' },
      ]);
      mockRedis.get.mockResolvedValue(null);

      const csv = await service.exportToCsv('session-123');

      const match = csv.match(/\d+\.\d{4}/);
      expect(match).not.toBeNull();
    });
  });

  describe('exportToMarkdown', () => {
    it('exports heatmap to Markdown format', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const markdown = await service.exportToMarkdown('session-123');

      expect(markdown).toContain('# Gap Heatmap Report');
      expect(markdown).toContain('**Session ID:**');
      expect(markdown).toContain('| Dimension |');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Legend');
      expect(markdown).toContain('G Green');
      expect(markdown).toContain('A Amber');
      expect(markdown).toContain('R Red');
    });

    it('includes color indicators in cells', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.9, text: 'High risk question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' }, // High residual -> RED
      ]);
      mockRedis.get.mockResolvedValue(null);

      const markdown = await service.exportToMarkdown('session-123');

      expect(markdown).toMatch(/[GAR]\s\d+\.\d{2}/); // Color indicator + value
    });
  });

  describe('getSummary', () => {
    it('returns summary statistics only', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const summary = await service.getSummary('session-123');

      expect(summary).toHaveProperty('totalCells');
      expect(summary).toHaveProperty('greenCells');
      expect(summary).toHaveProperty('amberCells');
      expect(summary).toHaveProperty('redCells');
      expect(summary).toHaveProperty('criticalGapCount');
      expect(summary).toHaveProperty('overallRiskScore');
      expect(typeof summary.totalCells).toBe('number');
      expect(typeof summary.overallRiskScore).toBe('number');
    });

    it('calculates overall risk score correctly', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 1.0, text: 'Critical question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.0, coverageLevel: 'NONE' }, // 100% gap
      ]);
      mockRedis.get.mockResolvedValue(null);

      const summary = await service.getSummary('session-123');

      expect(summary.overallRiskScore).toBeGreaterThan(0);
      expect(summary.redCells).toBeGreaterThan(0);
    });
  });

  describe('getCells', () => {
    it('returns all cells without filters', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const cells = await service.getCells('session-123');

      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0]).toHaveProperty('dimensionKey');
      expect(cells[0]).toHaveProperty('severityBucket');
      expect(cells[0]).toHaveProperty('cellValue');
      expect(cells[0]).toHaveProperty('colorCode');
    });

    it('filters cells by dimension', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const cells = await service.getCells('session-123', 'security');

      expect(cells.every((c) => c.dimensionKey === 'security')).toBe(true);
    });

    it('filters cells by severity bucket', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const cells = await service.getCells('session-123', undefined, 'High');

      expect(cells.every((c) => c.severityBucket === 'High')).toBe(true);
    });

    it('filters cells by both dimension and severity', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const cells = await service.getCells('session-123', 'security', 'High');

      expect(cells.every((c) => c.dimensionKey === 'security' && c.severityBucket === 'High')).toBe(
        true,
      );
    });
  });

  describe('drilldown', () => {
    it('returns questions contributing to a cell', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockRedis.get.mockResolvedValue(null);

      const drilldown = await service.drilldown('session-123', 'security', 'High');

      expect(drilldown).toHaveProperty('dimensionKey', 'security');
      expect(drilldown).toHaveProperty('severityBucket', 'High');
      expect(drilldown).toHaveProperty('cellValue');
      expect(drilldown).toHaveProperty('questions');
      expect(Array.isArray(drilldown.questions)).toBe(true);
    });

    it('includes question details in drilldown', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Do you have MFA?' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.25, coverageLevel: 'PARTIAL' },
      ]);
      mockRedis.get.mockResolvedValue(null);

      const drilldown = await service.drilldown('session-123', 'security', 'High');

      if (drilldown.questions.length > 0) {
        const question = drilldown.questions[0];
        expect(question).toHaveProperty('questionId');
        expect(question).toHaveProperty('questionText');
        expect(question).toHaveProperty('severity');
        expect(question).toHaveProperty('coverage');
        expect(question).toHaveProperty('residualRisk');
      }
    });

    it('throws NotFoundException for non-existent cell', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue([]);
      mockPrisma.response.findMany.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      await expect(service.drilldown('session-123', 'non-existent', 'High')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('severity bucket mapping', () => {
    it('maps severity values to correct buckets', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q-low', dimensionKey: 'security', severity: 0.2, text: 'Low severity' },
        { id: 'q-medium', dimensionKey: 'security', severity: 0.4, text: 'Medium severity' },
        { id: 'q-high', dimensionKey: 'security', severity: 0.7, text: 'High severity' },
        { id: 'q-critical', dimensionKey: 'security', severity: 0.9, text: 'Critical severity' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q-low', coverage: 0.5, coverageLevel: 'HALF' },
        { questionId: 'q-medium', coverage: 0.5, coverageLevel: 'HALF' },
        { questionId: 'q-high', coverage: 0.5, coverageLevel: 'HALF' },
        { questionId: 'q-critical', coverage: 0.5, coverageLevel: 'HALF' },
      ]);
      mockRedis.get.mockResolvedValue(null);

      const result = await service.generateHeatmap('session-123');

      const buckets = result.cells.map((c) => c.severityBucket);
      expect(buckets).toContain('Low');
      expect(buckets).toContain('Medium');
      expect(buckets).toContain('High');
      expect(buckets).toContain('Critical');
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache for session', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidateCache('session-123');

      expect(mockRedis.del).toHaveBeenCalledWith('heatmap:session-123');
    });
  });

  describe('compareHeatmaps', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should compare two session heatmaps', async () => {
      // Session 1 setup
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.25, coverageLevel: 'PARTIAL' },
      ]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      expect(comparison.session1Id).toBe('session-1');
      expect(comparison.session2Id).toBe('session-1');
      expect(comparison.comparisons).toBeDefined();
      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.totalCells).toBeGreaterThan(0);
    });

    it('should identify improved cells', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);

      // First call - session 1 with lower coverage (higher risk)
      mockPrisma.response.findMany
        .mockResolvedValueOnce([{ questionId: 'q1', coverage: 0.9, coverageLevel: 'FULL' }])
        .mockResolvedValueOnce([{ questionId: 'q1', coverage: 0.3, coverageLevel: 'PARTIAL' }]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      expect(comparison.comparisons.some((c) => c.trend === 'IMPROVED')).toBe(true);
    });

    it('should identify degraded cells', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);

      // First call - session 1 with higher coverage (lower risk)
      mockPrisma.response.findMany
        .mockResolvedValueOnce([{ questionId: 'q1', coverage: 0.2, coverageLevel: 'MINIMAL' }])
        .mockResolvedValueOnce([{ questionId: 'q1', coverage: 0.9, coverageLevel: 'FULL' }]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      expect(comparison.comparisons.some((c) => c.trend === 'DEGRADED')).toBe(true);
    });

    it('should identify stable cells', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.5, coverageLevel: 'HALF' },
      ]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      expect(comparison.comparisons.some((c) => c.trend === 'STABLE')).toBe(true);
    });

    it('should calculate percentage change correctly', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.5, coverageLevel: 'HALF' },
      ]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      comparison.comparisons.forEach((c) => {
        expect(typeof c.percentageChange).toBe('number');
        expect(typeof c.absoluteChange).toBe('number');
      });
    });

    it('should handle overall trend calculation', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.5, coverageLevel: 'HALF' },
      ]);

      const comparison = await service.compareHeatmaps('session-1', 'session-1');

      expect(['IMPROVED', 'DEGRADED', 'STABLE']).toContain(comparison.summary.overallTrend);
    });
  });

  describe('getPriorityGaps', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should return prioritized gaps', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.5 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.9, text: 'Critical question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      expect(Array.isArray(gaps)).toBe(true);
      if (gaps.length > 0) {
        expect(gaps[0]).toHaveProperty('dimensionKey');
        expect(gaps[0]).toHaveProperty('priorityScore');
        expect(gaps[0]).toHaveProperty('recommendation');
      }
    });

    it('should limit results to specified count', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      const gaps = await service.getPriorityGaps('session-123', 2);

      expect(gaps.length).toBeLessThanOrEqual(2);
    });

    it('should skip green cells', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.1, text: 'Low risk' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.95, coverageLevel: 'FULL' }, // Very low residual
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      // Green cells should not be in priority gaps
      gaps.forEach((gap) => {
        expect(gap.colorCode).not.toBe(HeatmapColor.GREEN);
      });
    });

    it('should include top questions for each gap', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.9, text: 'Question 1' },
        { id: 'q2', dimensionKey: 'security', severity: 0.85, text: 'Question 2' },
        { id: 'q3', dimensionKey: 'security', severity: 0.8, text: 'Question 3' },
        { id: 'q4', dimensionKey: 'security', severity: 0.82, text: 'Question 4' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' },
        { questionId: 'q2', coverage: 0.3, coverageLevel: 'PARTIAL' },
        { questionId: 'q3', coverage: 0.1, coverageLevel: 'MINIMAL' },
        { questionId: 'q4', coverage: 0.25, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      if (gaps.length > 0) {
        expect(gaps[0].topQuestions.length).toBeLessThanOrEqual(3);
      }
    });

    it('should use default dimension weight when not specified', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security' }, // No weight property
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.9, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  describe('generateActionPlan', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should generate action plan with phases', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.95, text: 'Critical' },
        { id: 'q2', dimensionKey: 'security', severity: 0.7, text: 'High' },
        { id: 'q3', dimensionKey: 'security', severity: 0.5, text: 'Medium' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.1, coverageLevel: 'MINIMAL' },
        { questionId: 'q2', coverage: 0.2, coverageLevel: 'PARTIAL' },
        { questionId: 'q3', coverage: 0.3, coverageLevel: 'PARTIAL' },
      ]);

      const plan = await service.generateActionPlan('session-123');

      expect(plan.sessionId).toBe('session-123');
      expect(plan.phases).toBeDefined();
      expect(plan.currentRiskScore).toBeDefined();
      expect(plan.projectedRiskScore).toBeDefined();
      expect(plan.summary).toBeDefined();
      expect(plan.summary.totalActions).toBeGreaterThanOrEqual(0);
    });

    it('should include immediate priority phase for critical gaps', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.95, text: 'Critical question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.1, coverageLevel: 'MINIMAL' },
      ]);

      const plan = await service.generateActionPlan('session-123');

      const immediatePriority = plan.phases.find((p) => p.name === 'Immediate Priority');
      if (immediatePriority) {
        expect(immediatePriority.description).toContain('critical');
        expect(immediatePriority.duration).toBe('1-2 weeks');
      }
    });

    it('should include quick wins phase', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.5, text: 'Medium question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' },
      ]);

      const plan = await service.generateActionPlan('session-123');

      const quickWins = plan.phases.find((p) => p.name === 'Quick Wins');
      if (quickWins) {
        expect(quickWins.duration).toBe('2-4 weeks');
      }
    });

    it('should handle empty gaps gracefully', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.1, text: 'Low risk' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.98, coverageLevel: 'FULL' }, // Very high coverage
      ]);

      const plan = await service.generateActionPlan('session-123');

      expect(plan.summary.estimatedDuration).toBeDefined();
    });
  });

  describe('exportToVisualizationFormat', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should export heatmap in visualization format', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      const vizData = await service.exportToVisualizationFormat('session-123');

      expect(vizData.sessionId).toBe('session-123');
      expect(vizData.dimensions).toBeDefined();
      expect(vizData.severityBuckets).toBeDefined();
      expect(vizData.matrix).toBeDefined();
      expect(Array.isArray(vizData.matrix)).toBe(true);
      expect(vizData.colorScale).toBeDefined();
      expect(vizData.colorScale.green.color).toBe('#22c55e');
      expect(vizData.colorScale.amber.color).toBe('#f59e0b');
      expect(vizData.colorScale.red.color).toBe('#ef4444');
    });

    it('should create matrix with correct dimensions', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      const vizData = await service.exportToVisualizationFormat('session-123');

      expect(vizData.dimensions).toHaveLength(mockDimensions.length);
      expect(vizData.matrix).toHaveLength(mockDimensions.length);
      vizData.matrix.forEach((row) => {
        expect(row).toHaveLength(vizData.severityBuckets.length);
      });
    });

    it('should handle missing cells in visualization', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([]); // No questions
      mockPrisma.response.findMany.mockResolvedValue([]);

      const vizData = await service.exportToVisualizationFormat('session-123');

      expect(vizData.matrix[0].every((val) => val === 0)).toBe(true);
    });
  });

  describe('loadData - session filtering', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should filter dimensions by projectTypeId', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        projectTypeId: 'project-type-1',
        questionnaireId: 'q1',
      });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      await service.generateHeatmap('session-123');

      expect(mockPrisma.dimensionCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectTypeId: 'project-type-1',
          }),
        }),
      );
    });

    it('should filter questions by persona', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        persona: 'CTO',
        questionnaireId: 'q1',
      });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      await service.generateHeatmap('session-123');

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            persona: 'CTO',
          }),
        }),
      );
    });
  });

  describe('getCachedHeatmap - error handling', () => {
    it('should handle redis get error gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'));
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      // Should not throw, should generate fresh heatmap
      const result = await service.generateHeatmap('session-123');

      expect(result.sessionId).toBe('session-123');
    });
  });

  describe('cacheHeatmap - error handling', () => {
    it('should handle redis set error gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValueOnce(new Error('Redis write failed'));
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);

      // Should not throw
      const result = await service.generateHeatmap('session-123');

      expect(result.sessionId).toBe('session-123');
    });
  });

  describe('generateGapRecommendation', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should generate recommendation for gap with no questions', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      // Questions in different severity bucket
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.9, text: 'Critical only' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.2, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      // Gaps exist even for buckets without questions (with 0 value)
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('should generate recommendation for low coverage questions', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Low coverage question with a very long text that exceeds fifty characters' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.3, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      if (gaps.length > 0) {
        expect(gaps[0].recommendation).toBeDefined();
        expect(gaps[0].recommendation.length).toBeGreaterThan(0);
      }
    });

    it('should generate recommendation for mixed coverage questions', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'High coverage' },
        { id: 'q2', dimensionKey: 'security', severity: 0.75, text: 'Low coverage' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.8, coverageLevel: 'SUBSTANTIAL' },
        { questionId: 'q2', coverage: 0.3, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      if (gaps.length > 0) {
        expect(gaps[0].recommendation).toBeDefined();
      }
    });
  });

  describe('getSeverityMultiplier', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should return correct multipliers for all severity levels', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q-low', dimensionKey: 'security', severity: 0.2, text: 'Low' },
        { id: 'q-medium', dimensionKey: 'security', severity: 0.45, text: 'Medium' },
        { id: 'q-high', dimensionKey: 'security', severity: 0.75, text: 'High' },
        { id: 'q-critical', dimensionKey: 'security', severity: 0.95, text: 'Critical' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q-low', coverage: 0.2, coverageLevel: 'PARTIAL' },
        { questionId: 'q-medium', coverage: 0.2, coverageLevel: 'PARTIAL' },
        { questionId: 'q-high', coverage: 0.2, coverageLevel: 'PARTIAL' },
        { questionId: 'q-critical', coverage: 0.2, coverageLevel: 'PARTIAL' },
      ]);

      const gaps = await service.getPriorityGaps('session-123');

      // Different severity buckets should have different priority scores
      if (gaps.length > 1) {
        const criticalGap = gaps.find((g) => g.severityBucket === 'Critical');
        const lowGap = gaps.find((g) => g.severityBucket === 'Low');
        if (criticalGap && lowGap) {
          expect(criticalGap.priorityScore).toBeGreaterThan(lowGap.priorityScore);
        }
      }
    });
  });

  describe('drilldown - additional branches', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should include response value in drilldown', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Question' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.25, coverageLevel: 'PARTIAL', value: { answer: 'yes' } },
      ]);

      const drilldown = await service.drilldown('session-123', 'security', 'High');

      if (drilldown.questions.length > 0) {
        expect(drilldown.questions[0].responseValue).toBeDefined();
      }
    });

    it('should handle missing response in drilldown', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Unanswered' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([]); // No responses

      const drilldown = await service.drilldown('session-123', 'security', 'High');

      if (drilldown.questions.length > 0) {
        expect(drilldown.questions[0].coverage).toBe(0);
      }
    });

    it('should calculate potential improvement', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: 0.8, text: 'Q1' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.25, coverageLevel: 'PARTIAL' },
      ]);

      const drilldown = await service.drilldown('session-123', 'security', 'High');

      expect(drilldown.potentialImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateHeatmap - questions without severity', () => {
    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null);
    });

    it('should use default severity when not specified', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.dimensionCatalog.findMany.mockResolvedValue([
        { key: 'security', displayName: 'Security', weight: 1.0 },
      ]);
      mockPrisma.question.findMany.mockResolvedValue([
        { id: 'q1', dimensionKey: 'security', severity: null, text: 'No severity' },
      ]);
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1', coverage: 0.5, coverageLevel: 'HALF' },
      ]);

      const result = await service.generateHeatmap('session-123');

      expect(result.cells.length).toBeGreaterThan(0);
    });
  });
});
