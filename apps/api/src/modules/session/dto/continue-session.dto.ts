import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ContinueSessionDto {
  @ApiPropertyOptional({ description: 'Number of questions to fetch (1-5)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  questionCount?: number;
}
