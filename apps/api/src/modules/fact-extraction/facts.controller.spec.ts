import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FactsController } from './facts.controller';
import { PrismaService } from '@libs/database';

describe('FactsController', () => {
  let controller: FactsController;
  let prismaService: any;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  };

  const mockFact = {
    id: 'fact-1',
    projectId: 'project-123',
    fieldName: 'business_name',
    fieldValue: 'Acme Corp',
    category: 'business_overview',
    confidence: { toNumber: () => 0.9 },
    sourceMessageId: 'msg-1',
    confirmedByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      project: {
        findFirst: jest.fn(),
      },
      extractedFact: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactsController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<FactsController>(FactsController);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectFacts', () => {
    it('should return facts grouped by category', async () => {
      prismaService.project.findFirst.mockResolvedValue(mockProject);
      prismaService.extractedFact.findMany.mockResolvedValue([mockFact]);

      const result = await controller.getProjectFacts('project-123', mockUser);

      expect(result.projectId).toBe('project-123');
      expect(result.projectName).toBe('Test Project');
      expect(result.totalFacts).toBe(1);
      expect(result.facts).toHaveLength(1);
      expect(result.factsByCategory['business_overview']).toHaveLength(1);
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(controller.getProjectFacts('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return correct verified and high confidence counts', async () => {
      const verifiedFact = { ...mockFact, confirmedByUser: true };
      const lowConfidenceFact = {
        ...mockFact,
        id: 'fact-2',
        fieldName: 'revenue',
        confidence: { toNumber: () => 0.3 },
      };

      prismaService.project.findFirst.mockResolvedValue(mockProject);
      prismaService.extractedFact.findMany.mockResolvedValue([verifiedFact, lowConfidenceFact]);

      const result = await controller.getProjectFacts('project-123', mockUser);

      expect(result.verifiedCount).toBe(1);
      expect(result.highConfidenceCount).toBe(1);
    });

    it('should handle empty facts list', async () => {
      prismaService.project.findFirst.mockResolvedValue(mockProject);
      prismaService.extractedFact.findMany.mockResolvedValue([]);

      const result = await controller.getProjectFacts('project-123', mockUser);

      expect(result.totalFacts).toBe(0);
      expect(result.facts).toHaveLength(0);
    });
  });

  describe('updateFact', () => {
    it('should update fact field value', async () => {
      prismaService.extractedFact.findFirst.mockResolvedValue({
        ...mockFact,
        project: mockProject,
      });
      prismaService.extractedFact.update.mockResolvedValue({
        ...mockFact,
        fieldValue: 'New Value',
      });

      const result = await controller.updateFact('fact-1', { fieldValue: 'New Value' }, mockUser);

      expect(result.fieldValue).toBe('New Value');
      expect(prismaService.extractedFact.update).toHaveBeenCalledWith({
        where: { id: 'fact-1' },
        data: { fieldValue: 'New Value' },
      });
    });

    it('should update fact verification status', async () => {
      prismaService.extractedFact.findFirst.mockResolvedValue({
        ...mockFact,
        project: mockProject,
      });
      prismaService.extractedFact.update.mockResolvedValue({
        ...mockFact,
        confirmedByUser: true,
      });

      const result = await controller.updateFact('fact-1', { isVerified: true }, mockUser);

      expect(result.isVerified).toBe(true);
    });

    it('should throw NotFoundException when fact not found', async () => {
      prismaService.extractedFact.findFirst.mockResolvedValue(null);

      await expect(
        controller.updateFact('nonexistent', { fieldValue: 'test' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFact', () => {
    it('should delete a fact', async () => {
      prismaService.extractedFact.findFirst.mockResolvedValue(mockFact);
      prismaService.extractedFact.delete.mockResolvedValue(mockFact);

      await controller.deleteFact('fact-1', mockUser);

      expect(prismaService.extractedFact.delete).toHaveBeenCalledWith({
        where: { id: 'fact-1' },
      });
    });

    it('should throw NotFoundException when fact not found', async () => {
      prismaService.extractedFact.findFirst.mockResolvedValue(null);

      await expect(controller.deleteFact('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyAllFacts', () => {
    it('should verify all facts for a project', async () => {
      prismaService.project.findFirst.mockResolvedValue(mockProject);
      prismaService.extractedFact.updateMany.mockResolvedValue({ count: 5 });

      await controller.verifyAllFacts('project-123', mockUser);

      expect(prismaService.extractedFact.updateMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        data: { confirmedByUser: true },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(controller.verifyAllFacts('nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
