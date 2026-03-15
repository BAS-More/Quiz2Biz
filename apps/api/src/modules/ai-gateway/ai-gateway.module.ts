import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';
import { ClaudeAdapter, OpenAIAdapter } from './adapters';
import { CostTrackerService } from './services';

/**
 * AI Gateway Module
 *
 * Provides unified AI capabilities across multiple providers (Claude, OpenAI).
 * Features:
 * - Provider abstraction and routing
 * - Automatic fallback on provider failure
 * - SSE streaming for chat responses
 * - Cost tracking per project/user
 * - JSON mode for structured outputs
 */
@Module({
  imports: [PrismaModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService, ClaudeAdapter, OpenAIAdapter, CostTrackerService],
  exports: [AiGatewayService, CostTrackerService],
})
export class AiGatewayModule {}
