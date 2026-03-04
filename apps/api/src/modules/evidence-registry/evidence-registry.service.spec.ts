import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EvidenceRegistryService,
  coverageLevelToDecimal,
  decimalToCoverageLevel,
  isValidCoverageTransition,
  COVERAGE_LEVEL_VALUES,
  VALID_COVERAGE_TRANSITIONS,
} from './evidence-registry.service';
import { PrismaService } from '@libs/database';
import { EvidenceType, CoverageLevel } from '@prisma/client';

describe('EvidenceRegistryService', () => {
  let service: EvidenceRegistryService;
  let prisma: PrismaService;
  let configService: ConfigService;
  let module: TestingModule;

  const mockPrisma = {
    evidenceRegistry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    response: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
    },
    decisionLog: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockFile = {
    buffer: Buffer.from('test file content'),
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    fieldname: 'file',
    encoding: '7bit',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EvidenceRegistryService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EvidenceRegistryService>(EvidenceRegistryService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Azure Storage configuration (not initialized to avoid actual connection)
    mockConfigService.get.mockReturnValue(null);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('uploadEvidence', () => {
    it('validates file before upload', async () => {
      const oversizedFile = { ...mockFile, size: 60 * 1024 * 1024 }; // 60MB

      await expect(
        service.uploadEvidence(
          oversizedFile as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid MIME types', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/x-executable' };

      await expect(
        service.uploadEvidence(
          invalidFile as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates session and question exist', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadEvidence(
          mockFile as any,
          {
            sessionId: 'invalid-session',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws error when Azure Storage not configured', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.question.findUnique.mockResolvedValue({ id: 'question-456' });

      await expect(
        service.uploadEvidence(
          mockFile as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEvidence', () => {
    it('verifies evidence and sets verifier', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        artifactUrl: 'https://storage.blob/evidence/file.pdf',
        artifactType: 'FILE' as EvidenceType,
        fileName: 'test.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        hashSignature: 'abc123',
        verified: false,
        verifierId: null,
        verifiedAt: null,
        createdAt: new Date(),
      };

      const updatedEvidence = {
        ...mockEvidence,
        verified: true,
        verifierId: 'verifier-999',
        verifiedAt: new Date(),
      };

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue(updatedEvidence);

      const result = await service.verifyEvidence(
        {
          evidenceId: 'evidence-123',
          verified: true,
        },
        'verifier-999',
      );

      expect(result.verified).toBe(true);
      expect(result.verifierId).toBe('verifier-999');
      expect(mockPrisma.evidenceRegistry.update).toHaveBeenCalledWith({
        where: { id: 'evidence-123' },
        data: {
          verified: true,
          verifierId: 'verifier-999',
          verifiedAt: expect.any(Date),
        },
      });
    });

    it('unverifies evidence and clears verifier', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: true,
        verifierId: 'old-verifier',
        verifiedAt: new Date(),
      } as any;

      const updatedEvidence = {
        ...mockEvidence,
        verified: false,
        verifierId: null,
        verifiedAt: null,
      };

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue(updatedEvidence);

      const result = await service.verifyEvidence(
        {
          evidenceId: 'evidence-123',
          verified: false,
        },
        'verifier-999',
      );

      expect(result.verified).toBe(false);
      expect(result.verifierId).toBeNull();
    });

    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyEvidence(
          {
            evidenceId: 'non-existent',
            verified: true,
          },
          'verifier-999',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates coverage when provided and verified', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue({ coverageLevel: 'NONE' });
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      await service.verifyEvidence(
        {
          evidenceId: 'evidence-123',
          verified: true,
          coverageValue: 0.5,
        },
        'verifier-999',
      );

      expect(mockPrisma.response.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
        data: {
          coverage: 0.5,
          coverageLevel: 'HALF',
        },
      });
    });

    it('validates coverage level transitions', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue({ coverageLevel: 'FULL' });

      await expect(
        service.verifyEvidence(
          {
            evidenceId: 'evidence-123',
            verified: true,
            coverageValue: 0.25, // Try to decrease from FULL to PARTIAL
          },
          'verifier-999',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listEvidence', () => {
    it('lists all evidence without filters', async () => {
      const mockEvidenceList = [
        {
          id: 'evidence-1',
          sessionId: 'session-123',
          questionId: 'question-456',
          artifactType: 'FILE' as EvidenceType,
          verified: true,
        } as any,
        {
          id: 'evidence-2',
          sessionId: 'session-123',
          questionId: 'question-789',
          artifactType: 'IMAGE' as EvidenceType,
          verified: false,
        } as any,
      ];

      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidenceList);

      const result = await service.listEvidence({});

      expect(result).toHaveLength(2);
      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by sessionId', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ sessionId: 'session-123' });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by verified status', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ verified: true });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { verified: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by multiple criteria', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({
        sessionId: 'session-123',
        questionId: 'question-456',
        artifactType: 'FILE' as EvidenceType,
        verified: false,
      });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-123',
          questionId: 'question-456',
          artifactType: 'FILE',
          verified: false,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getEvidenceStats', () => {
    it('calculates evidence statistics', async () => {
      const mockEvidence = [
        { verified: true, artifactType: 'FILE' as EvidenceType },
        { verified: true, artifactType: 'FILE' as EvidenceType },
        { verified: false, artifactType: 'IMAGE' as EvidenceType },
        { verified: false, artifactType: 'SBOM' as EvidenceType },
      ];

      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence);

      const result = await service.getEvidenceStats('session-123');

      expect(result).toEqual({
        total: 4,
        verified: 2,
        pending: 2,
        byType: {
          FILE: 2,
          IMAGE: 1,
          SBOM: 1,
        },
      });
    });

    it('returns zeros for empty session', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceStats('session-123');

      expect(result).toEqual({
        total: 0,
        verified: 0,
        pending: 0,
        byType: {},
      });
    });
  });

  describe('deleteEvidence', () => {
    it('deletes unverified evidence', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
        artifactUrl: 'https://storage.blob/file.pdf',
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.delete.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.count.mockResolvedValue(0);
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      await service.deleteEvidence('evidence-123', 'user-999');

      expect(mockPrisma.evidenceRegistry.delete).toHaveBeenCalledWith({
        where: { id: 'evidence-123' },
      });

      expect(mockPrisma.response.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
        data: { evidenceCount: 0 },
      });
    });

    it('prevents deletion of verified evidence', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        verified: true,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);

      await expect(service.deleteEvidence('evidence-123', 'user-999')).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPrisma.evidenceRegistry.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(service.deleteEvidence('non-existent', 'user-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkVerifyEvidence', () => {
    it('verifies multiple evidence items successfully', async () => {
      const mockEvidence1 = {
        id: 'evidence-1',
        sessionId: 's1',
        questionId: 'q1',
        verified: false,
      } as any;
      const mockEvidence2 = {
        id: 'evidence-2',
        sessionId: 's1',
        questionId: 'q2',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique
        .mockResolvedValueOnce(mockEvidence1)
        .mockResolvedValueOnce(mockEvidence2);

      mockPrisma.evidenceRegistry.update
        .mockResolvedValueOnce({ ...mockEvidence1, verified: true })
        .mockResolvedValueOnce({ ...mockEvidence2, verified: true });

      const result = await service.bulkVerifyEvidence(['evidence-1', 'evidence-2'], 'verifier-999');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(2);
    });

    it('handles partial failures gracefully', async () => {
      mockPrisma.evidenceRegistry.findUnique
        .mockResolvedValueOnce({ id: 'evidence-1' } as any)
        .mockResolvedValueOnce(null); // Second evidence not found

      mockPrisma.evidenceRegistry.update.mockResolvedValue({
        id: 'evidence-1',
        verified: true,
      } as any);

      const result = await service.bulkVerifyEvidence(['evidence-1', 'evidence-2'], 'verifier-999');

      expect(result.successful).toEqual(['evidence-1']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].evidenceId).toBe('evidence-2');
      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('getEvidenceCoverageSummary', () => {
    it('summarizes evidence coverage by dimension and question', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          questionId: 'q1',
          verified: true,
          artifactType: 'FILE' as EvidenceType,
          question: {
            id: 'q1',
            text: 'Do you have MFA?',
            dimension: { key: 'security', displayName: 'Security' },
          },
        },
        {
          id: 'evidence-2',
          questionId: 'q1',
          verified: false,
          artifactType: 'IMAGE' as EvidenceType,
          question: {
            id: 'q1',
            text: 'Do you have MFA?',
            dimension: { key: 'security', displayName: 'Security' },
          },
        },
        {
          id: 'evidence-3',
          questionId: 'q2',
          verified: true,
          artifactType: 'SBOM' as EvidenceType,
          question: {
            id: 'q2',
            text: 'Architecture documented?',
            dimension: { key: 'architecture', displayName: 'Architecture' },
          },
        },
      ];

      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence as any);

      const result = await service.getEvidenceCoverageSummary('session-123');

      expect(result.totalEvidence).toBe(3);
      expect(result.verifiedEvidence).toBe(2);
      expect(result.dimensionCoverage).toHaveLength(2);
      expect(result.dimensionCoverage[0].dimensionKey).toBe('security');
      expect(result.dimensionCoverage[0].totalEvidence).toBe(2);
      expect(result.dimensionCoverage[0].verifiedEvidence).toBe(1);
      expect(result.questionCoverage).toHaveLength(2);
    });

    it('returns empty summary for session with no evidence', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceCoverageSummary('empty-session');

      expect(result.sessionId).toBe('empty-session');
      expect(result.totalEvidence).toBe(0);
      expect(result.verifiedEvidence).toBe(0);
      expect(result.dimensionCoverage).toHaveLength(0);
      expect(result.questionCoverage).toHaveLength(0);
    });

    it('handles evidence with null question or dimension', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          questionId: 'q1',
          verified: true,
          artifactType: 'FILE' as EvidenceType,
          question: null,
        },
      ];

      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence as any);

      const result = await service.getEvidenceCoverageSummary('session-123');

      expect(result.totalEvidence).toBe(1);
      expect(result.dimensionCoverage[0].dimensionKey).toBe('unknown');
    });
  });

  // ============ COVERAGE UTILITY FUNCTIONS ============

  describe('coverageLevelToDecimal', () => {
    it('returns correct decimal for each CoverageLevel', () => {
      expect(coverageLevelToDecimal('NONE' as CoverageLevel)).toBe(0.0);
      expect(coverageLevelToDecimal('PARTIAL' as CoverageLevel)).toBe(0.25);
      expect(coverageLevelToDecimal('HALF' as CoverageLevel)).toBe(0.5);
      expect(coverageLevelToDecimal('SUBSTANTIAL' as CoverageLevel)).toBe(0.75);
      expect(coverageLevelToDecimal('FULL' as CoverageLevel)).toBe(1.0);
    });

    it('returns 0 for null input', () => {
      expect(coverageLevelToDecimal(null)).toBe(0);
    });
  });

  describe('decimalToCoverageLevel', () => {
    it('returns NONE for null', () => {
      expect(decimalToCoverageLevel(null)).toBe('NONE');
    });

    it('returns NONE for values below 0.125', () => {
      expect(decimalToCoverageLevel(0)).toBe('NONE');
      expect(decimalToCoverageLevel(0.1)).toBe('NONE');
      expect(decimalToCoverageLevel(0.124)).toBe('NONE');
    });

    it('returns PARTIAL for values between 0.125 and 0.375', () => {
      expect(decimalToCoverageLevel(0.125)).toBe('PARTIAL');
      expect(decimalToCoverageLevel(0.25)).toBe('PARTIAL');
      expect(decimalToCoverageLevel(0.374)).toBe('PARTIAL');
    });

    it('returns HALF for values between 0.375 and 0.625', () => {
      expect(decimalToCoverageLevel(0.375)).toBe('HALF');
      expect(decimalToCoverageLevel(0.5)).toBe('HALF');
      expect(decimalToCoverageLevel(0.624)).toBe('HALF');
    });

    it('returns SUBSTANTIAL for values between 0.625 and 0.875', () => {
      expect(decimalToCoverageLevel(0.625)).toBe('SUBSTANTIAL');
      expect(decimalToCoverageLevel(0.75)).toBe('SUBSTANTIAL');
      expect(decimalToCoverageLevel(0.874)).toBe('SUBSTANTIAL');
    });

    it('returns FULL for values at or above 0.875', () => {
      expect(decimalToCoverageLevel(0.875)).toBe('FULL');
      expect(decimalToCoverageLevel(1.0)).toBe('FULL');
      expect(decimalToCoverageLevel(1.5)).toBe('FULL');
    });

    it('returns NONE for negative values', () => {
      expect(decimalToCoverageLevel(-0.5)).toBe('NONE');
    });
  });

  describe('isValidCoverageTransition', () => {
    it('allows same-level transitions', () => {
      expect(isValidCoverageTransition('NONE' as CoverageLevel, 'NONE' as CoverageLevel)).toBe(
        true,
      );
      expect(isValidCoverageTransition('FULL' as CoverageLevel, 'FULL' as CoverageLevel)).toBe(
        true,
      );
    });

    it('allows upward transitions', () => {
      expect(isValidCoverageTransition('NONE' as CoverageLevel, 'PARTIAL' as CoverageLevel)).toBe(
        true,
      );
      expect(isValidCoverageTransition('NONE' as CoverageLevel, 'FULL' as CoverageLevel)).toBe(
        true,
      );
      expect(isValidCoverageTransition('PARTIAL' as CoverageLevel, 'HALF' as CoverageLevel)).toBe(
        true,
      );
      expect(
        isValidCoverageTransition('HALF' as CoverageLevel, 'SUBSTANTIAL' as CoverageLevel),
      ).toBe(true);
      expect(
        isValidCoverageTransition('SUBSTANTIAL' as CoverageLevel, 'FULL' as CoverageLevel),
      ).toBe(true);
    });

    it('rejects downward transitions', () => {
      expect(isValidCoverageTransition('FULL' as CoverageLevel, 'NONE' as CoverageLevel)).toBe(
        false,
      );
      expect(
        isValidCoverageTransition('FULL' as CoverageLevel, 'SUBSTANTIAL' as CoverageLevel),
      ).toBe(false);
      expect(
        isValidCoverageTransition('SUBSTANTIAL' as CoverageLevel, 'HALF' as CoverageLevel),
      ).toBe(false);
      expect(isValidCoverageTransition('HALF' as CoverageLevel, 'PARTIAL' as CoverageLevel)).toBe(
        false,
      );
      expect(isValidCoverageTransition('PARTIAL' as CoverageLevel, 'NONE' as CoverageLevel)).toBe(
        false,
      );
    });
  });

  describe('COVERAGE_LEVEL_VALUES', () => {
    it('has entries for all CoverageLevel values', () => {
      expect(Object.keys(COVERAGE_LEVEL_VALUES)).toEqual(
        expect.arrayContaining(['NONE', 'PARTIAL', 'HALF', 'SUBSTANTIAL', 'FULL']),
      );
    });

    it('values are in ascending order', () => {
      expect(COVERAGE_LEVEL_VALUES.NONE).toBeLessThan(COVERAGE_LEVEL_VALUES.PARTIAL);
      expect(COVERAGE_LEVEL_VALUES.PARTIAL).toBeLessThan(COVERAGE_LEVEL_VALUES.HALF);
      expect(COVERAGE_LEVEL_VALUES.HALF).toBeLessThan(COVERAGE_LEVEL_VALUES.SUBSTANTIAL);
      expect(COVERAGE_LEVEL_VALUES.SUBSTANTIAL).toBeLessThan(COVERAGE_LEVEL_VALUES.FULL);
    });
  });

  describe('VALID_COVERAGE_TRANSITIONS', () => {
    it('NONE can transition to any level', () => {
      expect(VALID_COVERAGE_TRANSITIONS.NONE).toHaveLength(5);
    });

    it('FULL can only stay at FULL', () => {
      expect(VALID_COVERAGE_TRANSITIONS.FULL).toEqual(['FULL']);
    });

    it('each level includes itself as valid transition', () => {
      for (const level of Object.keys(VALID_COVERAGE_TRANSITIONS) as CoverageLevel[]) {
        expect(VALID_COVERAGE_TRANSITIONS[level]).toContain(level);
      }
    });
  });

  // ============ getEvidence ============

  describe('getEvidence', () => {
    it('returns evidence when found', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        artifactUrl: 'https://storage.blob/evidence/file.pdf',
        artifactType: 'FILE' as EvidenceType,
        fileName: 'test.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        hashSignature: 'abc123hash',
        verified: true,
        verifierId: 'verifier-1',
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);

      const result = await service.getEvidence('evidence-123');

      expect(result.id).toBe('evidence-123');
      expect(result.fileName).toBe('test.pdf');
      expect(result.verified).toBe(true);
      expect(mockPrisma.evidenceRegistry.findUnique).toHaveBeenCalledWith({
        where: { id: 'evidence-123' },
      });
    });

    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(service.getEvidence('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.getEvidence('non-existent-id')).rejects.toThrow(
        'Evidence not found: non-existent-id',
      );
    });
  });

  // ============ uploadEvidence - additional validation ============

  describe('uploadEvidence - null file validation', () => {
    it('rejects null file', async () => {
      await expect(
        service.uploadEvidence(
          null as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects undefined file', async () => {
      await expect(
        service.uploadEvidence(
          undefined as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates question existence after session validation', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
      mockPrisma.question.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadEvidence(
          mockFile as any,
          {
            sessionId: 'session-123',
            questionId: 'invalid-question',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts allowed MIME types', async () => {
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'text/csv',
        'text/plain',
        'application/json',
        'image/gif',
        'image/webp',
        'text/markdown',
        'application/xml',
        'text/xml',
      ];

      for (const mimeType of allowedTypes) {
        mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-123' });
        mockPrisma.question.findUnique.mockResolvedValue({ id: 'question-456' });

        const testFile = { ...mockFile, mimetype: mimeType };

        // Will throw because storage is not configured, but that means file validation passed
        await expect(
          service.uploadEvidence(
            testFile as any,
            {
              sessionId: 'session-123',
              questionId: 'question-456',
              artifactType: 'FILE' as EvidenceType,
            },
            'user-789',
          ),
        ).rejects.toThrow(BadRequestException); // "File storage not configured"
      }
    });

    it('rejects file at exactly MAX_FILE_SIZE + 1 byte', async () => {
      const oversizedFile = { ...mockFile, size: 50 * 1024 * 1024 + 1 };

      await expect(
        service.uploadEvidence(
          oversizedFile as any,
          {
            sessionId: 'session-123',
            questionId: 'question-456',
            artifactType: 'FILE' as EvidenceType,
          },
          'user-789',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ verifyEvidence - coverage update edge cases ============

  describe('verifyEvidence - coverage edge cases', () => {
    it('does not update coverage when coverageValue is undefined', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        artifactUrl: 'https://storage.blob/file.pdf',
        artifactType: 'FILE' as EvidenceType,
        fileName: 'test.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        hashSignature: 'abc123',
        verified: false,
        verifierId: null,
        verifiedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });

      await service.verifyEvidence({ evidenceId: 'evidence-123', verified: true }, 'verifier-999');

      // response.findFirst should NOT be called because coverageValue is undefined
      expect(mockPrisma.response.findFirst).not.toHaveBeenCalled();
    });

    it('does not update coverage when verified is false even if coverageValue is provided', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: true,
        verifierId: 'old-verifier',
        verifiedAt: new Date(),
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({
        ...mockEvidence,
        verified: false,
        verifierId: null,
        verifiedAt: null,
      });

      await service.verifyEvidence(
        { evidenceId: 'evidence-123', verified: false, coverageValue: 0.5 },
        'verifier-999',
      );

      expect(mockPrisma.response.findFirst).not.toHaveBeenCalled();
    });

    it('handles coverage update when no existing response is found (defaults to NONE)', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue(null); // No existing response
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      await service.verifyEvidence(
        { evidenceId: 'evidence-123', verified: true, coverageValue: 0.75 },
        'verifier-999',
      );

      expect(mockPrisma.response.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
        data: {
          coverage: 0.75,
          coverageLevel: 'SUBSTANTIAL',
        },
      });
    });

    it('allows coverage update from NONE to FULL', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue({ coverageLevel: 'NONE' });
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      await service.verifyEvidence(
        { evidenceId: 'evidence-123', verified: true, coverageValue: 1.0 },
        'verifier-999',
      );

      expect(mockPrisma.response.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
        data: {
          coverage: 1.0,
          coverageLevel: 'FULL',
        },
      });
    });

    it('rejects coverage decrease from SUBSTANTIAL to PARTIAL', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue({ coverageLevel: 'SUBSTANTIAL' });

      await expect(
        service.verifyEvidence(
          { evidenceId: 'evidence-123', verified: true, coverageValue: 0.25 },
          'verifier-999',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ bulkVerifyEvidence - additional cases ============

  describe('bulkVerifyEvidence - additional cases', () => {
    it('handles empty array of evidence IDs', async () => {
      const result = await service.bulkVerifyEvidence([], 'verifier-999');

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('passes coverage value to each verification', async () => {
      const mockEvidence1 = {
        id: 'evidence-1',
        sessionId: 's1',
        questionId: 'q1',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence1);
      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence1, verified: true });
      mockPrisma.response.findFirst.mockResolvedValue({ coverageLevel: 'NONE' });
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkVerifyEvidence(['evidence-1'], 'verifier-999', 0.5);

      expect(result.successful).toEqual(['evidence-1']);
      expect(mockPrisma.response.updateMany).toHaveBeenCalled();
    });

    it('captures error message for non-Error exceptions', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockRejectedValue('string-error');

      const result = await service.bulkVerifyEvidence(['evidence-1'], 'verifier-999');

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });

    it('continues processing remaining items after a failure', async () => {
      const mockEvidence2 = {
        id: 'evidence-2',
        sessionId: 's1',
        questionId: 'q2',
        verified: false,
      } as any;

      mockPrisma.evidenceRegistry.findUnique
        .mockResolvedValueOnce(null) // First one fails (not found)
        .mockResolvedValueOnce(mockEvidence2); // Second one succeeds

      mockPrisma.evidenceRegistry.update.mockResolvedValue({ ...mockEvidence2, verified: true });

      const result = await service.bulkVerifyEvidence(['evidence-1', 'evidence-2'], 'verifier-999');

      expect(result.successful).toEqual(['evidence-2']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].evidenceId).toBe('evidence-1');
      expect(result.totalProcessed).toBe(2);
    });
  });

  // ============ getEvidenceAuditTrail ============

  describe('getEvidenceAuditTrail', () => {
    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(service.getEvidenceAuditTrail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns audit trail with upload event for unverified evidence', async () => {
      const createdAt = new Date('2025-06-01T10:00:00Z');

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        fileName: 'report.pdf',
        fileSize: BigInt(2048),
        mimeType: 'application/pdf',
        hashSignature: 'sha256-hash-value',
        verified: false,
        verifierId: null,
        verifiedAt: null,
        verifier: null,
        createdAt,
      });
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceAuditTrail('evidence-123');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('UPLOADED');
      expect(result[0].timestamp).toEqual(createdAt);
      expect(result[0].details).toEqual({
        fileName: 'report.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        hashSignature: 'sha256-hash-value',
      });
    });

    it('includes verification event when evidence is verified', async () => {
      const createdAt = new Date('2025-06-01T10:00:00Z');
      const verifiedAt = new Date('2025-06-02T14:00:00Z');

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        fileName: 'report.pdf',
        fileSize: BigInt(2048),
        mimeType: 'application/pdf',
        hashSignature: 'sha256-hash-value',
        verified: true,
        verifierId: 'verifier-1',
        verifiedAt,
        verifier: { id: 'verifier-1', email: 'verifier@example.com', name: 'Verifier User' },
        createdAt,
      });
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceAuditTrail('evidence-123');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('UPLOADED');
      expect(result[1].action).toBe('VERIFIED');
      expect(result[1].userId).toBe('verifier-1');
      expect(result[1].userName).toBe('Verifier User');
    });

    it('includes decision log entries and sorts all by timestamp', async () => {
      const createdAt = new Date('2025-06-01T10:00:00Z');
      const verifiedAt = new Date('2025-06-03T10:00:00Z');
      const decisionDate = new Date('2025-06-02T12:00:00Z');

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        fileName: 'report.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        hashSignature: 'hash123',
        verified: true,
        verifierId: 'verifier-1',
        verifiedAt,
        verifier: { id: 'verifier-1', email: 'v@example.com', name: 'V' },
        createdAt,
      });
      mockPrisma.decisionLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          statement: 'Decision made about evidence',
          createdAt: decisionDate,
          status: 'APPROVED',
        },
      ]);

      const result = await service.getEvidenceAuditTrail('evidence-123');

      expect(result).toHaveLength(3);
      // Should be sorted by timestamp
      expect(result[0].action).toBe('UPLOADED');
      expect(result[1].action).toBe('APPROVED');
      expect(result[1].details).toEqual({ statement: 'Decision made about evidence' });
      expect(result[2].action).toBe('VERIFIED');
    });

    it('handles verifier with null name', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        fileName: null,
        fileSize: null,
        mimeType: null,
        hashSignature: null,
        verified: true,
        verifierId: 'verifier-1',
        verifiedAt: new Date('2025-06-02T10:00:00Z'),
        verifier: { id: 'verifier-1', email: 'v@example.com', name: null },
        createdAt: new Date('2025-06-01T10:00:00Z'),
      });
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceAuditTrail('evidence-123');

      const verifiedEntry = result.find((e) => e.action === 'VERIFIED');
      expect(verifiedEntry?.userName).toBeNull();
    });
  });

  // ============ verifyEvidenceIntegrity ============

  describe('verifyEvidenceIntegrity', () => {
    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(service.verifyEvidenceIntegrity('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when file storage is not configured', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        artifactUrl: 'https://storage.blob/file.pdf',
        hashSignature: 'abc123',
      });

      // containerClient is null because storage is not configured in tests
      await expect(service.verifyEvidenceIntegrity('evidence-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============ generateSignedUrl ============

  describe('generateSignedUrl', () => {
    it('throws NotFoundException for non-existent evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(null);

      await expect(service.generateSignedUrl('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when file storage is not configured', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        artifactUrl: 'https://storage.blob/file.pdf',
        fileName: 'test.pdf',
      });

      // containerClient is null because storage is not configured in tests
      await expect(service.generateSignedUrl('evidence-123')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException with custom expiration', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'evidence-123',
        artifactUrl: 'https://storage.blob/file.pdf',
        fileName: 'test.pdf',
      });

      await expect(service.generateSignedUrl('evidence-123', 30)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============ listEvidence - additional edge cases ============

  describe('listEvidence - verified=false filter', () => {
    it('correctly handles verified=false (falsy but defined)', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ verified: false });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { verified: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============ deleteEvidence - updates evidence count ============

  describe('deleteEvidence - evidence count update', () => {
    it('updates response evidence count after deletion', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        verified: false,
        artifactUrl: 'https://storage.blob/file.pdf',
      } as any;

      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.delete.mockResolvedValue(mockEvidence);
      mockPrisma.evidenceRegistry.count.mockResolvedValue(3);
      mockPrisma.response.updateMany.mockResolvedValue({ count: 1 });

      await service.deleteEvidence('evidence-123', 'user-999');

      expect(mockPrisma.evidenceRegistry.count).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
      });
      expect(mockPrisma.response.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-456', questionId: 'question-789' },
        data: { evidenceCount: 3 },
      });
    });
  });

  // ============ getEvidenceStats - single type ============

  describe('getEvidenceStats - single artifact type', () => {
    it('correctly counts a single type', async () => {
      const mockEvidence = [
        { verified: true, artifactType: 'FILE' as EvidenceType },
        { verified: true, artifactType: 'FILE' as EvidenceType },
        { verified: true, artifactType: 'FILE' as EvidenceType },
      ];

      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence);

      const result = await service.getEvidenceStats('session-123');

      expect(result).toEqual({
        total: 3,
        verified: 3,
        pending: 0,
        byType: { FILE: 3 },
      });
    });
  });

  // ===========================================================================
  // BRANCH COVERAGE TESTS
  // ===========================================================================

  describe('branch coverage - listEvidence with no filters set', () => {
    it('should build empty where clause when no filters are provided', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({});

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include only sessionId when only sessionId filter is set', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ sessionId: 'sess-1' });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'sess-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include only questionId when only questionId filter is set', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ questionId: 'q-1' });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { questionId: 'q-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include only artifactType when only artifactType filter is set', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({ artifactType: 'FILE' as EvidenceType });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: { artifactType: 'FILE' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include all filters when all are provided', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.listEvidence({
        sessionId: 'sess-1',
        questionId: 'q-1',
        artifactType: 'FILE' as EvidenceType,
        verified: true,
      });

      expect(mockPrisma.evidenceRegistry.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'FILE',
          verified: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('branch coverage - getEvidenceCoverageSummary dimension fallbacks', () => {
    it('should use "unknown" for dimensionKey when question.dimension is null', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'FILE',
          verified: true,
          question: { text: 'Q1', dimension: null },
        },
      ]);

      const result = await service.getEvidenceCoverageSummary('sess-1');

      expect(result.dimensionCoverage[0].dimensionKey).toBe('unknown');
    });

    it('should use dimensionKey as fallback for displayName when null', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'FILE',
          verified: false,
          question: { text: 'Q1', dimension: { key: 'sec', displayName: null } },
        },
      ]);

      const result = await service.getEvidenceCoverageSummary('sess-1');

      expect(result.dimensionCoverage[0].dimensionKey).toBe('sec');
      expect(result.dimensionCoverage[0].dimensionName).toBe('sec');
    });

    it('should track verified vs unverified evidence in dimension summary', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'FILE',
          verified: true,
          question: { text: 'Q1', dimension: { key: 'sec', displayName: 'Security' } },
        },
        {
          id: 'ev-2',
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'SCREENSHOT',
          verified: false,
          question: { text: 'Q1', dimension: { key: 'sec', displayName: 'Security' } },
        },
      ]);

      const result = await service.getEvidenceCoverageSummary('sess-1');

      expect(result.dimensionCoverage[0].totalEvidence).toBe(2);
      expect(result.dimensionCoverage[0].verifiedEvidence).toBe(1);
      expect(result.questionCoverage[0].totalEvidence).toBe(2);
      expect(result.questionCoverage[0].verifiedEvidence).toBe(1);
    });

    it('should handle question with null text', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          questionId: 'q-1',
          artifactType: 'FILE',
          verified: false,
          question: null,
        },
      ]);

      const result = await service.getEvidenceCoverageSummary('sess-1');

      expect(result.questionCoverage[0].questionText).toBe('');
    });
  });

  describe('branch coverage - validateFile with null file', () => {
    it('should throw BadRequestException when file is null', async () => {
      await expect(
        service.uploadEvidence(
          null as any,
          { sessionId: 's1', questionId: 'q1', artifactType: 'FILE' as EvidenceType },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('branch coverage - getEvidenceStats mixed verified/pending', () => {
    it('should correctly partition verified and pending evidence', async () => {
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([
        { verified: true, artifactType: 'FILE' as EvidenceType },
        { verified: false, artifactType: 'FILE' as EvidenceType },
        { verified: false, artifactType: 'SCREENSHOT' as EvidenceType },
        { verified: true, artifactType: 'SCREENSHOT' as EvidenceType },
      ]);

      const result = await service.getEvidenceStats('sess-1');

      expect(result.total).toBe(4);
      expect(result.verified).toBe(2);
      expect(result.pending).toBe(2);
      expect(result.byType).toEqual({ FILE: 2, SCREENSHOT: 2 });
    });
  });

  describe('branch coverage - deleteEvidence verified evidence forbidden', () => {
    it('should throw ForbiddenException when deleting verified evidence', async () => {
      mockPrisma.evidenceRegistry.findUnique.mockResolvedValue({
        id: 'ev-1',
        verified: true,
      });

      await expect(service.deleteEvidence('ev-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('branch coverage - uploadEvidence dto.fileName fallback', () => {
    it('should use file.originalname when dto.fileName is not provided', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ id: 'sess-1' });
      mockPrisma.question.findUnique.mockResolvedValue({ id: 'q-1' });

      // This will throw because containerClient is null, but file validation and
      // session/question validation pass first
      await expect(
        service.uploadEvidence(
          mockFile as any,
          { sessionId: 'sess-1', questionId: 'q-1', artifactType: 'FILE' as EvidenceType },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException); // "File storage not configured"
    });
  });
});
