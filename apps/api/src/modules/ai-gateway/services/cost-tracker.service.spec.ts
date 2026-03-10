import { Test, TestingModule } from '@nestjs/testing';
import { CostTrackerService } from './cost-tracker.service';
import { PrismaService } from '@libs/database';

describe('CostTrackerService', () => {
  let service: CostTrackerService;
  let prismaService: any;

  const mockCostRecord = {
    projectId: 'project-123',
    userId: 'user-456',
    provider: 'claude' as const,
    model: 'claude-sonnet-4-20250514',
    taskType: 'chat' as const,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    inputCost: 0.003,
    outputCost: 0.0075,
    totalCost: 0.0105,
    currency: 'USD',
    latencyMs: 300,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      project: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostTrackerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CostTrackerService>(CostTrackerService);
    prismaService = module.get(PrismaService);

    // Stop the periodic flush to avoid interference during tests
    service.stopPeriodicFlush();
  });

  afterEach(() => {
    service.stopPeriodicFlush();
    jest.clearAllMocks();
  });

  describe('trackCost', () => {
    it('should buffer a cost record', async () => {
      await service.trackCost(mockCostRecord);

      // Trigger flush to verify the record was buffered
      prismaService.project.findUnique.mockResolvedValue({
        metadata: {},
      });
      prismaService.project.update.mockResolvedValue({});

      await service.flushCostBuffer();

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        select: { metadata: true },
      });
    });

    it('should auto-flush when buffer reaches 100 records', async () => {
      prismaService.project.findUnique.mockResolvedValue({ metadata: {} });
      prismaService.project.update.mockResolvedValue({});

      // Add 99 records (no flush yet)
      for (let i = 0; i < 99; i++) {
        await service.trackCost({ ...mockCostRecord });
      }

      // The 100th record should trigger flush
      await service.trackCost({ ...mockCostRecord });

      expect(prismaService.project.findUnique).toHaveBeenCalled();
    });
  });

  describe('flushCostBuffer', () => {
    it('should do nothing when buffer is empty', async () => {
      await service.flushCostBuffer();

      expect(prismaService.project.findUnique).not.toHaveBeenCalled();
    });

    it('should aggregate costs by project and update metadata', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        metadata: {
          costTracking: { totalTokens: 100, totalCostUsd: 0.01, requestCount: 1 },
        },
      });
      prismaService.project.update.mockResolvedValue({});

      await service.trackCost(mockCostRecord);
      await service.flushCostBuffer();

      expect(prismaService.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-123' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              costTracking: expect.objectContaining({
                totalTokens: 250, // 100 + 150
                totalCostUsd: expect.any(Number),
                requestCount: 2,
              }),
            }),
          }),
        }),
      );
    });

    it('should handle records without projectId', async () => {
      await service.trackCost({ ...mockCostRecord, projectId: undefined });
      await service.flushCostBuffer();

      // Should not try to update any project
      expect(prismaService.project.findUnique).not.toHaveBeenCalled();
    });

    it('should handle flush failure gracefully', async () => {
      prismaService.project.findUnique.mockRejectedValue(new Error('DB error'));

      await service.trackCost(mockCostRecord);
      await service.flushCostBuffer();

      // Should not throw and should log error
      expect(prismaService.project.findUnique).toHaveBeenCalled();
    });

    it('should handle project not found gracefully', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await service.trackCost(mockCostRecord);
      await service.flushCostBuffer();

      expect(prismaService.project.update).not.toHaveBeenCalled();
    });
  });

  describe('getProjectCostSummary', () => {
    it('should return cost summary from project metadata', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        metadata: {
          costTracking: { totalTokens: 5000, totalCostUsd: 0.50, requestCount: 10 },
        },
      });

      const result = await service.getProjectCostSummary('project-123');

      expect(result).toBeDefined();
      expect(result!.projectId).toBe('project-123');
      expect(result!.totalCost).toBe(0.50);
      expect(result!.totalTokens).toBe(5000);
      expect(result!.requestCount).toBe(10);
    });

    it('should return null when project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      const result = await service.getProjectCostSummary('nonexistent');

      expect(result).toBeNull();
    });

    it('should return zeros for project with no cost data', async () => {
      prismaService.project.findUnique.mockResolvedValue({ metadata: {} });

      const result = await service.getProjectCostSummary('project-123');

      expect(result!.totalCost).toBe(0);
      expect(result!.totalTokens).toBe(0);
      expect(result!.requestCount).toBe(0);
    });

    it('should return null on database error', async () => {
      prismaService.project.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.getProjectCostSummary('project-123');

      expect(result).toBeNull();
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for Claude provider', () => {
      const cost = service.estimateCost('claude', 1000, 500);

      expect(cost.inputCost).toBe(0.003); // 1000/1000 * 0.003
      expect(cost.outputCost).toBe(0.0075); // 500/1000 * 0.015
      expect(cost.totalCost).toBeCloseTo(0.0105, 4);
      expect(cost.currency).toBe('USD');
    });

    it('should estimate cost for OpenAI provider', () => {
      const cost = service.estimateCost('openai', 1000, 500);

      expect(cost.inputCost).toBe(0.0025);
      expect(cost.outputCost).toBe(0.005);
    });

    it('should estimate cost for Gemini provider', () => {
      const cost = service.estimateCost('gemini', 1000, 500);

      expect(cost.inputCost).toBe(0.00025);
      expect(cost.outputCost).toBe(0.0005);
    });

    it('should handle zero tokens', () => {
      const cost = service.estimateCost('claude', 0, 0);

      expect(cost.totalCost).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop periodic flush and flush remaining buffer', async () => {
      prismaService.project.findUnique.mockResolvedValue({ metadata: {} });
      prismaService.project.update.mockResolvedValue({});

      await service.trackCost(mockCostRecord);
      await service.onModuleDestroy();

      // Should have flushed the buffered record
      expect(prismaService.project.findUnique).toHaveBeenCalled();
    });
  });
});
