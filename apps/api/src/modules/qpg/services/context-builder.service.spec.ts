import { Test, TestingModule } from '@nestjs/testing';
import { ContextBuilderService } from './context-builder.service';
import { PrismaService } from '@libs/database';
import { Decimal } from '@prisma/client/runtime/library';

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
    },
  };

  const createDecimal = (value: number): Decimal => {
    return { toNumber: () => value } as Decimal;
  };

  const mockSessionWithResponses = {
    id: 'session-1',
    responses: [
      {
        id: 'resp-1',
        coverage: createDecimal(0.3),
        value: 'We have basic security',
        rationale: 'Need improvements',
        question: {
          id: 'q-1',
          text: 'Do you have a security policy?',
          severity: createDecimal(0.8),
          bestPractice: 'Implement comprehensive security',
          practicalExplainer: 'Security is critical',
          standardRefs: '["ISO-27001", "NIST"]',
          dimension: {
            key: 'SECURITY',
            displayName: 'Security & Privacy',
          },
        },
      },
      {
        id: 'resp-2',
        coverage: createDecimal(1.0), // Full coverage - not a gap
        value: 'Complete answer',
        rationale: null,
        question: {
          id: 'q-2',
          text: 'Do you have backups?',
          severity: createDecimal(0.5),
          bestPractice: 'Regular backups',
          practicalExplainer: 'Backups protect data',
          standardRefs: 'ISO-27001, GDPR',
          dimension: {
            key: 'OPERATIONS',
            displayName: 'Operations',
          },
        },
      },
      {
        id: 'resp-3',
        coverage: createDecimal(0.5),
        value: 'Partial compliance',
        rationale: 'Working on it',
        question: {
          id: 'q-3',
          text: 'Are you GDPR compliant?',
          severity: createDecimal(0.9),
          bestPractice: 'Full GDPR compliance',
          practicalExplainer: 'Required for EU operations',
          standardRefs: null,
          dimension: {
            key: 'COMPLIANCE',
            displayName: 'Compliance',
          },
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextBuilderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContextBuilderService>(ContextBuilderService);
    prismaService = module.get(PrismaService);
  });

  describe('buildGapContexts', () => {
    it('should return gaps for responses with coverage < 1.0', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.buildGapContexts('session-1');

      // Should have 2 gaps (resp-1 and resp-3), not resp-2 (full coverage)
      expect(result.length).toBe(2);
      expect(result.some(g => g.questionId === 'q-1')).toBe(true);
      expect(result.some(g => g.questionId === 'q-3')).toBe(true);
      expect(result.some(g => g.questionId === 'q-2')).toBe(false);
    });

    it('should sort gaps by residual risk (highest first)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.buildGapContexts('session-1');

      // q-1 has residualRisk = 0.8 * 0.7 = 0.56
      // q-3 has residualRisk = 0.9 * 0.5 = 0.45
      expect(result[0].questionId).toBe('q-1');
      expect(result[1].questionId).toBe('q-3');
    });

    it('should return empty array when session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      const result = await service.buildGapContexts('non-existent');

      expect(result).toEqual([]);
    });

    it('should calculate residual risk correctly', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.buildGapContexts('session-1');

      const securityGap = result.find(g => g.dimensionKey === 'SECURITY');
      // residualRisk = severity * (1 - coverage) = 0.8 * 0.7 = 0.56
      expect(securityGap?.residualRisk).toBeCloseTo(0.56, 2);
    });

    it('should parse JSON standard refs', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.buildGapContexts('session-1');

      const securityGap = result.find(g => g.dimensionKey === 'SECURITY');
      expect(securityGap?.standardRefs).toEqual(['ISO-27001', 'NIST']);
    });

    it('should return empty array for null standard refs', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.buildGapContexts('session-1');

      const complianceGap = result.find(g => g.dimensionKey === 'COMPLIANCE');
      expect(complianceGap?.standardRefs).toEqual([]);
    });

    it('should handle responses with null coverage', async () => {
      const sessionWithNullCoverage = {
        ...mockSessionWithResponses,
        responses: [
          {
            ...mockSessionWithResponses.responses[0],
            coverage: null,
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionWithNullCoverage);

      const result = await service.buildGapContexts('session-1');

      // Coverage defaults to 0, so it should be included as a gap
      expect(result.length).toBe(1);
      expect(result[0].currentCoverage).toBe(0);
    });

    it('should handle questions with null severity', async () => {
      const sessionWithNullSeverity = {
        ...mockSessionWithResponses,
        responses: [
          {
            ...mockSessionWithResponses.responses[0],
            question: {
              ...mockSessionWithResponses.responses[0].question,
              severity: null,
            },
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionWithNullSeverity);

      const result = await service.buildGapContexts('session-1');

      // Severity defaults to 0.5
      expect(result[0].severity).toBe(0.5);
    });
  });

  describe('getGapSummary', () => {
    it('should return gap summary statistics', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSessionWithResponses);

      const result = await service.getGapSummary('session-1');

      expect(result.totalGaps).toBe(2);
      expect(result.byDimension['SECURITY']).toBe(1);
      expect(result.byDimension['COMPLIANCE']).toBe(1);
      expect(result.highPriorityCount).toBe(2); // Both have residualRisk > 0.15
      expect(result.totalResidualRisk).toBeGreaterThan(0);
    });

    it('should return zero counts for session with no gaps', async () => {
      const sessionNoGaps = {
        id: 'session-1',
        responses: [
          {
            ...mockSessionWithResponses.responses[1], // The one with full coverage
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionNoGaps);

      const result = await service.getGapSummary('session-1');

      expect(result.totalGaps).toBe(0);
      expect(result.highPriorityCount).toBe(0);
      expect(result.totalResidualRisk).toBe(0);
    });

    it('should count high priority gaps correctly', async () => {
      const sessionWithLowRisk = {
        id: 'session-1',
        responses: [
          {
            ...mockSessionWithResponses.responses[0],
            coverage: createDecimal(0.9), // Low risk
            question: {
              ...mockSessionWithResponses.responses[0].question,
              severity: createDecimal(0.1),
            },
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionWithLowRisk);

      const result = await service.getGapSummary('session-1');

      // residualRisk = 0.1 * 0.1 = 0.01, which is < 0.15
      expect(result.highPriorityCount).toBe(0);
    });
  });

  describe('parseStandardRefs', () => {
    it('should parse comma-separated refs when JSON fails', async () => {
      const sessionWithCommaSeparated = {
        id: 'session-1',
        responses: [
          {
            ...mockSessionWithResponses.responses[0],
            question: {
              ...mockSessionWithResponses.responses[0].question,
              standardRefs: 'ISO-27001, SOC2, GDPR',
            },
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionWithCommaSeparated);

      const result = await service.buildGapContexts('session-1');

      expect(result[0].standardRefs).toEqual(['ISO-27001', 'SOC2', 'GDPR']);
    });

    it('should handle empty strings', async () => {
      const sessionWithEmpty = {
        id: 'session-1',
        responses: [
          {
            ...mockSessionWithResponses.responses[0],
            question: {
              ...mockSessionWithResponses.responses[0].question,
              standardRefs: '',
            },
          },
        ],
      };
      mockPrismaService.session.findUnique.mockResolvedValue(sessionWithEmpty);

      const result = await service.buildGapContexts('session-1');

      expect(result[0].standardRefs).toEqual([]);
    });
  });
});
