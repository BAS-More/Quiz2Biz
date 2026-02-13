import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DecisionLogService } from './decision-log.service';
import {
  CreateDecisionDto,
  UpdateDecisionStatusDto,
  SupersedeDecisionDto,
  ListDecisionsDto,
  DecisionResponse,
  DecisionAuditExport,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Decision Log Controller
 *
 * Provides endpoints for Quiz2Biz append-only decision management:
 * - Create decisions (DRAFT status)
 * - Lock decisions (DRAFT -> LOCKED)
 * - Supersede locked decisions
 * - Export for audit compliance
 */
@ApiTags('Decision Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decisions')
export class DecisionLogController {
  constructor(private readonly decisionService: DecisionLogService) {}

  /**
   * Create a new decision
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new decision',
    description: `
Create a new decision record in DRAFT status.
DRAFT decisions can be modified until they are locked.

Once locked, decisions cannot be changed - use supersession to amend.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Decision created successfully',
    type: DecisionResponse,
  })
  async createDecision(
    @Body() dto: CreateDecisionDto,
    @Request() req: { user: { userId: string } },
  ): Promise<DecisionResponse> {
    return this.decisionService.createDecision(dto, req.user.userId);
  }

  /**
   * Lock a decision (DRAFT -> LOCKED)
   */
  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock a decision',
    description: `
Lock a DRAFT decision, making it permanent.

**Append-Only Enforcement:**
- Only DRAFT decisions can be locked
- Locked decisions cannot be modified
- To change a locked decision, use supersession
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Decision locked successfully',
    type: DecisionResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Decision is not in DRAFT status',
  })
  async lockDecision(
    @Body() dto: UpdateDecisionStatusDto,
    @Request() req: { user: { userId: string } },
  ): Promise<DecisionResponse> {
    return this.decisionService.updateDecisionStatus(dto, req.user.userId);
  }

  /**
   * Supersede a locked decision
   */
  @Post('supersede')
  @ApiOperation({
    summary: 'Supersede a locked decision',
    description: `
Create a new decision that supersedes an existing LOCKED decision.

This is the ONLY way to "amend" a locked decision.
The original decision is marked as SUPERSEDED and linked to the new one.

**Audit Trail:**
- Original decision remains in the log with SUPERSEDED status
- New decision references the original via supersedesDecisionId
- Full supersession chain can be retrieved
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Supersession created successfully',
    type: DecisionResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Original decision is not in LOCKED status',
  })
  async supersedeDecision(
    @Body() dto: SupersedeDecisionDto,
    @Request() req: { user: { userId: string } },
  ): Promise<DecisionResponse> {
    return this.decisionService.supersedeDecision(dto, req.user.userId);
  }

  /**
   * Get a decision by ID
   */
  @Get(':decisionId')
  @ApiOperation({
    summary: 'Get a decision by ID',
    description: 'Retrieve a single decision record.',
  })
  @ApiParam({
    name: 'decisionId',
    description: 'Decision UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Decision found',
    type: DecisionResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Decision not found',
  })
  async getDecision(@Param('decisionId') decisionId: string): Promise<DecisionResponse> {
    return this.decisionService.getDecision(decisionId);
  }

  /**
   * List decisions with filters
   */
  @Get()
  @ApiOperation({
    summary: 'List decisions',
    description: 'List decisions with optional filters for session, owner, and status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of decisions',
    type: [DecisionResponse],
  })
  async listDecisions(@Query() filters: ListDecisionsDto): Promise<DecisionResponse[]> {
    return this.decisionService.listDecisions(filters);
  }

  /**
   * Get supersession chain for a decision
   */
  @Get(':decisionId/chain')
  @ApiOperation({
    summary: 'Get supersession chain',
    description: 'Get the full supersession history for a decision.',
  })
  @ApiParam({
    name: 'decisionId',
    description: 'Decision UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Supersession chain',
    type: [DecisionResponse],
  })
  async getSupersessionChain(@Param('decisionId') decisionId: string): Promise<DecisionResponse[]> {
    return this.decisionService.getSupersessionChain(decisionId);
  }

  /**
   * Export decisions for audit
   */
  @Get('export/:sessionId')
  @ApiOperation({
    summary: 'Export decisions for audit',
    description: `
Export all decisions for a session in audit format.
Includes supersession chain mapping for compliance review.
    `,
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit export',
    type: DecisionAuditExport,
  })
  async exportForAudit(@Param('sessionId') sessionId: string): Promise<DecisionAuditExport> {
    return this.decisionService.exportForAudit(sessionId);
  }

  /**
   * Delete a draft decision
   */
  @Delete(':decisionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a draft decision',
    description: `
Delete a DRAFT decision.

**Append-Only Enforcement:**
- Only DRAFT decisions can be deleted
- LOCKED and SUPERSEDED decisions are permanent
    `,
  })
  @ApiParam({
    name: 'decisionId',
    description: 'Decision UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Decision deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete non-DRAFT decision',
  })
  async deleteDecision(
    @Param('decisionId') decisionId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.decisionService.deleteDecision(decisionId, req.user.userId);
  }
}
