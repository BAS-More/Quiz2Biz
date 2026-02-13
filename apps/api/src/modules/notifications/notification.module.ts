import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdaptiveCardService } from './adaptive-card.service';
import { TeamsWebhookController } from './teams-webhook.controller';

@Global()
@Module({
  controllers: [NotificationController, TeamsWebhookController],
  providers: [NotificationService, AdaptiveCardService],
  exports: [NotificationService, AdaptiveCardService],
})
export class NotificationModule {}
