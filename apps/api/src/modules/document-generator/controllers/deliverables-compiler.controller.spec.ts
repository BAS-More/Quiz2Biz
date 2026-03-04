/**
 * @fileoverview Tests for DeliverablesCompilerController
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DeliverablesCompilerController } from './deliverables-compiler.controller';
import { DeliverablesCompilerService } from '../services/deliverables-compiler.service';
import { StreamableFile } from '@nestjs/common';

describe('DeliverablesCompilerController', () => {
  let controller: DeliverablesCompilerController;
  let compilerService: any;

  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockDeliverablesPack = {
    sessionId: 'session-1',
    documents: [
      { title: 'Architecture Dossier', category: 'ARCHITECTURE', content: 'content' },
      { title: 'Decision Log', category: 'GOVERNANCE', content: 'decisions' },
      { title: 'Readiness Report', category: 'READINESS', content: 'report' },
    ],
    summary: { documentCount: 3, totalPages: 50 },
    metadata: { generatedAt: new Date(), version: '1.0' },
    readinessScore: 85,
  };

  beforeEach(async () => {
    const mockCompilerService = {
      compileDeliverablesPack: jest.fn().mockResolvedValue(mockDeliverablesPack),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverablesCompilerController],
      providers: [{ provide: DeliverablesCompilerService, useValue: mockCompilerService }],
    }).compile();

    controller = module.get<DeliverablesCompilerController>(DeliverablesCompilerController);
    compilerService = module.get(DeliverablesCompilerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('compileDeliverables', () => {
    it('should compile deliverables pack', async () => {
      const dto = {
        sessionId: 'session-1',
        includeDecisionLog: true,
        includeReadinessReport: true,
        includePolicyPack: true,
        autoSection: true,
        maxWordsPerSection: 500,
      };

      const result = await controller.compileDeliverables(dto, mockUser as any);

      expect(compilerService.compileDeliverablesPack).toHaveBeenCalledWith(
        'session-1',
        'user-1',
        expect.objectContaining({
          includeDecisionLog: true,
          includeReadinessReport: true,
        }),
      );
      expect(result).toEqual(mockDeliverablesPack);
    });
  });

  describe('getDocumentByCategory', () => {
    it('should return document for valid category', async () => {
      const result = await controller.getDocumentByCategory(
        'session-1',
        'ARCHITECTURE',
        mockUser as any,
      );

      expect(result.title).toBe('Architecture Dossier');
      expect(result.category).toBe('ARCHITECTURE');
    });

    it('should throw error for invalid category', async () => {
      await expect(
        controller.getDocumentByCategory('session-1', 'INVALID', mockUser as any),
      ).rejects.toThrow("Document category 'INVALID' not found in pack");
    });
  });

  describe('exportAsJson', () => {
    it('should export pack as JSON', async () => {
      const mockRes = {
        set: jest.fn(),
      };

      const result = await controller.exportAsJson('session-1', mockUser as any, mockRes as any);

      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      );
    });
  });

  describe('getPackSummary', () => {
    it('should return pack summary', async () => {
      const result = await controller.getPackSummary('session-1', mockUser as any);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('readinessScore');
      expect(result).toHaveProperty('documentTitles');
      expect(result.documentTitles).toContain('Architecture Dossier');
    });
  });

  describe('listCategories', () => {
    it('should return available categories', async () => {
      const result = await controller.listCategories();

      expect(result.categories).toContain('ARCHITECTURE');
      expect(result.categories).toContain('SDLC');
      expect(result.categories).toContain('TESTING');
      expect(result.descriptions).toHaveProperty('ARCHITECTURE');
    });
  });

  describe('getDecisionLog', () => {
    it('should return decision log document', async () => {
      const result = await controller.getDecisionLog('session-1', mockUser as any);

      expect(result).toBeDefined();
      expect(result?.title.toLowerCase()).toContain('decision log');
    });

    it('should return null if no decision log', async () => {
      compilerService.compileDeliverablesPack.mockResolvedValue({
        ...mockDeliverablesPack,
        documents: [{ title: 'Other Doc', category: 'OTHER' }],
      });

      const result = await controller.getDecisionLog('session-1', mockUser as any);
      expect(result).toBeNull();
    });
  });

  describe('getReadinessReport', () => {
    it('should return readiness report document', async () => {
      const result = await controller.getReadinessReport('session-1', mockUser as any);

      expect(result).toBeDefined();
      expect(result?.category).toBe('READINESS');
    });

    it('should return null if no readiness report', async () => {
      compilerService.compileDeliverablesPack.mockResolvedValue({
        ...mockDeliverablesPack,
        documents: [{ title: 'Other Doc', category: 'OTHER' }],
      });

      const result = await controller.getReadinessReport('session-1', mockUser as any);
      expect(result).toBeNull();
    });
  });
});
