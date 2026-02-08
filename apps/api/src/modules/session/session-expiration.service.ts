import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@libs/database';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SessionExpirationService {
  private readonly logger = new Logger(SessionExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSessions(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.session.updateMany({
      where: {
        status: 'IN_PROGRESS',
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} sessions`);
    }
  }

  /**
   * Send reminder emails for sessions expiring within the next 24 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async sendExpirationReminders(): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringSessions = await this.prisma.session.findMany({
      where: {
        status: 'IN_PROGRESS',
        expiresAt: {
          gt: now,
          lte: in24Hours,
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        questionnaire: { select: { name: true } },
      },
    });

    for (const session of expiringSessions) {
      if (!session.user?.email) continue;

      const userName = session.user.name || session.user.email.split('@')[0];
      const progress = typeof session.progress === 'number' ? session.progress : 0;

      this.notificationService
        .sendSessionReminderEmail(
          session.user.email,
          userName,
          session.id,
          session.questionnaire?.name || 'Assessment',
          progress,
        )
        .catch((err) => {
          this.logger.warn(`Failed to send session reminder for ${session.id}`, err);
        });
    }

    if (expiringSessions.length > 0) {
      this.logger.log(`Sent ${expiringSessions.length} session expiration reminders`);
    }
  }
}
