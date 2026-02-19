import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdeaCaptureController } from './idea-capture.controller';
import { IdeaCaptureService } from './services/idea-capture.service';
import { ClaudeAiService } from './services/claude-ai.service';

/**
 * IdeaCaptureModule — Free-form idea submission → AI analysis → project type recommendation.
 *
 * Endpoints:
 *   POST   /api/v1/sessions/idea        — Submit idea for analysis
 *   GET    /api/v1/sessions/idea/:id     — Get idea details
 *   PATCH  /api/v1/sessions/idea/:id/confirm — Confirm project type
 *   POST   /api/v1/sessions/idea/:id/session — Create questionnaire session
 */
@Module({
  imports: [ConfigModule],
  controllers: [IdeaCaptureController],
  providers: [IdeaCaptureService, ClaudeAiService],
  exports: [IdeaCaptureService, ClaudeAiService],
})
export class IdeaCaptureModule {}
