import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionExpirationService } from './session-expiration.service';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module';
import { AdaptiveLogicModule } from '../adaptive-logic/adaptive-logic.module';
import { ScoringEngineModule } from '../scoring-engine/scoring-engine.module';

@Module({
  imports: [QuestionnaireModule, forwardRef(() => AdaptiveLogicModule), ScoringEngineModule],
  controllers: [SessionController],
  providers: [SessionService, SessionExpirationService],
  exports: [SessionService],
})
export class SessionModule {}
