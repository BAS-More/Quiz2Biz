import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionExpirationService } from './session-expiration.service';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module';
import { AdaptiveLogicModule } from '../adaptive-logic/adaptive-logic.module';
import { ScoringEngineModule } from '../scoring-engine/scoring-engine.module';
import { IdeaCaptureModule } from '../idea-capture/idea-capture.module';

@Module({
  imports: [
    QuestionnaireModule,
    forwardRef(() => AdaptiveLogicModule),
    ScoringEngineModule,
    IdeaCaptureModule, // For ClaudeAiService used by ConversationService
  ],
  controllers: [SessionController, ConversationController],
  providers: [SessionService, SessionExpirationService, ConversationService],
  exports: [SessionService, ConversationService],
})
export class SessionModule {}
