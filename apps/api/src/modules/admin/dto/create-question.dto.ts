import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

// Extract enum values for Swagger schema generation
const QuestionTypeValues = Object.values(QuestionType);

export class QuestionOptionDto {
  @ApiProperty({ example: 'option_1' })
  @IsString()
  value: string;

  @ApiProperty({ example: 'Option 1' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ example: 'Additional description for option' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is your company name?' })
  @IsString()
  @MaxLength(1000)
  text: string;

  @ApiProperty({ enum: QuestionTypeValues, enumName: 'QuestionType', example: 'TEXT' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({ example: 'Enter the legal name of your company' })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional({ example: 'This will be used in official documents' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ example: 'e.g., Acme Corporation' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description: 'Options for choice-based questions',
  })
  @IsOptional()
  @IsArray()
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({
    example: { minLength: 2, maxLength: 200 },
    description: 'Validation rules',
  })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Default value for the question' })
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ description: 'AI-generated suggested answer' })
  @IsOptional()
  suggestedAnswer?: unknown;

  @ApiPropertyOptional({ example: ['technology', 'saas'], description: 'Industry tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryTags?: string[];

  @ApiPropertyOptional({ description: 'Mappings to document fields' })
  @IsOptional()
  @IsObject()
  documentMappings?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0, description: 'Order position' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
