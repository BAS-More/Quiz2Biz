/**
 * Prompt Builder Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilderService } from './prompt-builder.service';
import { PrismaService } from '@libs/database';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;
  let prisma: jest.Mocked<PrismaService>;

  const mockDimensions = [
    {
      name: 'Market Analysis',
      description: 'Analysis of target market',
      weight: 0.2,
      benchmarkCriteria: [
        { criterion: 'What is the total addressable market?' },
        { criterion: 'Who are your competitors?' },
      ],
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Financial Planning',
      description: 'Revenue and cost projections',
      weight: 0.12,
      benchmarkCriteria: null,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Risk Assessment',
      description: null,
      weight: 0.08,
      benchmarkCriteria: [],
      isActive: true,
      sortOrder: 3,
    },
  ];

  const mockFacts = [
    {
      fieldName: 'business_name',
      fieldValue: 'TechCorp',
      category: 'Company',
      label: 'Business Name',
    },
    {
      fieldName: 'target_market',
      fieldValue: 'Enterprise SaaS',
      category: 'Company',
      label: null,
    },
    {
      fieldName: 'revenue_model',
      fieldValue: 'Subscription',
      category: null,
      label: 'Revenue Model',
    },
  ];

  const mockProject = {
    id: 'project-123',
    name: 'My Business Plan',
    description: 'A plan for my startup',
    projectType: {
      name: 'Business Plan',
      qualityDimensions: mockDimensions,
    },
    extractedFacts: mockFacts,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      project: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptBuilderService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<PromptBuilderService>(PromptBuilderService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildSystemPrompt', () => {
    it('should return default prompt when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      const result = await service.buildSystemPrompt('missing-id');

      expect(result).toContain('Quiz2Biz');
      expect(result).toContain('business consultant');
      expect(result).toContain('business concept and value proposition');
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing-id' },
        include: expect.objectContaining({
          projectType: expect.any(Object),
          extractedFacts: expect.any(Object),
        }),
      });
    });

    it('should build full prompt with project type, dimensions, and facts', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.buildSystemPrompt('project-123');

      // Role context
      expect(result).toContain('Business Plan');
      expect(result).toContain('Quiz2Biz');

      // Project context
      expect(result).toContain('My Business Plan');
      expect(result).toContain('A plan for my startup');

      // Dimensions
      expect(result).toContain('Market Analysis');
      expect(result).toContain('High priority');
      expect(result).toContain('Financial Planning');
      expect(result).toContain('Medium priority');
      expect(result).toContain('Risk Assessment');
      expect(result).toContain('Lower priority');

      // Benchmark criteria
      expect(result).toContain('What is the total addressable market?');
      expect(result).toContain('Who are your competitors?');

      // Facts
      expect(result).toContain('Business Name');
      expect(result).toContain('TechCorp');
      expect(result).toContain('Revenue Model');
      expect(result).toContain('Subscription');

      // Guidelines
      expect(result).toContain('Conversation Guidelines');
    });

    it('should build prompt without dimensions when none exist', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        projectType: {
          name: 'Custom',
          qualityDimensions: [],
        },
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('Custom');
      expect(result).not.toContain('Information to Gather');
    });

    it('should build prompt without facts when none exist', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        extractedFacts: [],
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).not.toContain('Information Already Gathered');
    });

    it('should handle project without projectType', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        projectType: null,
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('General');
    });

    it('should handle project without description', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        description: null,
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('My Business Plan');
      expect(result).not.toContain('**Description:**');
    });

    it('should handle Prisma Decimal weight type with toNumber()', async () => {
      const dimWithDecimal = [
        {
          name: 'Test Dim',
          description: 'Desc',
          weight: { toNumber: () => 0.25 },
          benchmarkCriteria: null,
          isActive: true,
          sortOrder: 1,
        },
      ];

      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        projectType: {
          name: 'Business Plan',
          qualityDimensions: dimWithDecimal,
        },
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('Test Dim');
      expect(result).toContain('High priority');
    });

    it('should use fieldName as label fallback and replace underscores', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        extractedFacts: [
          {
            fieldName: 'target_market',
            fieldValue: 'B2B',
            category: 'Market',
            label: null,
          },
        ],
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('target market');
      expect(result).toContain('B2B');
    });

    it('should group facts by category with General fallback', async () => {
      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        extractedFacts: [
          { fieldName: 'a', fieldValue: 'v1', category: null, label: 'A' },
          { fieldName: 'b', fieldValue: 'v2', category: 'Finance', label: 'B' },
        ],
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('### General');
      expect(result).toContain('### Finance');
    });

    it('should limit benchmark criteria to 3 items', async () => {
      const dimWith5Criteria = [
        {
          name: 'Big Dim',
          description: 'Many criteria',
          weight: 0.2,
          benchmarkCriteria: [
            { criterion: 'Q1' },
            { criterion: 'Q2' },
            { criterion: 'Q3' },
            { criterion: 'Q4' },
            { criterion: 'Q5' },
          ],
          isActive: true,
          sortOrder: 1,
        },
      ];

      prisma.project.findUnique.mockResolvedValue({
        ...mockProject,
        projectType: {
          name: 'Plan',
          qualityDimensions: dimWith5Criteria,
        },
      });

      const result = await service.buildSystemPrompt('project-123');

      expect(result).toContain('Q1');
      expect(result).toContain('Q2');
      expect(result).toContain('Q3');
      expect(result).not.toContain('Q4');
      expect(result).not.toContain('Q5');
    });
  });

  describe('buildLimitApproachingPrompt', () => {
    it('should include remaining count in the message', () => {
      const result = service.buildLimitApproachingPrompt(5);

      expect(result).toContain('5 messages remaining');
    });

    it('should include wrapping up suggestion', () => {
      const result = service.buildLimitApproachingPrompt(3);

      expect(result).toContain('wrapping up');
    });

    it('should handle remaining count of 1', () => {
      const result = service.buildLimitApproachingPrompt(1);

      expect(result).toContain('1 messages remaining');
    });
  });

  describe('buildLimitReachedPrompt', () => {
    it('should thank user and mention next steps', () => {
      const result = service.buildLimitReachedPrompt();

      expect(result).toContain('productive conversation');
      expect(result).toContain('message limit');
      expect(result).toContain('Documents section');
    });

    it('should mention upgrade option', () => {
      const result = service.buildLimitReachedPrompt();

      expect(result).toContain('upgrade your plan');
    });
  });
});
