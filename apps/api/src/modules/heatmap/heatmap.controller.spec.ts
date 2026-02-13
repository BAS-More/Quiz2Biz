import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HeatmapController } from './heatmap.controller';
import { HeatmapService } from './heatmap.service';
import { HeatmapColor } from './dto';

describe('HeatmapController', () => {
  let controller: HeatmapController;
  let heatmapService: HeatmapService;

  const mockHeatmapService = {
    generateHeatmap: jest.fn(),
    getSummary: jest.fn(),
    exportToCsv: jest.fn(),
    exportToMarkdown: jest.fn(),
    getCells: jest.fn(),
    drilldown: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeatmapController],
      providers: [
        {
          provide: HeatmapService,
          useValue: mockHeatmapService,
        },
      ],
    }).compile();

    controller = module.get<HeatmapController>(HeatmapController);
    heatmapService = module.get<HeatmapService>(HeatmapService);

    jest.clearAllMocks();
  });

  describe('getHeatmap', () => {
    it('generates complete heatmap for session', async () => {
      const mockHeatmap = {
        sessionId: 'session-123',
        cells: [
          {
            dimensionKey: 'security',
            severityBucket: 'High',
            cellValue: 0.45,
            colorCode: HeatmapColor.RED,
            questionCount: 3,
          },
        ],
        dimensions: ['Security', 'Architecture'],
        severityBuckets: ['Low', 'Medium', 'High', 'Critical'],
        summary: {
          totalCells: 8,
          greenCells: 4,
          amberCells: 2,
          redCells: 2,
          criticalGapCount: 1,
          overallRiskScore: 22.5,
        },
        generatedAt: new Date(),
      };

      mockHeatmapService.generateHeatmap.mockResolvedValue(mockHeatmap);

      const result = await controller.getHeatmap('session-123');

      expect(result).toEqual(mockHeatmap);
      expect(mockHeatmapService.generateHeatmap).toHaveBeenCalledWith('session-123');
    });

    it('returns cached heatmap when available', async () => {
      const cachedHeatmap = {
        sessionId: 'session-123',
        cells: [],
        dimensions: ['Security'],
        severityBuckets: ['Low', 'Medium', 'High', 'Critical'],
        summary: {
          totalCells: 4,
          greenCells: 3,
          amberCells: 1,
          redCells: 0,
          criticalGapCount: 0,
          overallRiskScore: 5.2,
        },
        generatedAt: new Date(),
      };

      mockHeatmapService.generateHeatmap.mockResolvedValue(cachedHeatmap);

      const result = await controller.getHeatmap('session-123');

      expect(result.sessionId).toBe('session-123');
    });
  });

  describe('getSummary', () => {
    it('returns heatmap summary statistics', async () => {
      const mockSummary = {
        totalCells: 12,
        greenCells: 6,
        amberCells: 4,
        redCells: 2,
        criticalGapCount: 2,
        overallRiskScore: 18.3,
      };

      mockHeatmapService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary('session-123');

      expect(result).toEqual(mockSummary);
      expect(result.totalCells).toBe(12);
      expect(result.overallRiskScore).toBe(18.3);
      expect(mockHeatmapService.getSummary).toHaveBeenCalledWith('session-123');
    });

    it('calculates risk distribution correctly', async () => {
      const mockSummary = {
        totalCells: 10,
        greenCells: 5,
        amberCells: 3,
        redCells: 2,
        criticalGapCount: 1,
        overallRiskScore: 25.0,
      };

      mockHeatmapService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary('session-456');

      expect(result.greenCells + result.amberCells + result.redCells).toBe(result.totalCells);
    });
  });

  describe('exportToCsv', () => {
    it('exports heatmap as CSV file', async () => {
      const mockCsv = `Dimension,Low,Medium,High,Critical
security,0.0100,0.0200,0.4500,0.8000
architecture,0.0050,0.0150,0.2000,0.5000

# Summary
Total Cells,8
Green (<=0.05),4
Amber (0.05-0.15),2
Red (>0.15),2`;

      mockHeatmapService.exportToCsv.mockResolvedValue(mockCsv);

      const mockResponse = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportToCsv('session-123', mockResponse);

      expect(mockHeatmapService.exportToCsv).toHaveBeenCalledWith('session-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="heatmap-session-123.csv"',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockCsv);
    });
  });

  describe('exportToMarkdown', () => {
    it('exports heatmap as Markdown file', async () => {
      const mockMarkdown = `# Gap Heatmap Report

**Session ID:** session-123
**Generated:** 2026-01-28T12:00:00Z

| Dimension | Low | Medium | High | Critical |
|---|---|---|---|---|
| security | G 0.01 | G 0.02 | R 0.45 | R 0.80 |
| architecture | G 0.01 | A 0.10 | A 0.20 | R 0.50 |

## Summary

| Metric | Value |
|--------|-------|
| Total Cells | 8 |
| Green (<=0.05) | 4 |
| Amber (0.05-0.15) | 2 |
| Red (>0.15) | 2 |

## Legend

- **G Green**: Residual <= 0.05 (low risk)
- **A Amber**: Residual 0.05 - 0.15 (moderate risk)
- **R Red**: Residual > 0.15 (high risk)`;

      mockHeatmapService.exportToMarkdown.mockResolvedValue(mockMarkdown);

      const mockResponse = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportToMarkdown('session-123', mockResponse);

      expect(mockHeatmapService.exportToMarkdown).toHaveBeenCalledWith('session-123');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="heatmap-session-123.md"',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockMarkdown);
    });
  });

  describe('getCells', () => {
    it('returns all cells without filters', async () => {
      const mockCells = [
        {
          dimensionKey: 'security',
          severityBucket: 'High',
          cellValue: 0.45,
          colorCode: HeatmapColor.RED,
          questionCount: 3,
        },
        {
          dimensionKey: 'architecture',
          severityBucket: 'Medium',
          cellValue: 0.08,
          colorCode: HeatmapColor.AMBER,
          questionCount: 2,
        },
      ];

      mockHeatmapService.getCells.mockResolvedValue(mockCells);

      const result = await controller.getCells('session-123', {});

      expect(result).toEqual(mockCells);
      expect(result.length).toBe(2);
      expect(mockHeatmapService.getCells).toHaveBeenCalledWith('session-123', undefined, undefined);
    });

    it('filters cells by dimension', async () => {
      const mockCells = [
        {
          dimensionKey: 'security',
          severityBucket: 'High',
          cellValue: 0.45,
          colorCode: HeatmapColor.RED,
          questionCount: 3,
        },
        {
          dimensionKey: 'security',
          severityBucket: 'Medium',
          cellValue: 0.12,
          colorCode: HeatmapColor.AMBER,
          questionCount: 2,
        },
      ];

      mockHeatmapService.getCells.mockResolvedValue(mockCells);

      const result = await controller.getCells('session-123', { dimension: 'security' });

      expect(result.every((c) => c.dimensionKey === 'security')).toBe(true);
      expect(mockHeatmapService.getCells).toHaveBeenCalledWith(
        'session-123',
        'security',
        undefined,
      );
    });

    it('filters cells by severity bucket', async () => {
      const mockCells = [
        {
          dimensionKey: 'security',
          severityBucket: 'High',
          cellValue: 0.45,
          colorCode: HeatmapColor.RED,
          questionCount: 3,
        },
        {
          dimensionKey: 'architecture',
          severityBucket: 'High',
          cellValue: 0.3,
          colorCode: HeatmapColor.RED,
          questionCount: 2,
        },
      ];

      mockHeatmapService.getCells.mockResolvedValue(mockCells);

      const result = await controller.getCells('session-123', { severity: 'High' });

      expect(result.every((c) => c.severityBucket === 'High')).toBe(true);
      expect(mockHeatmapService.getCells).toHaveBeenCalledWith('session-123', undefined, 'High');
    });

    it('filters cells by both dimension and severity', async () => {
      const mockCells = [
        {
          dimensionKey: 'security',
          severityBucket: 'Critical',
          cellValue: 0.85,
          colorCode: HeatmapColor.RED,
          questionCount: 4,
        },
      ];

      mockHeatmapService.getCells.mockResolvedValue(mockCells);

      const result = await controller.getCells('session-123', {
        dimension: 'security',
        severity: 'Critical',
      });

      expect(result.length).toBe(1);
      expect(result[0].dimensionKey).toBe('security');
      expect(result[0].severityBucket).toBe('Critical');
      expect(mockHeatmapService.getCells).toHaveBeenCalledWith(
        'session-123',
        'security',
        'Critical',
      );
    });
  });

  describe('drilldown', () => {
    it('returns drilldown data for specific cell', async () => {
      const mockDrilldown = {
        dimensionKey: 'security',
        dimensionName: 'Security',
        severityBucket: 'High',
        cellValue: 0.45,
        colorCode: HeatmapColor.RED,
        questionCount: 3,
        questions: [
          {
            questionId: 'q1',
            questionText: 'Do you have MFA?',
            severity: 0.8,
            coverage: 0.25,
            residualRisk: 0.6,
            responseValue: 'No',
          },
          {
            questionId: 'q2',
            questionText: 'Is data encrypted at rest?',
            severity: 0.7,
            coverage: 0.5,
            residualRisk: 0.35,
            responseValue: 'Partially',
          },
          {
            questionId: 'q3',
            questionText: 'Do you have incident response plan?',
            severity: 0.75,
            coverage: 0.3,
            residualRisk: 0.525,
            responseValue: 'In progress',
          },
        ],
      };

      mockHeatmapService.drilldown.mockResolvedValue(mockDrilldown);

      const result = await controller.drilldown('session-123', 'security', 'High');

      expect(result).toEqual(mockDrilldown);
      expect(result.dimensionKey).toBe('security');
      expect(result.severityBucket).toBe('High');
      expect(result.questions.length).toBe(3);
      expect(mockHeatmapService.drilldown).toHaveBeenCalledWith('session-123', 'security', 'High');
    });

    it('includes question details with residual risk', async () => {
      const mockDrilldown = {
        dimensionKey: 'architecture',
        dimensionName: 'Architecture',
        severityBucket: 'Medium',
        cellValue: 0.12,
        colorCode: HeatmapColor.AMBER,
        questionCount: 2,
        questions: [
          {
            questionId: 'q-arch-1',
            questionText: 'Is architecture documented?',
            severity: 0.5,
            coverage: 0.75,
            residualRisk: 0.125,
            responseValue: 'Yes, documented',
          },
          {
            questionId: 'q-arch-2',
            questionText: 'Do you have C4 diagrams?',
            severity: 0.45,
            coverage: 0.5,
            residualRisk: 0.225,
            responseValue: 'In progress',
          },
        ],
      };

      mockHeatmapService.drilldown.mockResolvedValue(mockDrilldown);

      const result = await controller.drilldown('session-456', 'architecture', 'Medium');

      expect(result.questions[0].residualRisk).toBeDefined();
      expect(result.questions[1].residualRisk).toBeDefined();
      expect(typeof result.questions[0].residualRisk).toBe('number');
    });

    it('handles empty drilldown result', async () => {
      const mockDrilldown = {
        dimensionKey: 'security',
        dimensionName: 'Security',
        severityBucket: 'Low',
        cellValue: 0.0,
        colorCode: HeatmapColor.GREEN,
        questionCount: 0,
        questions: [],
      };

      mockHeatmapService.drilldown.mockResolvedValue(mockDrilldown);

      const result = await controller.drilldown('session-123', 'security', 'Low');

      expect(result.questions).toEqual([]);
      expect(result.questionCount).toBe(0);
    });
  });

  describe('color coding validation', () => {
    it('validates color codes match residual thresholds', async () => {
      const mockHeatmap = {
        sessionId: 'session-123',
        cells: [
          {
            dimensionKey: 'security',
            severityBucket: 'High',
            cellValue: 0.03, // Should be GREEN (<=0.05)
            colorCode: HeatmapColor.GREEN,
            questionCount: 1,
          },
          {
            dimensionKey: 'security',
            severityBucket: 'Medium',
            cellValue: 0.1, // Should be AMBER (0.05-0.15)
            colorCode: HeatmapColor.AMBER,
            questionCount: 1,
          },
          {
            dimensionKey: 'security',
            severityBucket: 'Critical',
            cellValue: 0.45, // Should be RED (>0.15)
            colorCode: HeatmapColor.RED,
            questionCount: 1,
          },
        ],
        dimensions: ['Security'],
        severityBuckets: ['Low', 'Medium', 'High', 'Critical'],
        summary: {
          totalCells: 3,
          greenCells: 1,
          amberCells: 1,
          redCells: 1,
          criticalGapCount: 1,
          overallRiskScore: 15.0,
        },
        generatedAt: new Date(),
      };

      mockHeatmapService.generateHeatmap.mockResolvedValue(mockHeatmap);

      const result = await controller.getHeatmap('session-123');

      const greenCell = result.cells.find((c) => c.cellValue <= 0.05);
      const amberCell = result.cells.find((c) => c.cellValue > 0.05 && c.cellValue <= 0.15);
      const redCell = result.cells.find((c) => c.cellValue > 0.15);

      expect(greenCell?.colorCode).toBe(HeatmapColor.GREEN);
      expect(amberCell?.colorCode).toBe(HeatmapColor.AMBER);
      expect(redCell?.colorCode).toBe(HeatmapColor.RED);
    });
  });
});
