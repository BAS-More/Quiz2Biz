import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@libs/database';
import { NotificationService } from '../notification.service';

/**
 * Reminder intervals for abandoned sessions
 */
const REMINDER_INTERVALS = {
  FIRST: 24 * 60 * 60 * 1000,    // 24 hours
  SECOND: 72 * 60 * 60 * 1000,   // 72 hours (3 days)
  FINAL: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface ReminderTracker {
  sessionId: string;
  userId: string;
  remindersSent: number;
  lastReminderAt: Date | null;
}

@Injectable()
export class SessionReminderJobService {
  private readonly logger = new Logger(SessionReminderJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Run every 6 hours to check for abandoned sessions and send reminders
   * Sends up to 3 reminders: at 24h, 72h, and 7 days of inactivity
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async processAbandonedSessionReminders(): Promise<void> {
    this.logger.log('Starting abandoned session reminder job');

    const now = new Date();

    // Find sessions that are IN_PROGRESS and haven't been updated recently
    const abandonedSessions = await this.findAbandonedSessions(now);

    let sentCount = 0;
    let skippedCount = 0;

    for (const session of abandonedSessions) {
      try {
        const shouldSend = await this.shouldSendReminder(session, now);
        if (!shouldSend) {
          skippedCount++;
          continue;
        }

        await this.sendReminderAndTrack(session, now);
        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to process reminder for session ${session.id}`, error);
      }
    }

    this.logger.log(
      `Abandoned session reminder job completed: ${sentCount} sent, ${skippedCount} skipped`,
    );
  }

  /**
   * Find sessions that are potentially abandoned
   * Criteria: IN_PROGRESS status, last activity > 24 hours ago
   */
  private async findAbandonedSessions(now: Date) {
    const abandonedThreshold = new Date(now.getTime() - REMINDER_INTERVALS.FIRST);

    return this.prisma.session.findMany({
      where: {
        status: 'IN_PROGRESS',
        lastActivityAt: {
          lte: abandonedThreshold,
        },
        // Exclude sessions that are about to expire (handled by expiration service)
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: { 
          select: { 
            id: true,
            email: true, 
            name: true,
            notificationPreferences: true,
          } 
        },
        questionnaire: { select: { name: true } },
      },
      take: 100, // Process in batches
    });
  }

  /**
   * Determine if a reminder should be sent based on last activity and previous reminders
   */
  private async shouldSendReminder(
    session: { id: string; lastActivityAt: Date; userId: string },
    now: Date,
  ): Promise<boolean> {
    const timeSinceLastActivity = now.getTime() - session.lastActivityAt.getTime();

    // Get existing reminder record
    const reminderRecord = await this.getReminderRecord(session.id);

    if (!reminderRecord) {
      // No reminders sent yet, should send if > 24h
      return timeSinceLastActivity >= REMINDER_INTERVALS.FIRST;
    }

    const { remindersSent, lastReminderAt } = reminderRecord;

    // Max 3 reminders
    if (remindersSent >= 3) {
      return false;
    }

    // Calculate minimum time for next reminder
    const nextReminderThreshold = remindersSent === 1
      ? REMINDER_INTERVALS.SECOND  // After 1st reminder, wait until 72h mark
      : REMINDER_INTERVALS.FINAL;  // After 2nd reminder, wait until 7d mark

    // Check if enough time has passed since last activity
    return timeSinceLastActivity >= nextReminderThreshold;
  }

  /**
   * Get reminder tracking record for a session
   */
  private async getReminderRecord(sessionId: string): Promise<ReminderTracker | null> {
    // Store reminder tracking in session metadata
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { metadata: true, userId: true },
    });

    if (!session?.metadata || typeof session.metadata !== 'object') {
      return null;
    }

    const metadata = session.metadata as Record<string, unknown>;
    if (!metadata.reminders) {
      return null;
    }

    const reminders = metadata.reminders as { sent: number; lastAt: string | null };
    return {
      sessionId,
      userId: session.userId,
      remindersSent: reminders.sent || 0,
      lastReminderAt: reminders.lastAt ? new Date(reminders.lastAt) : null,
    };
  }

  /**
   * Send reminder email and update tracking
   */
  private async sendReminderAndTrack(
    session: {
      id: string;
      userId: string;
      user: { id: string; email: string; name?: string | null; notificationPreferences?: unknown } | null;
      questionnaire: { name: string } | null;
      progress?: unknown;
    },
    now: Date,
  ): Promise<void> {
    if (!session.user?.email) {
      return;
    }

    // Check user notification preferences
    const prefs = session.user.notificationPreferences as Record<string, boolean> | null;
    if (prefs?.email_session_complete === false) {
      // User has opted out of session notifications
      return;
    }

    const userName = session.user.name || session.user.email.split('@')[0];
    const progress = typeof session.progress === 'number' ? session.progress : 0;
    const questionnaireName = session.questionnaire?.name || 'Assessment';

    // Get current reminder count
    const currentRecord = await this.getReminderRecord(session.id);
    const reminderNumber = (currentRecord?.remindersSent || 0) + 1;

    // Send the reminder email
    await this.notificationService.sendSessionReminderEmail(
      session.user.email,
      userName,
      session.id,
      questionnaireName,
      progress,
    );

    // Update reminder tracking in session metadata
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        metadata: {
          ...(await this.getSessionMetadata(session.id)),
          reminders: {
            sent: reminderNumber,
            lastAt: now.toISOString(),
          },
        },
      },
    });

    this.logger.log(
      `Sent reminder #${reminderNumber} for session ${session.id} to ${session.user.email}`,
    );
  }

  /**
   * Get current session metadata
   */
  private async getSessionMetadata(sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { metadata: true },
    });

    if (session?.metadata && typeof session.metadata === 'object') {
      return session.metadata as Record<string, unknown>;
    }
    return {};
  }

  /**
   * Get statistics about reminders sent
   */
  async getReminderStats(): Promise<{
    totalSessionsWithReminders: number;
    remindersByCount: Record<number, number>;
  }> {
    // This would require querying session metadata
    // For now, return placeholder stats
    return {
      totalSessionsWithReminders: 0,
      remindersByCount: { 1: 0, 2: 0, 3: 0 },
    };
  }
}
