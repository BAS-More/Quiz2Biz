import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for generating prompts for a session
 */
export class GeneratePromptsDto {
  @ApiProperty({
    description: 'Session ID to generate prompts for',
    example: 'session-123-abc',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Specific dimensions to generate prompts for',
    example: ['arch_sec', 'devops_iac'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dimensions?: string[];

  @ApiPropertyOptional({
    description: 'Minimum residual risk threshold (0.0 - 1.0)',
    example: 0.05,
  })
  @IsOptional()
  minResidualRisk?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of prompts to generate',
    example: 10,
  })
  @IsOptional()
  maxPrompts?: number;
}

/**
 * DTO for a single gap to generate prompt for
 */
export class GenerateSinglePromptDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'session-123-abc',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Question ID to generate prompt for',
    example: 'question-456-def',
  })
  @IsString()
  @IsNotEmpty()
  questionId: string;
}
