import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { DecisionStatus } from '@prisma/client';

// Extract enum values for Swagger schema generation
const DecisionStatusValues = Object.values(DecisionStatus);

/**
 * DTO for creating a new decision
 */
export class CreateDecisionDto {
  @ApiProperty({ description: 'Session ID the decision belongs to' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'The decision statement' })
  @IsString()
  @MaxLength(5000)
  statement: string;

  @ApiPropertyOptional({ description: 'Underlying assumptions for the decision' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  assumptions?: string;

  @ApiPropertyOptional({ description: 'Supporting references or evidence' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  references?: string;
}

/**
 * DTO for updating decision status
 * Note: Only status can be changed (DRAFT -> LOCKED)
 */
export class UpdateDecisionStatusDto {
  @ApiProperty({ description: 'Decision ID to update' })
  @IsUUID()
  decisionId: string;

  @ApiProperty({
    enum: ['LOCKED'],
    description: 'New status (only LOCKED allowed from DRAFT)',
  })
  @IsEnum(DecisionStatus)
  status: DecisionStatus;
}

/**
 * DTO for superseding a locked decision
 */
export class SupersedeDecisionDto {
  @ApiProperty({ description: 'ID of the decision to supersede' })
  @IsUUID()
  supersedesDecisionId: string;

  @ApiProperty({ description: 'The new decision statement' })
  @IsString()
  @MaxLength(5000)
  statement: string;

  @ApiPropertyOptional({ description: 'Underlying assumptions for the decision' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  assumptions?: string;

  @ApiPropertyOptional({ description: 'Supporting references or evidence' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  references?: string;
}

/**
 * Filter options for listing decisions
 */
export class ListDecisionsDto {
  @ApiPropertyOptional({ description: 'Filter by session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    enum: DecisionStatusValues,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(DecisionStatus)
  status?: DecisionStatus;
}

/**
 * Response DTO for decision item
 */
export class DecisionResponse {
  @ApiProperty({ description: 'Decision ID' })
  id: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Decision statement' })
  statement: string;

  @ApiPropertyOptional({ description: 'Assumptions' })
  assumptions: string | null;

  @ApiPropertyOptional({ description: 'References' })
  references: string | null;

  @ApiProperty({ description: 'Owner user ID' })
  ownerId: string;

  @ApiProperty({ enum: DecisionStatusValues, enumName: 'DecisionStatus' })
  status: DecisionStatus;

  @ApiPropertyOptional({ description: 'ID of decision this supersedes' })
  supersedesDecisionId: string | null;

  @ApiProperty({ description: 'When decision was created' })
  createdAt: Date;
}

/**
 * Audit export format
 */
export class DecisionAuditExport {
  @ApiProperty({ description: 'Export timestamp' })
  exportedAt: Date;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Total decision count' })
  totalDecisions: number;

  @ApiProperty({ type: [DecisionResponse] })
  decisions: DecisionResponse[];

  @ApiProperty({ description: 'Supersession chain mapping' })
  supersessionChain: Record<string, string[]>;
}
