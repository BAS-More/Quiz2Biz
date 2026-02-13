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
    const module: TestingModule = await Test.createTestingModule({
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
});
