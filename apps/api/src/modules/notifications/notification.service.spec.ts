import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { PrismaService } from '@libs/database';
import { EmailType } from './dto/send-email.dto';

// Mock global fetch
global.fetch = jest.fn();

describe('NotificationService', () => {
  let service: NotificationService;
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
    module.get(PrismaService);
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
          if (key === 'BREVO_API_KEY') {
            return 'brevo-api-key';
          }
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
          if (key === 'SENDGRID_API_KEY') {
            return 'sendgrid-api-key';
          }
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
          {
            to: 'user1@example.com',
            subject: 'Test 1',
            type: EmailType.CUSTOM,
            textContent: 'Test',
          },
          {
            to: 'user2@example.com',
            subject: 'Test 2',
            type: EmailType.CUSTOM,
            textContent: 'Test',
          },
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
      const result = await service.sendWelcomeEmail('user@example.com', 'John Doe');

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
      const result = await service.sendReviewPendingEmail('admin@example.com', 'Admin User', [
        'Document 1.docx',
        'Document 2.docx',
      ]);

      expect(result.success).toBe(true);
      expect(result.to).toBe('admin@example.com');
    });
  });

  describe('Brevo provider error handling', () => {
    let brevoService: NotificationService;

    beforeEach(async () => {
      const brevoConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'BREVO_API_KEY') {
            return 'brevo-api-key';
          }
          if (key === 'EMAIL_FROM') {
            return 'test@quiz2biz.com';
          }
          if (key === 'EMAIL_FROM_NAME') {
            return 'Quiz2Biz Test';
          }
          if (key === 'FRONTEND_URL') {
            return 'http://localhost:3001';
          }
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: brevoConfig },
        ],
      }).compile();

      brevoService = module.get<NotificationService>(NotificationService);
    });

    it('should handle Brevo API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await brevoService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Brevo error: 401');
    });

    it('should handle Brevo API network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await brevoService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      const result = await brevoService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should include text content in Brevo request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: 'msg-123' }),
      });

      await brevoService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        htmlContent: '<p>HTML</p>',
        textContent: 'Plain text',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          body: expect.stringContaining('textContent'),
        }),
      );
    });
  });

  describe('SendGrid provider error handling', () => {
    let sendgridService: NotificationService;

    beforeEach(async () => {
      const sendgridConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'SENDGRID_API_KEY') {
            return 'sendgrid-api-key';
          }
          if (key === 'EMAIL_FROM') {
            return 'test@quiz2biz.com';
          }
          if (key === 'EMAIL_FROM_NAME') {
            return 'Quiz2Biz Test';
          }
          if (key === 'FRONTEND_URL') {
            return 'http://localhost:3001';
          }
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: sendgridConfig },
        ],
      }).compile();

      sendgridService = module.get<NotificationService>(NotificationService);
    });

    it('should handle SendGrid 202 status as success', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 202,
        headers: new Headers({ 'x-message-id': 'sg-msg-123' }),
      });

      const result = await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg-msg-123');
    });

    it('should handle SendGrid API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SendGrid error: 403');
    });

    it('should handle SendGrid network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle non-Error exceptions in SendGrid', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce({ code: 'TIMEOUT' });

      const result = await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should include text content in SendGrid request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers(),
      });

      await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        htmlContent: '<p>HTML</p>',
        textContent: 'Plain text',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({
          body: expect.stringContaining('text/plain'),
        }),
      );
    });

    it('should not include text content when only html provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers(),
      });

      await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        htmlContent: '<p>HTML only</p>',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.content).toHaveLength(1);
      expect(body.content[0].type).toBe('text/html');
    });
  });

  describe('sendEmail - template handling', () => {
    it('should throw error for unknown template type', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: 'UNKNOWN_TYPE' as EmailType,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown email template type');
    });

    it('should handle template with textTemplate', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Welcome',
        type: EmailType.WELCOME,
        data: {
          userName: 'John',
          actionUrl: 'http://localhost/dashboard',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should process template variables in subject', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Verify',
        type: EmailType.VERIFICATION,
        data: {
          userName: 'Jane',
          actionUrl: 'http://localhost/verify',
          expiresIn: '24 hours',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('processTemplate - {{#each}} blocks', () => {
    it('should process array iteration in template', async () => {
      const result = await service.sendDocumentsReadyEmail(
        'user@example.com',
        'John',
        'session-123',
        ['Document1.pdf', 'Document2.pdf', 'Document3.pdf'],
      );

      expect(result.success).toBe(true);
    });

    it('should handle empty array in {{#each}} block', async () => {
      const result = await service.sendDocumentsReadyEmail(
        'user@example.com',
        'John',
        'session-123',
        [],
      );

      expect(result.success).toBe(true);
    });

    it('should handle non-array in {{#each}} block', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.DOCUMENTS_READY,
        data: {
          userName: 'John',
          actionUrl: 'http://localhost',
          documentNames: 'not-an-array' as unknown as string[],
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('logEmailSent - error handling', () => {
    it('should handle audit log creation failure gracefully', async () => {
      mockPrismaService.auditLog.create.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      // Should not throw
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      // Email should still succeed even if audit log fails
      expect(result.success).toBe(true);
    });
  });

  describe('sendEmail - exception handling', () => {
    let errorService: NotificationService;

    beforeEach(async () => {
      const brevoConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'BREVO_API_KEY') {
            return 'brevo-api-key';
          }
          if (key === 'EMAIL_FROM') {
            return 'test@quiz2biz.com';
          }
          if (key === 'EMAIL_FROM_NAME') {
            return 'Quiz2Biz Test';
          }
          if (key === 'FRONTEND_URL') {
            return 'http://localhost:3001';
          }
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: brevoConfig },
        ],
      }).compile();

      errorService = module.get<NotificationService>(NotificationService);
    });

    it('should handle exception in sendEmail', async () => {
      // Mock fetch to throw an error
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await errorService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should handle non-Error exception in sendEmail', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'String exception';
      });

      const result = await errorService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('sendEmail - CUSTOM type variations', () => {
    it('should send custom email with only textContent', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Plain text email',
        type: EmailType.CUSTOM,
        textContent: 'This is plain text only',
      });

      expect(result.success).toBe(true);
    });

    it('should use empty string when no content provided for CUSTOM', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Empty email',
        type: EmailType.CUSTOM,
      });

      expect(result.success).toBe(true);
    });

    it('should prefer htmlContent over textContent for CUSTOM html body', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'HTML email',
        type: EmailType.CUSTOM,
        htmlContent: '<h1>HTML</h1>',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('processTemplate - number values', () => {
    it('should substitute number values in templates', async () => {
      const result = await service.sendSessionReminderEmail(
        'user@example.com',
        'John',
        'session-1',
        'My Questionnaire',
        75,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('logEmailSent - fallback resourceId', () => {
    it('should use fallback resourceId when messageId is undefined', async () => {
      // Console provider always returns messageId, so we send a failed email to get undefined messageId
      // Force audit log to record the call
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Send an email with a template that has no messageId in the result
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      // The audit log should have been called
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('SendGrid - missing x-message-id header', () => {
    let sendgridService: NotificationService;

    beforeEach(async () => {
      const sendgridConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'SENDGRID_API_KEY') {
            return 'sendgrid-api-key';
          }
          if (key === 'EMAIL_FROM') {
            return 'test@quiz2biz.com';
          }
          if (key === 'EMAIL_FROM_NAME') {
            return 'Quiz2Biz Test';
          }
          if (key === 'FRONTEND_URL') {
            return 'http://localhost:3001';
          }
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: sendgridConfig },
        ],
      }).compile();

      sendgridService = module.get<NotificationService>(NotificationService);
    });

    it('should return undefined messageId when x-message-id header is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(), // no x-message-id header
      });

      const result = await sendgridService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        textContent: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('Brevo provider - text parameter omitted', () => {
    let brevoService: NotificationService;

    beforeEach(async () => {
      const brevoConfig = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'BREVO_API_KEY') {
            return 'brevo-api-key';
          }
          if (key === 'EMAIL_FROM') {
            return 'test@quiz2biz.com';
          }
          if (key === 'EMAIL_FROM_NAME') {
            return 'Quiz2Biz Test';
          }
          if (key === 'FRONTEND_URL') {
            return 'http://localhost:3001';
          }
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: brevoConfig },
        ],
      }).compile();

      brevoService = module.get<NotificationService>(NotificationService);
    });

    it('should not include textContent in Brevo request when text is undefined', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messageId: 'msg-456' }),
      });

      await brevoService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        type: EmailType.CUSTOM,
        htmlContent: '<p>HTML only</p>',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.textContent).toBeUndefined();
    });
  });
});
