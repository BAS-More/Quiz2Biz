import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateQuestionnaireDto } from './create-questionnaire.dto';

export class UpdateQuestionnaireDto extends PartialType(CreateQuestionnaireDto) {
  @ApiPropertyOptional({ description: 'Whether questionnaire is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
