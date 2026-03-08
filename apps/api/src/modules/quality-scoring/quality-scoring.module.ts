/**
 * Quality Scoring Module
 * 
 * Module for evaluating project quality against quality dimensions
 * and benchmark criteria for Quiz2Biz document generation pricing.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { QualityScoringController } from './quality-scoring.controller';
import { QualityScoringService } from './services';

@Module({
  imports: [PrismaModule],
  controllers: [QualityScoringController],
  providers: [QualityScoringService],
  exports: [QualityScoringService],
})
export class QualityScoringModule {}
