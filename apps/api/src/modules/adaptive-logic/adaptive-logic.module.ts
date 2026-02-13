import { Module, forwardRef } from '@nestjs/common';
import { AdaptiveLogicService } from './adaptive-logic.service';
import { ConditionEvaluator } from './evaluators/condition.evaluator';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [forwardRef(() => SessionModule)],
  providers: [AdaptiveLogicService, ConditionEvaluator],
  exports: [AdaptiveLogicService],
})
export class AdaptiveLogicModule {}
