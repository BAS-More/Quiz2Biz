/**
 * Session Reminder Job Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SessionReminderJobService } from './session-reminder.job';
import { PrismaService } from '@libs/database';
import { NotificationService } from '../notification.service';
import { Logger } from '@nestjs/common';

describe('SessionReminderJobService', () => {
  let service: SessionReminderJobService;
  let prisma: jest.Mocked<PrismaService>;
  let notificationService: jest.Mocked<NotificationService>;

  const now = new Date('2024-06-15T12:00:00Z');
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    preferences: null,
  };

  const mockAbandonedSession = {
    id: 'session-1',
    status: 'IN_PROGRESS',
    userId: 'user-1',
    lastActivityAt: hoursAgo(30), // 30 hours ago
    expiresAt: new Date(now.getTime() + 86400000),
    user: mockUser,
    questionnaire: { name: 'Business Plan' },
    progress: 45,
  };

  beforeEach(async () => {
    const mockPrisma = {
      session: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockNotification = {
      sendSessionReminderEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionReminderJobService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<SessionReminderJobService>(SessionReminderJobService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAbandonedSessionReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should find abandoned sessions and send reminders', async () => {
      prisma.session.findMany.mockResolvedValue([mockAbandonedSession]);
      // No existing reminder record
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });
      prisma.session.update.mockResolvedValue(mockAbandonedSession);

      await service.processAbandonedSessionReminders();

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'session-1',
        'Business Plan',
        45,
      );
    });

    it('should skip sessions that do not need reminders', async () => {
      // Session was active recently (< 24h)
      const recentSession = {
        ...mockAbandonedSession,
        lastActivityAt: hoursAgo(12), // Only 12 hours ago
      };

      prisma.session.findMany.mockResolvedValue([recentSession]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should handle empty abandoned sessions list', async () => {
      prisma.session.findMany.mockResolvedValue([]);

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should continue processing other sessions when one fails', async () => {
      const session2 = { ...mockAbandonedSession, id: 'session-2' };
      prisma.session.findMany.mockResolvedValue([mockAbandonedSession, session2]);

      // First findUnique for shouldSendReminder → null metadata (no prior reminders)
      // Then findUnique for getReminderRecord in sendReminderAndTrack → null
      // Then findUnique for getSessionMetadata → null
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });

      // First notification fails, second succeeds
      notificationService.sendSessionReminderEmail
        .mockRejectedValueOnce(new Error('Email failed'))
        .mockResolvedValueOnce(undefined);

      prisma.session.update.mockResolvedValue(session2);

      await service.processAbandonedSessionReminders();

      // Should have attempted both
      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalledTimes(2);
    });

    it('should not send reminder when max 3 reminders already sent', async () => {
      prisma.session.findMany.mockResolvedValue([mockAbandonedSession]);
      prisma.session.findUnique.mockResolvedValue({
        metadata: { reminders: { sent: 3, lastAt: hoursAgo(48).toISOString() } },
        userId: 'user-1',
      });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should send second reminder after 72h of inactivity', async () => {
      const session72h = {
        ...mockAbandonedSession,
        lastActivityAt: hoursAgo(80), // 80 hours ago
      };
      prisma.session.findMany.mockResolvedValue([session72h]);

      // Already sent 1 reminder
      prisma.session.findUnique.mockResolvedValue({
        metadata: { reminders: { sent: 1, lastAt: hoursAgo(50).toISOString() } },
        userId: 'user-1',
      });
      prisma.session.update.mockResolvedValue(session72h);

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalled();
    });

    it('should not send second reminder before 72h', async () => {
      const session50h = {
        ...mockAbandonedSession,
        lastActivityAt: hoursAgo(50), // Only 50 hours ago
      };
      prisma.session.findMany.mockResolvedValue([session50h]);

      prisma.session.findUnique.mockResolvedValue({
        metadata: { reminders: { sent: 1, lastAt: hoursAgo(25).toISOString() } },
        userId: 'user-1',
      });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should send final reminder after 7 days of inactivity', async () => {
      const session7d = {
        ...mockAbandonedSession,
        lastActivityAt: hoursAgo(170), // ~7 days ago
      };
      prisma.session.findMany.mockResolvedValue([session7d]);

      prisma.session.findUnique.mockResolvedValue({
        metadata: { reminders: { sent: 2, lastAt: hoursAgo(100).toISOString() } },
        userId: 'user-1',
      });
      prisma.session.update.mockResolvedValue(session7d);

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalled();
    });
  });

  describe('sendReminderAndTrack (via processAbandonedSessionReminders)', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should skip if user has no email', async () => {
      const sessionNoEmail = {
        ...mockAbandonedSession,
        user: { ...mockUser, email: '' },
      };
      prisma.session.findMany.mockResolvedValue([sessionNoEmail]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip if user has no user record', async () => {
      const sessionNoUser = {
        ...mockAbandonedSession,
        user: null,
      };
      prisma.session.findMany.mockResolvedValue([sessionNoUser]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should skip if user opted out of email notifications', async () => {
      const sessionOptedOut = {
        ...mockAbandonedSession,
        user: {
          ...mockUser,
          preferences: { notifications: { email_session_complete: false } },
        },
      };
      prisma.session.findMany.mockResolvedValue([sessionOptedOut]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).not.toHaveBeenCalled();
    });

    it('should use email prefix when user has no name', async () => {
      const sessionNoName = {
        ...mockAbandonedSession,
        user: { ...mockUser, name: null },
      };
      prisma.session.findMany.mockResolvedValue([sessionNoName]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });
      prisma.session.update.mockResolvedValue(sessionNoName);

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        'test@example.com',
        'test', // email prefix
        expect.any(String),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should use default questionnaire name when missing', async () => {
      const sessionNoQ = {
        ...mockAbandonedSession,
        questionnaire: null,
      };
      prisma.session.findMany.mockResolvedValue([sessionNoQ]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });
      prisma.session.update.mockResolvedValue(sessionNoQ);

      await service.processAbandonedSessionReminders();

      expect(notificationService.sendSessionReminderEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'Assessment', // default
        expect.any(Number),
      );
    });

    it('should update session metadata with reminder tracking', async () => {
      prisma.session.findMany.mockResolvedValue([mockAbandonedSession]);
      prisma.session.findUnique.mockResolvedValue({ metadata: null, userId: 'user-1' });
      prisma.session.update.mockResolvedValue(mockAbandonedSession);

      await service.processAbandonedSessionReminders();

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          metadata: expect.objectContaining({
            reminders: expect.objectContaining({
              sent: 1,
              lastAt: expect.any(String),
            }),
          }),
        },
      });
    });
  });

  describe('getReminderStats', () => {
    it('should return placeholder stats', async () => {
      const stats = await service.getReminderStats();

      expect(stats).toEqual({
        totalSessionsWithReminders: 0,
        remindersByCount: { 1: 0, 2: 0, 3: 0 },
      });
    });
  });
});
