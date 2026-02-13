import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvidenceRegistryService } from './evidence-registry.service';
import { PrismaService } from '@libs/database';
import { EvidenceType, CoverageLevel } from '@prisma/client';

describe('EvidenceRegistryService', () => {
  let service: EvidenceRegistryService;
  let prisma: PrismaService;
  let configService: ConfigService;

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
    const module: TestingModule = await Test.createTestingModule({
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
  });
});
