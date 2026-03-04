/**
 * @fileoverview Tests for Decision Log Controller
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DecisionLogController } from './decision-log.controller';
import { DecisionLogService } from './decision-log.service';

describe('DecisionLogController', () => {
  let controller: DecisionLogController;
  let decisionService: jest.Mocked<DecisionLogService>;
  let module: TestingModule;

  const mockDecisionService = {
    createDecision: jest.fn(),
    updateDecisionStatus: jest.fn(),
    supersedeDecision: jest.fn(),
    getDecision: jest.fn(),
    listDecisions: jest.fn(),
    getSupersessionChain: jest.fn(),
    exportForAudit: jest.fn(),
    deleteDecision: jest.fn(),
  };

  const mockUser = { userId: 'user-123' };
  const mockReq = { user: mockUser };

  const mockDecision = {
    id: 'dec-1',
    sessionId: 'session-1',
    statement: 'Use PostgreSQL for the database',
    status: 'DRAFT',
    rationale: 'Best fit for relational data',
    alternatives: ['MongoDB', 'MySQL'],
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DecisionLogController],
      providers: [{ provide: DecisionLogService, useValue: mockDecisionService }],
    }).compile();

    controller = module.get<DecisionLogController>(DecisionLogController);
    decisionService = module.get(DecisionLogService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createDecision', () => {
    it('should create a new decision in DRAFT status', async () => {
      mockDecisionService.createDecision.mockResolvedValue(mockDecision);

      const dto = {
        sessionId: 'session-1',
        statement: 'Use PostgreSQL for the database',
        rationale: 'Best fit for relational data',
      };

      const result = await controller.createDecision(dto as any, mockReq as any);

      expect(result.id).toBe('dec-1');
      expect(result.status).toBe('DRAFT');
      expect(mockDecisionService.createDecision).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('lockDecision', () => {
    it('should lock a DRAFT decision', async () => {
      const lockedDecision = { ...mockDecision, status: 'LOCKED' };
      mockDecisionService.updateDecisionStatus.mockResolvedValue(lockedDecision);

      const dto = { decisionId: 'dec-1', status: 'LOCKED' };

      const result = await controller.lockDecision(dto as any, mockReq as any);

      expect(result.status).toBe('LOCKED');
      expect(mockDecisionService.updateDecisionStatus).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('supersedeDecision', () => {
    it('should supersede a locked decision', async () => {
      const newDecision = {
        ...mockDecision,
        id: 'dec-2',
        statement: 'Use PostgreSQL with read replicas',
        status: 'DRAFT',
      };
      mockDecisionService.supersedeDecision.mockResolvedValue(newDecision);

      const dto = {
        originalDecisionId: 'dec-1',
        statement: 'Use PostgreSQL with read replicas',
        rationale: 'Need read scaling',
      };

      const result = await controller.supersedeDecision(dto as any, mockReq as any);

      expect(result.id).toBe('dec-2');
      expect(mockDecisionService.supersedeDecision).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('getDecision', () => {
    it('should return a decision by ID', async () => {
      mockDecisionService.getDecision.mockResolvedValue(mockDecision);

      const result = await controller.getDecision('dec-1');

      expect(result.id).toBe('dec-1');
      expect(mockDecisionService.getDecision).toHaveBeenCalledWith('dec-1');
    });
  });

  describe('listDecisions', () => {
    it('should return filtered list of decisions', async () => {
      mockDecisionService.listDecisions.mockResolvedValue([mockDecision]);

      const filters = { sessionId: 'session-1' };

      const result = await controller.listDecisions(filters as any);

      expect(result).toHaveLength(1);
      expect(mockDecisionService.listDecisions).toHaveBeenCalledWith(filters);
    });

    it('should return empty array when no decisions match', async () => {
      mockDecisionService.listDecisions.mockResolvedValue([]);

      const result = await controller.listDecisions({} as any);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSupersessionChain', () => {
    it('should return the supersession chain for a decision', async () => {
      const chain = [
        { ...mockDecision, status: 'SUPERSEDED' },
        { ...mockDecision, id: 'dec-2', status: 'LOCKED' },
      ];
      mockDecisionService.getSupersessionChain.mockResolvedValue(chain);

      const result = await controller.getSupersessionChain('dec-1');

      expect(result).toHaveLength(2);
      expect(mockDecisionService.getSupersessionChain).toHaveBeenCalledWith('dec-1');
    });
  });

  describe('exportForAudit', () => {
    it('should export decisions for a session in audit format', async () => {
      const auditExport = {
        sessionId: 'session-1',
        exportedAt: new Date(),
        decisions: [mockDecision],
        supersessionChains: [],
      };
      mockDecisionService.exportForAudit.mockResolvedValue(auditExport);

      const result = await controller.exportForAudit('session-1');

      expect(result.sessionId).toBe('session-1');
      expect(result.decisions).toHaveLength(1);
      expect(mockDecisionService.exportForAudit).toHaveBeenCalledWith('session-1');
    });
  });

  describe('deleteDecision', () => {
    it('should delete a draft decision', async () => {
      mockDecisionService.deleteDecision.mockResolvedValue(undefined);

      await controller.deleteDecision('dec-1', mockReq as any);

      expect(mockDecisionService.deleteDecision).toHaveBeenCalledWith('dec-1', 'user-123');
    });
  });
});
