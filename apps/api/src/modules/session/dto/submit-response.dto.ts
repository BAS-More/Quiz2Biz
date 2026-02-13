import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitResponseDto {
  @ApiProperty({ example: 'q_015', description: 'ID of the question being answered' })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    example: { selectedOptionId: 'opt_001' },
    description: 'Response value (structure depends on question type)',
  })
  @IsNotEmpty()
  value: unknown;

  @ApiPropertyOptional({ example: 30, description: 'Time spent on this question in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;
}
