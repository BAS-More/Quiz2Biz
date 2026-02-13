import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import { SendEmailDto, EmailType, EmailResponseDto, BulkSendEmailDto } from './dto/send-email.dto';
import { EMAIL_TEMPLATES, EmailTemplateData } from './dto/email-template.dto';

/**
 * Email Provider Interface for swappable email backends
 */
interface EmailProvider {
  send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ messageId?: string; success: boolean; error?: string }>;
}

/**
 * SendGrid Email Provider Implementation
 */
class SendGridProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly logger = new Logger('SendGridProvider');

  constructor(apiKey: string, fromEmail: string, fromName: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ messageId?: string; success: boolean; error?: string }> {
    try {
      // Using fetch for SendGrid v3 API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.fromEmail, name: this.fromName },
          subject,
          content: [
            ...(text ? [{ type: 'text/plain', value: text }] : []),
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('x-message-id') || undefined;
        return { success: true, messageId };
      }

      const errorBody = await response.text();
      this.logger.error(`SendGrid error: ${response.status} - ${errorBody}`);
      return { success: false, error: `SendGrid error: ${response.status}` };
    } catch (error) {
      this.logger.error('SendGrid request failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

/**
 * Console Email Provider for development/testing
 */
class ConsoleProvider implements EmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ messageId?: string; success: boolean; error?: string }> {
    this.logger.log('='.repeat(60));
    this.logger.log(`TO: ${to}`);
    this.logger.log(`SUBJECT: ${subject}`);
    this.logger.log('-'.repeat(60));
    this.logger.log(text || html);
    this.logger.log('='.repeat(60));
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

/**
 * Notification Service
 *
 * Handles all email notifications with support for:
 * - Predefined email templates (verification, password reset, etc.)
 * - Custom emails
 * - Template variable substitution
 * - Audit logging
 * - Provider abstraction (SendGrid, Console for dev)
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly provider: EmailProvider;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@quiz2biz.com');
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Quiz2Biz');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    if (sendgridApiKey) {
      this.provider = new SendGridProvider(sendgridApiKey, fromEmail, fromName);
      this.logger.log('Email provider initialized: SendGrid');
    } else {
      this.provider = new ConsoleProvider();
      this.logger.warn('No SENDGRID_API_KEY configured - using console email provider');
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(dto: SendEmailDto): Promise<EmailResponseDto> {
    const timestamp = new Date();

    try {
      let html: string;
      let text: string | undefined;
      let subject = dto.subject;

      if (dto.type === EmailType.CUSTOM) {
        html = dto.htmlContent || dto.textContent || '';
        text = dto.textContent;
      } else {
        const template = EMAIL_TEMPLATES[dto.type];
        if (!template) {
          throw new Error(`Unknown email template type: ${dto.type}`);
        }

        html = this.processTemplate(template.htmlTemplate, dto.data || {});
        text = template.textTemplate
          ? this.processTemplate(template.textTemplate, dto.data || {})
          : undefined;
        subject = this.processTemplate(template.subject, dto.data || {});
      }

      const result = await this.provider.send(dto.to, subject, html, text);

      // Log to audit
      await this.logEmailSent(dto.to, dto.type, result.success, result.messageId, result.error);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        to: dto.to,
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${dto.to}`, error);

      await this.logEmailSent(dto.to, dto.type, false, undefined, errorMessage);

      return {
        success: false,
        error: errorMessage,
        to: dto.to,
        timestamp,
      };
    }
  }

  /**
   * Send multiple emails (bulk operation)
   */
  async sendBulkEmails(dto: BulkSendEmailDto): Promise<EmailResponseDto[]> {
    const results: EmailResponseDto[] = [];

    for (const email of dto.emails) {
      const result = await this.sendEmail(email);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    userName: string,
    verificationToken: string,
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify your email',
      type: EmailType.VERIFICATION,
      data: {
        userName,
        actionUrl,
        expiresIn: '24 hours',
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetToken: string,
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset your password',
      type: EmailType.PASSWORD_RESET,
      data: {
        userName,
        actionUrl,
        expiresIn: '1 hour',
      },
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/dashboard`;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Quiz2Biz',
      type: EmailType.WELCOME,
      data: {
        userName,
        actionUrl,
      },
    });
  }

  /**
   * Send session reminder email
   */
  async sendSessionReminderEmail(
    email: string,
    userName: string,
    sessionId: string,
    questionnaireName: string,
    progressPercentage: number,
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/session/${sessionId}/continue`;

    return this.sendEmail({
      to: email,
      subject: `Continue your assessment - ${progressPercentage}% complete`,
      type: EmailType.SESSION_REMINDER,
      data: {
        userName,
        actionUrl,
        sessionId,
        questionnaireName,
        progressPercentage,
      },
    });
  }

  /**
   * Send documents ready email
   */
  async sendDocumentsReadyEmail(
    email: string,
    userName: string,
    sessionId: string,
    documentNames: string[],
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/session/${sessionId}/documents`;

    return this.sendEmail({
      to: email,
      subject: 'Your documents are ready',
      type: EmailType.DOCUMENTS_READY,
      data: {
        userName,
        actionUrl,
        documentNames,
      },
    });
  }

  /**
   * Send documents approved email
   */
  async sendDocumentsApprovedEmail(
    email: string,
    userName: string,
    sessionId: string,
    documentNames: string[],
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/session/${sessionId}/documents`;

    return this.sendEmail({
      to: email,
      subject: 'Your documents have been approved',
      type: EmailType.DOCUMENTS_APPROVED,
      data: {
        userName,
        actionUrl,
        documentNames,
      },
    });
  }

  /**
   * Send review pending notification to admin
   */
  async sendReviewPendingEmail(
    adminEmail: string,
    adminName: string,
    documentNames: string[],
  ): Promise<EmailResponseDto> {
    const actionUrl = `${this.frontendUrl}/admin/review`;

    return this.sendEmail({
      to: adminEmail,
      subject: 'Documents pending review',
      type: EmailType.REVIEW_PENDING,
      data: {
        userName: adminName,
        actionUrl,
        documentNames,
      },
    });
  }

  /**
   * Process template with variable substitution
   */
  private processTemplate(template: string, data: EmailTemplateData): string {
    let result = template;

    // Handle simple {{variable}} substitutions
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }

    // Handle {{#each array}} ... {{/each}} blocks
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    result = result.replace(eachRegex, (_, arrayName, content) => {
      const array = data[arrayName];
      if (Array.isArray(array)) {
        return array.map((item) => content.replace(/{{this}}/g, String(item))).join('');
      }
      return '';
    });

    return result;
  }

  /**
   * Log email to audit table
   */
  private async logEmailSent(
    to: string,
    type: EmailType,
    success: boolean,
    messageId?: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT',
          resourceType: 'Email',
          resourceId: messageId || `email-${Date.now()}`,
          changes: {
            to,
            type,
            success,
            error,
            sentAt: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      this.logger.warn('Failed to log email to audit', err);
    }
  }
}
