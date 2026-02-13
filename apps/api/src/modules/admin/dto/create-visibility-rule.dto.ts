import {
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityAction } from '@prisma/client';

// Extract enum values for Swagger schema generation
const VisibilityActionValues = Object.values(VisibilityAction);

export class CreateVisibilityRuleDto {
  @ApiProperty({
    example: {
      type: 'AND',
      conditions: [{ questionId: '123', operator: 'equals', value: 'yes' }],
    },
    description: 'JSON condition structure',
  })
  @IsObject()
  condition: Record<string, unknown>;

  @ApiProperty({ enum: VisibilityActionValues, enumName: 'VisibilityAction', example: 'SHOW' })
  @IsEnum(VisibilityAction)
  action: VisibilityAction;

  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'UUIDs of questions affected by this rule',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  targetQuestionIds: string[];

  @ApiPropertyOptional({ example: 0, description: 'Rule evaluation priority' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
