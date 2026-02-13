import { Module } from '@nestjs/common';
import { ScoringEngineService } from './scoring-engine.service';
import { ScoringEngineController } from './scoring-engine.controller';
import { PrismaModule } from '@libs/database';
import { RedisModule } from '@libs/redis';

/**
 * Scoring Engine Module
 *
 * Implements Quiz2Biz risk-weighted readiness scoring with explicit formulas:
 * - Coverage: C_i ∈ [0,1] per question
 * - Dimension Residual: R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
 * - Portfolio Residual: R = Σ(W_d × R_d)
 * - Readiness Score: Score = 100 × (1 - R)
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ScoringEngineController],
  providers: [ScoringEngineService],
  exports: [ScoringEngineService],
})
export class ScoringEngineModule {}
