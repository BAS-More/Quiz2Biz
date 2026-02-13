/**
 * QPG (Qoder Prompt Generator) Module
 *
 * Converts readiness gaps identified by the Quiz2Biz scoring engine
 * into actionable Quest-Mode prompts for automated remediation.
 *
 * Core Functionality:
 * - Gap-to-prompt mapping based on dimension and severity
 * - Structured prompt generation (Goal → Tasks → Acceptance → Constraints → Deliverables)
 * - Template management for all 11 readiness dimensions
 * - Context-aware prompt generation with evidence requirements
 */
import { Module } from '@nestjs/common';
import { QpgController } from './qpg.controller';
import { QpgService } from './qpg.service';
import { PromptTemplateService } from './services/prompt-template.service';
import { ContextBuilderService } from './services/context-builder.service';
import { PromptGeneratorService } from './services/prompt-generator.service';
import { PrismaModule } from '@libs/database';

@Module({
  imports: [PrismaModule],
  controllers: [QpgController],
  providers: [QpgService, PromptTemplateService, ContextBuilderService, PromptGeneratorService],
  exports: [QpgService, ContextBuilderService],
})
export class QpgModule {}
