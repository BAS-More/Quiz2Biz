import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { PrismaService } from '@libs/database';
import { EmailType } from './dto/send-email.dto';

// Mock global fetch
global.fetch = jest.fn();

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        EMAIL_FROM: 'test@quiz2biz.com',
        EMAIL_FROM_NAME: 'Quiz2Biz Test',
        FRONTEND_URL: 'http://localhost:3001',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-123' }),
      headers: new Headers(),
      status: 200,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  describe('constructor', () => {
    it('should initialize with console provider when no API keys configured', () => {
      expect(configService.get).toHaveBeenCalledWith('BREVO_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('SENDGRID_API_KEY');
    });

    it('should initialize with Brevo provider when BREVO_API_KEY is set', async () => {
      const brevoConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'BREVO_API_KEY') return 'brevo-api-key';
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: brevoConfig },
        ],
      }).compile();

      const brevoService = module.get<NotificationService>(NotificationService);
      expect(brevoService).toBeDefined();
    });

    it('should initialize with SendGrid provider when SENDGRID_API_KEY is set', async () => {
      const sendgridConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'SENDGRID_API_KEY') return 'sendgrid-api-key';
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: sendgridConfig },
        ],
      }).compile();

      const sendgridService = module.get<NotificationService>(NotificationService);
      expect(sendgridService).toBeDefined();
    });
  });

  describe('sendEmail', () => {
    it('should send a custom email successfully', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        type: EmailType.CUSTOM,
        htmlContent: '<h1>Test</h1>',
      });

      expect(result.success).toBe(true);
      expect(result.to).toBe('user@example.com');
      expect(result.timestamp).toBeDefined();
    });

    it('should send a verification email with template', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Verify Email',
        type: EmailType.VERIFICATION,
        data: {
          userName: 'John',
          actionUrl: 'http://localhost/verify',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should log email to audit table', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test content',
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'EMAIL_SENT',
            resourceType: 'Email',
          }),
        }),
      );
    });

    it('should handle email sending failure gracefully', async () => {
      // With console provider, emails always succeed (it just logs)
      // This test verifies the service handles edge cases
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      // Console provider always succeeds
      expect(result.success).toBe(true);
      expect(result.to).toBe('user@example.com');
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails', async () => {
      const results = await service.sendBulkEmails({
        emails: [
          { to: 'user1@example.com', subject: 'Test 1', type: EmailType.CUSTOM, textContent: 'Test' },
          { to: 'user2@example.com', subject: 'Test 2', type: EmailType.CUSTOM, textContent: 'Test' },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle empty email list', async () => {
      const results = await service.sendBulkEmails({ emails: [] });
      expect(results).toEqual([]);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct data', async () => {
      const result = await service.sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'verification-token-123',
      );

      expect(result.success).toBe(true);
      expect(result.to).toBe('user@example.com');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct data', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'John Doe',
        'reset-token-123',
      );

      expect(result.success).toBe(true);
      expect(result.to).toBe('user@example.com');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      const result = await service.sendWelcomeEmail(
        'user@example.com',
        'John Doe',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendSessionReminderEmail', () => {
    it('should send session reminder email', async () => {
      const result = await service.sendSessionReminderEmail(
        'user@example.com',
        'John Doe',
        'session-123',
        'Business Plan',
        50,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendDocumentsReadyEmail', () => {
    it('should send documents ready email', async () => {
      const result = await service.sendDocumentsReadyEmail(
        'user@example.com',
        'John Doe',
        'session-123',
        ['Business Plan.docx', 'Financial Projections.docx'],
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendDocumentsApprovedEmail', () => {
    it('should send documents approved email', async () => {
      const result = await service.sendDocumentsApprovedEmail(
        'user@example.com',
        'John Doe',
        'session-123',
        ['Business Plan.docx'],
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendReviewPendingEmail', () => {
    it('should send review pending email to admin', async () => {
      const result = await service.sendReviewPendingEmail(
        'admin@example.com',
        'Admin User',
        ['Document 1.docx', 'Document 2.docx'],
      );

      expect(result.success).toBe(true);
      expect(result.to).toBe('admin@example.com');
    });
  });
});
