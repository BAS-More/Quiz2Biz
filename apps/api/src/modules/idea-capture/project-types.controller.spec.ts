import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTypesController } from './project-types.controller';
import { PrismaService } from '@libs/database';

describe('ProjectTypesController', () => {
  let controller: ProjectTypesController;
  let module: TestingModule;

  const mockProjectTypes = [
    {
      id: 'pt-1',
      slug: 'business-plan',
      name: 'Business Plan',
      description: 'Comprehensive business planning',
      icon: 'briefcase',
      isDefault: true,
      metadata: { category: 'business' },
    },
    {
      id: 'pt-2',
      slug: 'tech-assessment',
      name: 'Technology Assessment',
      description: 'Tech readiness assessment',
      icon: 'shield-check',
      isDefault: false,
      metadata: { category: 'technology' },
    },
  ];

  const mockPrisma = {
    projectType: {
      findMany: jest.fn().mockResolvedValue(mockProjectTypes),
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ProjectTypesController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<ProjectTypesController>(ProjectTypesController);
    jest.clearAllMocks();
    mockPrisma.projectType.findMany.mockResolvedValue(mockProjectTypes);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('listProjectTypes', () => {
    it('should return active project types ordered by default first, then name', async () => {
      const result = await controller.listProjectTypes();

      expect(result).toEqual(mockProjectTypes);
      expect(mockPrisma.projectType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          icon: true,
          isDefault: true,
          metadata: true,
        },
        take: 100,
      });
    });

    it('should return empty array when no active project types exist', async () => {
      mockPrisma.projectType.findMany.mockResolvedValue([]);

      const result = await controller.listProjectTypes();

      expect(result).toEqual([]);
    });
  });
});
