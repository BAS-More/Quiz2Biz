import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { ChatEngineController } from './chat-engine.controller';
import { ChatEngineService } from './chat-engine.service';
import { PromptBuilderService } from './services';

/**
 * Chat Engine Module
 *
 * Core module for Quiz2Biz chat functionality.
 * Features:
 * - Project-based chat sessions
 * - 50-message limit enforcement
 * - AI provider integration via AI Gateway
 * - Context-aware prompt building
 * - SSE streaming support
 */
@Module({
  imports: [PrismaModule, AiGatewayModule],
  controllers: [ChatEngineController],
  providers: [ChatEngineService, PromptBuilderService],
  exports: [ChatEngineService, PromptBuilderService],
})
export class ChatEngineModule {}
