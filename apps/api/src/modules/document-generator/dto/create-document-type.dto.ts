import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';

// Extract enum values for Swagger schema generation
const DocumentCategoryValues = Object.values(DocumentCategory);

export class CreateDocumentTypeDto {
  @ApiProperty({ example: 'Business Plan', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'business-plan', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: 'Comprehensive business planning document' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentCategoryValues, enumName: 'DocumentCategory', example: 'CFO' })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ example: 'templates/cfo/business-plan.hbs' })
  @IsOptional()
  @IsString()
  templatePath?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['question-id-1', 'question-id-2'],
    description: 'IDs of questions required to generate this document',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredQuestions?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['DOCX'],
    default: ['DOCX'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outputFormats?: string[];

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedPages?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
