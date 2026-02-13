import { Module } from '@nestjs/common';
import { DecisionLogService } from './decision-log.service';
import { DecisionLogController } from './decision-log.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalGuard } from './decorators/require-approval.decorator';
import { PrismaModule } from '@libs/database';

/**
 * Decision Log Module
 *
 * Implements Quiz2Biz append-only forensic decision record:
 * - Status workflow: DRAFT -> LOCKED -> (AMENDED/SUPERSEDED)
 * - Append-only enforcement at service layer
 * - Supersession tracking for decision amendments
 * - Two-person rule via ApprovalWorkflowService
 * - Audit export for compliance
 */
@Module({
  imports: [PrismaModule],
  controllers: [DecisionLogController],
  providers: [DecisionLogService, ApprovalWorkflowService, ApprovalGuard],
  exports: [DecisionLogService, ApprovalWorkflowService],
})
export class DecisionLogModule {}
