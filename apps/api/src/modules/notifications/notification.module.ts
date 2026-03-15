import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdaptiveCardService } from './adaptive-card.service';
import { TeamsWebhookController } from './teams-webhook.controller';
import { SessionReminderJobService } from './jobs/session-reminder.job';

@Global()
@Module({
  controllers: [NotificationController, TeamsWebhookController],
  providers: [NotificationService, AdaptiveCardService, SessionReminderJobService],
  exports: [NotificationService, AdaptiveCardService, SessionReminderJobService],
})
export class NotificationModule {}
