import { Test, TestingModule } from '@nestjs/testing';
import { SessionExpirationService } from './session-expiration.service';
import { PrismaService } from '@libs/database';
import { NotificationService } from '../notifications/notification.service';

describe('SessionExpirationService', () => {
  let service: SessionExpirationService;

  const mockPrismaService = {
    session: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendSessionReminderEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionExpirationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<SessionExpirationService>(SessionExpirationService);
    prismaService = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  describe('handleExpiredSessions', () => {
    it('should expire sessions that have passed their expiration date', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 5 });

      await service.handleExpiredSessions();

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS',
          expiresAt: {
            lte: expect.any(Date),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
    });

    it('should handle no expired sessions', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 0 });

      await service.handleExpiredSessions();

      expect(mockPrismaService.session.updateMany).toHaveBeenCalled();
    });
  });

  describe('sendExpirationReminders', () => {
    it('should send reminder emails for expiring sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: 50,
          user: { email: 'user1@test.com', name: 'User 1' },
          questionnaire: { name: 'Test Questionnaire' },
        },
        {
          id: 'session-2',
          progress: 75,
          user: { email: 'user2@test.com', name: 'User 2' },
          questionnaire: { name: 'Another Questionnaire' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockNotificationService.sendSessionReminderEmail.mockResolvedValue(undefined);

      await service.sendExpirationReminders();

      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS',
          expiresAt: {
            gt: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: {
          user: { select: { email: true, name: true } },
          questionnaire: { select: { name: true } },
        },
        take: 1000,
      });

      expect(mockNotificationService.sendSessionReminderEmail).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'user1@test.com',
        'User 1',
        'session-1',
        'Test Questionnaire',
        50,
      );
    });

    it('should skip sessions without user email', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: 50,
          user: null,
          questionnaire: { name: 'Test' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);

      await service.sendExpirationReminders();

      expect(mockNotificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should use email prefix as name when name is missing', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: 25,
          user: { email: 'testuser@example.com', name: null },
          questionnaire: { name: 'Test' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockNotificationService.sendSessionReminderEmail.mockResolvedValue(undefined);

      await service.sendExpirationReminders();

      expect(mockNotificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'testuser@example.com',
        'testuser',
        'session-1',
        'Test',
        25,
      );
    });

    it('should use default questionnaire name when missing', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: 0,
          user: { email: 'user@test.com', name: 'Test User' },
          questionnaire: null,
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockNotificationService.sendSessionReminderEmail.mockResolvedValue(undefined);

      await service.sendExpirationReminders();

      expect(mockNotificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'user@test.com',
        'Test User',
        'session-1',
        'Assessment',
        0,
      );
    });

    it('should handle notification failure gracefully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: 50,
          user: { email: 'user@test.com', name: 'User' },
          questionnaire: { name: 'Test' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockNotificationService.sendSessionReminderEmail.mockRejectedValue(new Error('Email failed'));

      // Should not throw
      await expect(service.sendExpirationReminders()).resolves.not.toThrow();
    });

    it('should handle no expiring sessions', async () => {
      mockPrismaService.session.findMany.mockResolvedValue([]);

      await service.sendExpirationReminders();

      expect(mockNotificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle non-numeric progress values', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          progress: null,
          user: { email: 'user@test.com', name: 'User' },
          questionnaire: { name: 'Test' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockNotificationService.sendSessionReminderEmail.mockResolvedValue(undefined);

      await service.sendExpirationReminders();

      expect(mockNotificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'user@test.com',
        'User',
        'session-1',
        'Test',
        0,
      );
    });
  });
});
