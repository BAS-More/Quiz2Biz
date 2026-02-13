import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DecisionStatus, Prisma } from '@prisma/client';
import {
  CreateDecisionDto,
  UpdateDecisionStatusDto,
  SupersedeDecisionDto,
  ListDecisionsDto,
  DecisionResponse,
  DecisionAuditExport,
} from './dto';

/**
 * Decision Log Service
 *
 * Implements Quiz2Biz append-only forensic decision record:
 *
 * Key Principles:
 * 1. Decisions are APPEND-ONLY - once created, content cannot be modified
 * 2. Status workflow: DRAFT -> LOCKED -> (AMENDED via supersession)
 * 3. Locked decisions cannot be modified or deleted
 * 4. To change a locked decision, create a new one that supersedes it
 * 5. Full audit trail maintained for compliance
 *
 * Status Transitions:
 * - DRAFT: Initial state, can be modified until locked
 * - LOCKED: Finalized, cannot be changed, can be superseded
 * - SUPERSEDED: A newer decision replaces this one
 * - AMENDED: Content was amended via supersession
 */
@Injectable()
export class DecisionLogService {
  private readonly logger = new Logger(DecisionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new decision
   *
   * @param dto - Decision details
   * @param ownerId - ID of user creating the decision
   */
  async createDecision(dto: CreateDecisionDto, ownerId: string): Promise<DecisionResponse> {
    // Validate session exists
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${dto.sessionId}`);
    }

    // Create decision with DRAFT status
    const decision = await this.prisma.decisionLog.create({
      data: {
        sessionId: dto.sessionId,
        statement: dto.statement,
        assumptions: dto.assumptions,
        references: dto.references,
        ownerId,
        status: DecisionStatus.DRAFT,
      },
    });

    this.logger.log(`Decision created: ${decision.id} by ${ownerId}`);

    return this.mapToResponse(decision);
  }

  /**
   * Update decision status (DRAFT -> LOCKED only)
   *
   * APPEND-ONLY ENFORCEMENT:
   * - Only status can be changed
   * - Only DRAFT -> LOCKED transition is allowed
   * - Locked decisions cannot be further modified
   *
   * @param dto - Status update details
   * @param userId - ID of user performing the action
   */
  async updateDecisionStatus(
    dto: UpdateDecisionStatusDto,
    userId: string,
  ): Promise<DecisionResponse> {
    const decision = await this.prisma.decisionLog.findUnique({
      where: { id: dto.decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`Decision not found: ${dto.decisionId}`);
    }

    // APPEND-ONLY GUARD: Prevent modification of locked decisions
    if (decision.status !== DecisionStatus.DRAFT) {
      throw new ForbiddenException(
        `Cannot modify decision with status: ${decision.status}. ` +
          `Only DRAFT decisions can be locked. Use supersession to amend locked decisions.`,
      );
    }

    // Only allow DRAFT -> LOCKED transition
    if (dto.status !== DecisionStatus.LOCKED) {
      throw new BadRequestException(`Invalid status transition. Only DRAFT -> LOCKED is allowed.`);
    }

    const updatedDecision = await this.prisma.decisionLog.update({
      where: { id: dto.decisionId },
      data: { status: DecisionStatus.LOCKED },
    });

    this.logger.log(`Decision locked: ${dto.decisionId} by ${userId}`);

    // Create audit log entry
    await this.createAuditEntry(dto.decisionId, 'LOCKED', userId);

    return this.mapToResponse(updatedDecision);
  }

  /**
   * Supersede a locked decision with a new one
   *
   * This is the ONLY way to "amend" a locked decision.
   * Creates a new decision that references the old one.
   * Marks the old decision as SUPERSEDED.
   *
   * @param dto - Supersession details
   * @param ownerId - ID of user creating the supersession
   */
  async supersedeDecision(dto: SupersedeDecisionDto, ownerId: string): Promise<DecisionResponse> {
    const originalDecision = await this.prisma.decisionLog.findUnique({
      where: { id: dto.supersedesDecisionId },
    });

    if (!originalDecision) {
      throw new NotFoundException(`Original decision not found: ${dto.supersedesDecisionId}`);
    }

    // Can only supersede LOCKED decisions
    if (originalDecision.status !== DecisionStatus.LOCKED) {
      throw new BadRequestException(
        `Can only supersede LOCKED decisions. Current status: ${originalDecision.status}`,
      );
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Create new decision that supersedes the old one
      const newDecision = await tx.decisionLog.create({
        data: {
          sessionId: originalDecision.sessionId,
          statement: dto.statement,
          assumptions: dto.assumptions,
          references: dto.references,
          ownerId,
          status: DecisionStatus.LOCKED, // New decision is immediately locked
          supersedesDecisionId: dto.supersedesDecisionId,
        },
      });

      // Mark original decision as SUPERSEDED
      await tx.decisionLog.update({
        where: { id: dto.supersedesDecisionId },
        data: { status: DecisionStatus.SUPERSEDED },
      });

      return newDecision;
    });

    this.logger.log(
      `Decision ${dto.supersedesDecisionId} superseded by ${result.id} by ${ownerId}`,
    );

    // Create audit entries
    await this.createAuditEntry(dto.supersedesDecisionId, 'SUPERSEDED', ownerId, {
      supersededBy: result.id,
    });
    await this.createAuditEntry(result.id, 'CREATED_AS_SUPERSESSION', ownerId, {
      supersedes: dto.supersedesDecisionId,
    });

    return this.mapToResponse(result);
  }

  /**
   * Get a single decision by ID
   */
  async getDecision(decisionId: string): Promise<DecisionResponse> {
    const decision = await this.prisma.decisionLog.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`Decision not found: ${decisionId}`);
    }

    return this.mapToResponse(decision);
  }

  /**
   * List decisions with filters
   */
  async listDecisions(filters: ListDecisionsDto): Promise<DecisionResponse[]> {
    const where: Prisma.DecisionLogWhereInput = {};

    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const decisions = await this.prisma.decisionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return decisions.map((d) => this.mapToResponse(d));
  }

  /**
   * Export decisions for audit compliance
   *
   * Returns all decisions for a session with supersession chain.
   */
  async exportForAudit(sessionId: string): Promise<DecisionAuditExport> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const decisions = await this.prisma.decisionLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Build supersession chain
    const supersessionChain: Record<string, string[]> = {};

    decisions.forEach((d) => {
      if (d.supersedesDecisionId) {
        if (!supersessionChain[d.supersedesDecisionId]) {
          supersessionChain[d.supersedesDecisionId] = [];
        }
        supersessionChain[d.supersedesDecisionId].push(d.id);
      }
    });

    return {
      exportedAt: new Date(),
      sessionId,
      totalDecisions: decisions.length,
      decisions: decisions.map((d) => this.mapToResponse(d)),
      supersessionChain,
    };
  }

  /**
   * Get the supersession chain for a decision
   *
   * Returns the full history of a decision including all supersessions.
   */
  async getSupersessionChain(decisionId: string): Promise<DecisionResponse[]> {
    const chain: DecisionResponse[] = [];
    let currentId: string | null = decisionId;

    // Walk back through supersession chain
    while (currentId) {
      const decision: {
        id: string;
        sessionId: string;
        statement: string;
        assumptions: string | null;
        references: string | null;
        ownerId: string;
        status: DecisionStatus;
        supersedesDecisionId: string | null;
        createdAt: Date;
      } | null = await this.prisma.decisionLog.findUnique({
        where: { id: currentId },
      });

      if (!decision) {
        break;
      }

      chain.unshift(this.mapToResponse(decision));
      currentId = decision.supersedesDecisionId;
    }

    // Walk forward through supersessions
    const supersessions = await this.prisma.decisionLog.findMany({
      where: { supersedesDecisionId: decisionId },
      orderBy: { createdAt: 'asc' },
    });

    supersessions.forEach((d) => {
      chain.push(this.mapToResponse(d));
    });

    return chain;
  }

  /**
   * Delete a DRAFT decision
   *
   * APPEND-ONLY ENFORCEMENT:
   * - Only DRAFT decisions can be deleted
   * - Locked/Superseded decisions are permanent
   */
  async deleteDecision(decisionId: string, userId: string): Promise<void> {
    const decision = await this.prisma.decisionLog.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`Decision not found: ${decisionId}`);
    }

    // APPEND-ONLY GUARD: Only drafts can be deleted
    if (decision.status !== DecisionStatus.DRAFT) {
      throw new ForbiddenException(
        `Cannot delete decision with status: ${decision.status}. ` +
          `Only DRAFT decisions can be deleted.`,
      );
    }

    await this.prisma.decisionLog.delete({
      where: { id: decisionId },
    });

    this.logger.log(`Draft decision deleted: ${decisionId} by ${userId}`);
  }

  /**
   * Create audit log entry for decision changes
   */
  private async createAuditEntry(
    decisionId: string,
    action: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `DECISION_${action}`,
        resourceType: 'DecisionLog',
        resourceId: decisionId,
        changes: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
      },
    });
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(decision: {
    id: string;
    sessionId: string;
    statement: string;
    assumptions: string | null;
    references: string | null;
    ownerId: string;
    status: DecisionStatus;
    supersedesDecisionId: string | null;
    createdAt: Date;
  }): DecisionResponse {
    return {
      id: decision.id,
      sessionId: decision.sessionId,
      statement: decision.statement,
      assumptions: decision.assumptions,
      references: decision.references,
      ownerId: decision.ownerId,
      status: decision.status,
      supersedesDecisionId: decision.supersedesDecisionId,
      createdAt: decision.createdAt,
    };
  }
}
