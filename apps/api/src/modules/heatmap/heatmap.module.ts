import { Module } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';
import { HeatmapController } from './heatmap.controller';
import { PrismaModule } from '@libs/database';
import { RedisModule } from '@libs/redis';

/**
 * Gap Heatmap Module
 *
 * Provides dimension × severity visualization for readiness gaps.
 *
 * Features:
 * - Generate heatmap with color-coded cells (Green/Amber/Red)
 * - Export to CSV and Markdown formats
 * - Drilldown into specific cells to see contributing questions
 * - Summary statistics (critical gaps, overall risk)
 *
 * Cell Value Formula: Sum(Severity × (1 - Coverage)) per dimension/bucket
 */
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HeatmapController],
  providers: [HeatmapService],
  exports: [HeatmapService],
})
export class HeatmapModule {}
