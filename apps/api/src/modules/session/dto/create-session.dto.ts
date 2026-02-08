import { IsUUID, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Persona } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({ example: 'quest_001', description: 'ID of the questionnaire to start' })
  @IsUUID()
  questionnaireId: string;

  @ApiPropertyOptional({
    enum: Persona,
    example: 'CTO',
    description: 'Persona filter: CTO, CFO, CEO, BA, or POLICY. Determines which questions are presented.',
  })
  @IsOptional()
  @IsEnum(Persona)
  persona?: Persona;

  @ApiPropertyOptional({ example: 'saas', description: 'Industry context for adaptive logic' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;
}
