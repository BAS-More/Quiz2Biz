/**
 * @fileoverview Tests for Decision Log Module
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DecisionLogService } from './decision-log.service';
import { DecisionLogController } from './decision-log.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { PrismaService } from '@libs/database';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DecisionStatus } from '@prisma/client';

describe('DecisionLogService', () => {
  let service: DecisionLogService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockSession = {
    id: 'session-1',
    tenantId: 'tenant-1',
    status: 'active',
  };

  const mockDecision = {
    id: 'decision-1',
    sessionId: 'session-1',
    statement: 'We will use PostgreSQL for the database',
    assumptions: 'We need ACID compliance',
    references: 'ADR-001',
    ownerId: 'user-1',
    status: DecisionStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    supersedesDecisionId: null,
    approvedById: null,
    approvedAt: null,
  };

  const mockLockedDecision = {
    ...mockDecision,
    id: 'decision-2',
    status: DecisionStatus.LOCKED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionLogService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: jest.fn(),
            },
            decisionLog: {
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            decisionAuditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DecisionLogService>(DecisionLogService);
    prismaService = module.get(PrismaService);
  });

  describe('createDecision', () => {
    it('should create a decision in DRAFT status', async () => {
      prismaService.session.findUnique = jest.fn().mockResolvedValue(mockSession);
      prismaService.decisionLog.create = jest.fn().mockResolvedValue(mockDecision);

      const dto = {
        sessionId: 'session-1',
        statement: 'We will use PostgreSQL for the database',
        assumptions: 'We need ACID compliance',
        references: 'ADR-001',
      };

      const result = await service.createDecision(dto, 'user-1');

      expect(result.id).toBe('decision-1');
      expect(result.status).toBe(DecisionStatus.DRAFT);
      expect(prismaService.decisionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DecisionStatus.DRAFT,
          }),
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prismaService.session.findUnique = jest.fn().mockResolvedValue(null);

      const dto = {
        sessionId: 'nonexistent-session',
        statement: 'Test',
        assumptions: 'Test',
        references: 'Test',
      };

      await expect(service.createDecision(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDecisionStatus', () => {
    it('should lock a DRAFT decision', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockDecision);
      prismaService.decisionLog.update = jest.fn().mockResolvedValue({
        ...mockDecision,
        status: DecisionStatus.LOCKED,
      });
      prismaService.decisionAuditLog.create = jest.fn().mockResolvedValue({});

      const dto = {
        decisionId: 'decision-1',
        status: DecisionStatus.LOCKED,
      };

      const result = await service.updateDecisionStatus(dto, 'user-1');

      expect(result.status).toBe(DecisionStatus.LOCKED);
      expect(prismaService.decisionLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: DecisionStatus.LOCKED },
        }),
      );
    });

    it('should throw NotFoundException when decision not found', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(null);

      const dto = {
        decisionId: 'nonexistent',
        status: DecisionStatus.LOCKED,
      };

      await expect(service.updateDecisionStatus(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when trying to modify LOCKED decision', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockLockedDecision);

      const dto = {
        decisionId: 'decision-2',
        status: DecisionStatus.LOCKED,
      };

      await expect(service.updateDecisionStatus(dto, 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockDecision);

      const dto = {
        decisionId: 'decision-1',
        status: DecisionStatus.SUPERSEDED, // Invalid transition
      };

      await expect(service.updateDecisionStatus(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('supersedeDecision', () => {
    it('should supersede a LOCKED decision', async () => {
      const newDecision = {
        ...mockDecision,
        id: 'decision-3',
        supersedesDecisionId: 'decision-2',
        status: DecisionStatus.LOCKED,
      };

      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockLockedDecision);
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        const txMock = {
          decisionLog: {
            create: jest.fn().mockResolvedValue(newDecision),
            update: jest.fn().mockResolvedValue({
              ...mockLockedDecision,
              status: DecisionStatus.SUPERSEDED,
            }),
          },
        };
        return callback(txMock);
      });
      prismaService.decisionAuditLog.create = jest.fn().mockResolvedValue({});

      const dto = {
        supersedesDecisionId: 'decision-2',
        statement: 'Updated decision',
        assumptions: 'New assumptions',
        references: 'ADR-002',
      };

      const result = await service.supersedeDecision(dto, 'user-1');

      expect(result.id).toBe('decision-3');
      expect(result.supersedesDecisionId).toBe('decision-2');
    });

    it('should throw NotFoundException when original decision not found', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(null);

      const dto = {
        supersedesDecisionId: 'nonexistent',
        statement: 'Test',
        assumptions: 'Test',
        references: 'Test',
      };

      await expect(service.supersedeDecision(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to supersede DRAFT decision', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockDecision);

      const dto = {
        supersedesDecisionId: 'decision-1',
        statement: 'Test',
        assumptions: 'Test',
        references: 'Test',
      };

      await expect(service.supersedeDecision(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDecision', () => {
    it('should return decision by ID', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(mockDecision);

      const result = await service.getDecision('decision-1');

      expect(result.id).toBe('decision-1');
      expect(prismaService.decisionLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'decision-1' },
      });
    });

    it('should throw NotFoundException when decision not found', async () => {
      prismaService.decisionLog.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getDecision('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('DecisionLogController', () => {
  let controller: DecisionLogController;
  let decisionLogService: jest.Mocked<DecisionLogService>;
  let approvalWorkflowService: jest.Mocked<ApprovalWorkflowService>;

  const mockDecisionResponse = {
    id: 'decision-1',
    sessionId: 'session-1',
    statement: 'Test decision',
    assumptions: 'Test',
    references: 'Test',
    ownerId: 'user-1',
    status: DecisionStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    supersedesDecisionId: null,
    approvedById: null,
    approvedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecisionLogController],
      providers: [
        {
          provide: DecisionLogService,
          useValue: {
            createDecision: jest.fn(),
            updateDecisionStatus: jest.fn(),
            supersedeDecision: jest.fn(),
            getDecision: jest.fn(),
            listDecisions: jest.fn(),
            exportAuditTrail: jest.fn(),
          },
        },
        {
          provide: ApprovalWorkflowService,
          useValue: {
            submitForApproval: jest.fn(),
            approveDecision: jest.fn(),
            rejectDecision: jest.fn(),
            getApprovalStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DecisionLogController>(DecisionLogController);
    decisionLogService = module.get(DecisionLogService);
    approvalWorkflowService = module.get(ApprovalWorkflowService);
  });

  describe('createDecision', () => {
    it('should create a decision', async () => {
      decisionLogService.createDecision = jest.fn().mockResolvedValue(mockDecisionResponse);

      const mockRequest = { user: { id: 'user-1' } };
      const dto = {
        sessionId: 'session-1',
        statement: 'Test decision',
        assumptions: 'Test',
        references: 'Test',
      };

      const result = await controller.createDecision(mockRequest as any, dto);

      expect(result.id).toBe('decision-1');
      expect(decisionLogService.createDecision).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('getDecision', () => {
    it('should return decision by ID', async () => {
      decisionLogService.getDecision = jest.fn().mockResolvedValue(mockDecisionResponse);

      const result = await controller.getDecision('decision-1');

      expect(result.id).toBe('decision-1');
      expect(decisionLogService.getDecision).toHaveBeenCalledWith('decision-1');
    });
  });

  describe('lockDecision', () => {
    it('should lock a decision', async () => {
      decisionLogService.updateDecisionStatus = jest.fn().mockResolvedValue({
        ...mockDecisionResponse,
        status: DecisionStatus.LOCKED,
      });

      const mockRequest = { user: { id: 'user-1' } };
      const result = await controller.lockDecision(mockRequest as any, 'decision-1');

      expect(result.status).toBe(DecisionStatus.LOCKED);
      expect(decisionLogService.updateDecisionStatus).toHaveBeenCalledWith(
        { decisionId: 'decision-1', status: DecisionStatus.LOCKED },
        'user-1',
      );
    });
  });

  describe('supersedeDecision', () => {
    it('should supersede a decision', async () => {
      const supersededResponse = {
        ...mockDecisionResponse,
        id: 'decision-2',
        supersedesDecisionId: 'decision-1',
        status: DecisionStatus.LOCKED,
      };

      decisionLogService.supersedeDecision = jest.fn().mockResolvedValue(supersededResponse);

      const mockRequest = { user: { id: 'user-1' } };
      const dto = {
        supersedesDecisionId: 'decision-1',
        statement: 'Updated decision',
        assumptions: 'New',
        references: 'ADR-002',
      };

      const result = await controller.supersedeDecision(mockRequest as any, dto);

      expect(result.id).toBe('decision-2');
      expect(result.supersedesDecisionId).toBe('decision-1');
      expect(decisionLogService.supersedeDecision).toHaveBeenCalledWith(dto, 'user-1');
    });
  });
});

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalWorkflowService,
        {
          provide: PrismaService,
          useValue: {
            decisionLog: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            approvalRequest: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalWorkflowService>(ApprovalWorkflowService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
