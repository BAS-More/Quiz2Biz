import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DecisionStatus } from '@prisma/client';
import { DecisionLogService } from './decision-log.service';
import { CreateDecisionDto, UpdateDecisionStatusDto, SupersedeDecisionDto } from './dto';

const mockPrismaService = {
  session: {
    findUnique: jest.fn(),
  },
  decisionLog: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('DecisionLogService', () => {
  let service: DecisionLogService;

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    questionnaireId: 'questionnaire-1',
  };

  const mockDecision = {
    id: 'decision-1',
    sessionId: 'session-1',
    statement: 'We will use PostgreSQL for the database',
    assumptions: 'Team has PostgreSQL experience',
    references: 'RFC-001, ADR-005',
    ownerId: 'user-1',
    status: DecisionStatus.DRAFT,
    supersedesDecisionId: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockLockedDecision = {
    ...mockDecision,
    id: 'decision-2',
    status: DecisionStatus.LOCKED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecisionLogService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DecisionLogService>(DecisionLogService);

    jest.clearAllMocks();
    mockPrismaService.auditLog.create.mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDecision', () => {
    const dto: CreateDecisionDto = {
      sessionId: 'session-1',
      statement: 'We will use PostgreSQL for the database',
      assumptions: 'Team has PostgreSQL experience',
      references: 'RFC-001',
    };

    it('should create a new decision successfully', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.decisionLog.create.mockResolvedValue(mockDecision);

      const result = await service.createDecision(dto, 'user-1');

      expect(result.id).toBe('decision-1');
      expect(result.statement).toBe('We will use PostgreSQL for the database');
      expect(result.status).toBe(DecisionStatus.DRAFT);
      expect(mockPrismaService.decisionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          statement: dto.statement,
          status: DecisionStatus.DRAFT,
        }),
      });
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.createDecision(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDecisionStatus', () => {
    it('should lock a DRAFT decision successfully', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.decisionLog.update.mockResolvedValue({
        ...mockDecision,
        status: DecisionStatus.LOCKED,
      });

      const dto: UpdateDecisionStatusDto = {
        decisionId: 'decision-1',
        status: DecisionStatus.LOCKED,
      };

      const result = await service.updateDecisionStatus(dto, 'user-1');

      expect(result.status).toBe(DecisionStatus.LOCKED);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if decision not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDecisionStatus(
          { decisionId: 'non-existent', status: DecisionStatus.LOCKED },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when modifying non-DRAFT decision', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockLockedDecision);

      await expect(
        service.updateDecisionStatus(
          { decisionId: 'decision-2', status: DecisionStatus.LOCKED },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);

      await expect(
        service.updateDecisionStatus(
          { decisionId: 'decision-1', status: DecisionStatus.SUPERSEDED },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('supersedeDecision', () => {
    const dto: SupersedeDecisionDto = {
      supersedesDecisionId: 'decision-2',
      statement: 'We will use MongoDB instead of PostgreSQL',
      assumptions: 'Need flexible schema',
      references: 'RFC-002',
    };

    it('should supersede a LOCKED decision successfully', async () => {
      const newDecision = {
        ...mockDecision,
        id: 'decision-3',
        statement: dto.statement,
        status: DecisionStatus.LOCKED,
        supersedesDecisionId: 'decision-2',
      };

      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockLockedDecision);
      mockPrismaService.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          decisionLog: {
            create: jest.fn().mockResolvedValue(newDecision),
            update: jest
              .fn()
              .mockResolvedValue({ ...mockLockedDecision, status: DecisionStatus.SUPERSEDED }),
          },
        };
        return fn(mockTx);
      });

      const result = await service.supersedeDecision(dto, 'user-1');

      expect(result.id).toBe('decision-3');
      expect(result.status).toBe(DecisionStatus.LOCKED);
      expect(result.supersedesDecisionId).toBe('decision-2');
    });

    it('should throw NotFoundException if original decision not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(service.supersedeDecision(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when superseding non-LOCKED decision', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);

      await expect(service.supersedeDecision(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDecision', () => {
    it('should return decision by ID', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);

      const result = await service.getDecision('decision-1');

      expect(result.id).toBe('decision-1');
      expect(result.statement).toBe('We will use PostgreSQL for the database');
    });

    it('should throw NotFoundException if decision not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(service.getDecision('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listDecisions', () => {
    it('should list all decisions', async () => {
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision, mockLockedDecision]);

      const result = await service.listDecisions({});

      expect(result).toHaveLength(2);
    });

    it('should filter by sessionId', async () => {
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision]);

      await service.listDecisions({ sessionId: 'session-1' });

      expect(mockPrismaService.decisionLog.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    });

    it('should filter by ownerId', async () => {
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision]);

      await service.listDecisions({ ownerId: 'user-1' });

      expect(mockPrismaService.decisionLog.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision]);

      await service.listDecisions({ status: DecisionStatus.DRAFT });

      expect(mockPrismaService.decisionLog.findMany).toHaveBeenCalledWith({
        where: { status: DecisionStatus.DRAFT },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    });

    it('should apply multiple filters', async () => {
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision]);

      await service.listDecisions({
        sessionId: 'session-1',
        ownerId: 'user-1',
        status: DecisionStatus.DRAFT,
      });

      expect(mockPrismaService.decisionLog.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          ownerId: 'user-1',
          status: DecisionStatus.DRAFT,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    });
  });

  describe('exportForAudit', () => {
    it('should export decisions for audit', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.decisionLog.findMany.mockResolvedValue([mockDecision, mockLockedDecision]);

      const result = await service.exportForAudit('session-1');

      expect(result.sessionId).toBe('session-1');
      expect(result.totalDecisions).toBe(2);
      expect(result.decisions).toHaveLength(2);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should build supersession chain', async () => {
      const supersedingDecision = {
        ...mockDecision,
        id: 'decision-3',
        supersedesDecisionId: 'decision-2',
      };
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.decisionLog.findMany.mockResolvedValue([
        mockDecision,
        mockLockedDecision,
        supersedingDecision,
      ]);

      const result = await service.exportForAudit('session-1');

      expect(result.supersessionChain).toHaveProperty('decision-2');
      expect(result.supersessionChain['decision-2']).toContain('decision-3');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.exportForAudit('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSupersessionChain', () => {
    it('should return supersession chain for a decision', async () => {
      const supersededDecision = {
        ...mockDecision,
        id: 'decision-old',
        status: DecisionStatus.SUPERSEDED,
      };
      const currentDecision = {
        ...mockDecision,
        id: 'decision-1',
        supersedesDecisionId: 'decision-old',
      };

      mockPrismaService.decisionLog.findUnique
        .mockResolvedValueOnce(currentDecision)
        .mockResolvedValueOnce(supersededDecision)
        .mockResolvedValueOnce(null);
      mockPrismaService.decisionLog.findMany.mockResolvedValue([]);

      const result = await service.getSupersessionChain('decision-1');

      expect(result).toHaveLength(2);
    });

    it('should include forward supersessions', async () => {
      const originalDecision = {
        ...mockDecision,
        id: 'decision-original',
        supersedesDecisionId: null,
      };

      const newerDecision = {
        ...mockDecision,
        id: 'decision-new',
        supersedesDecisionId: 'decision-original',
      };

      // Mock backward walk - returns original decision, then on next iteration returns null
      mockPrismaService.decisionLog.findUnique.mockReset().mockResolvedValueOnce(originalDecision);
      // Forward query returns newerDecision (the one that supersedes original)
      mockPrismaService.decisionLog.findMany.mockReset().mockResolvedValue([newerDecision]);

      const result = await service.getSupersessionChain('decision-original');

      // Should have the original decision plus the forward supersession
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('decision-original');
      expect(result[1].id).toBe('decision-new');
    });
  });

  describe('deleteDecision', () => {
    it('should delete a DRAFT decision', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.decisionLog.delete.mockResolvedValue(mockDecision);

      await service.deleteDecision('decision-1', 'user-1');

      expect(mockPrismaService.decisionLog.delete).toHaveBeenCalledWith({
        where: { id: 'decision-1' },
      });
    });

    it('should throw NotFoundException if decision not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(service.deleteDecision('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when deleting LOCKED decision', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockLockedDecision);

      await expect(service.deleteDecision('decision-2', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when deleting SUPERSEDED decision', async () => {
      const supersededDecision = {
        ...mockDecision,
        status: DecisionStatus.SUPERSEDED,
      };
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(supersededDecision);

      await expect(service.deleteDecision('decision-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mapToResponse', () => {
    it('should map decision to response DTO', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);

      const result = await service.getDecision('decision-1');

      expect(result).toMatchObject({
        id: 'decision-1',
        sessionId: 'session-1',
        statement: 'We will use PostgreSQL for the database',
        assumptions: 'Team has PostgreSQL experience',
        references: 'RFC-001, ADR-005',
        ownerId: 'user-1',
        status: DecisionStatus.DRAFT,
        supersedesDecisionId: null,
        createdAt: expect.any(Date),
      });
    });
  });
});
