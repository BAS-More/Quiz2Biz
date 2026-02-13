import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '@libs/database';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('log', () => {
    it('creates audit log entry', async () => {
      const params = {
        userId: 'user-123',
        action: 'CREATE_QUESTIONNAIRE',
        resourceType: 'Questionnaire' as const,
        resourceId: 'q-123',
        changes: { after: { id: 'q-123', name: 'Test' } },
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      await service.log(params);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'CREATE_QUESTIONNAIRE',
          resourceType: 'Questionnaire',
          resourceId: 'q-123',
          changes: params.changes,
          ipAddress: null,
          userAgent: null,
          requestId: null,
        },
      });
    });

    it('extracts request metadata when provided', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-request-id': 'req-123',
        },
      } as any;

      const params = {
        userId: 'user-123',
        action: 'UPDATE_QUESTIONNAIRE',
        resourceType: 'Questionnaire' as const,
        resourceId: 'q-123',
        request: mockRequest,
      };

      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      await service.log(params);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      });
    });

    it('handles errors gracefully', async () => {
      jest.spyOn(prisma.auditLog, 'create').mockRejectedValue(new Error('DB Error'));

      const params = {
        userId: 'user-123',
        action: 'DELETE_QUESTIONNAIRE',
        resourceType: 'Questionnaire' as const,
        resourceId: 'q-123',
      };

      await expect(service.log(params)).resolves.not.toThrow();
    });
  });
});
