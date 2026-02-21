import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: jest.Mocked<NotificationService>;

  const mockNotificationService = {
    sendEmail: jest.fn(),
    sendBulkEmails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockNotificationService }],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    notificationService = module.get(NotificationService);
  });

  describe('sendEmail', () => {
    it('should send a single email successfully', async () => {
      const dto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        data: { name: 'Test User' },
      };
      const mockResponse = {
        success: true,
        messageId: 'msg-123',
      };

      mockNotificationService.sendEmail.mockResolvedValue(mockResponse);

      const result = await controller.sendEmail(dto);

      expect(result).toEqual(mockResponse);
      expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(dto);
    });

    it('should handle email sending failure', async () => {
      const dto = {
        to: 'test@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      };

      mockNotificationService.sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      await expect(controller.sendEmail(dto)).rejects.toThrow('Email service unavailable');
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails successfully', async () => {
      const dto = {
        emails: [
          { to: 'user1@example.com', subject: 'Test 1', template: 'welcome', data: {} },
          { to: 'user2@example.com', subject: 'Test 2', template: 'welcome', data: {} },
        ],
      };
      const mockResponses = [
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ];

      mockNotificationService.sendBulkEmails.mockResolvedValue(mockResponses);

      const result = await controller.sendBulkEmails(dto);

      expect(result).toEqual(mockResponses);
      expect(result).toHaveLength(2);
      expect(mockNotificationService.sendBulkEmails).toHaveBeenCalledWith(dto);
    });

    it('should handle partial failure in bulk send', async () => {
      const dto = {
        emails: [
          { to: 'user1@example.com', subject: 'Test 1', template: 'welcome', data: {} },
          { to: 'invalid', subject: 'Test 2', template: 'welcome', data: {} },
        ],
      };
      const mockResponses = [
        { success: true, messageId: 'msg-1' },
        { success: false, error: 'Invalid email address' },
      ];

      mockNotificationService.sendBulkEmails.mockResolvedValue(mockResponses);

      const result = await controller.sendBulkEmails(dto);

      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
    });

    it('should handle empty email list', async () => {
      const dto = { emails: [] };
      mockNotificationService.sendBulkEmails.mockResolvedValue([]);

      const result = await controller.sendBulkEmails(dto);

      expect(result).toEqual([]);
    });
  });
});
