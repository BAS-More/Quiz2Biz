/**
 * Fact Extraction Module
 *
 * Module for extracting structured business facts from chat conversations.
 * Features:
 * - AI-powered fact extraction
 * - Schema-based extraction for 7 project types
 * - Fact validation and completeness scoring
 * - Manual fact editing
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { FactExtractionController } from './fact-extraction.controller';
import { FactsController } from './facts.controller';
import { FactExtractionService } from './services';

@Module({
  imports: [PrismaModule, AiGatewayModule],
  controllers: [FactExtractionController, FactsController],
  providers: [FactExtractionService],
  exports: [FactExtractionService],
})
export class FactExtractionModule {}
