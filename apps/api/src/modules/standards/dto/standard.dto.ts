import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { StandardCategory } from '@prisma/client';

// Extract enum values for Swagger schema generation
const StandardCategoryValues = Object.values(StandardCategory);

export class StandardResponseDto {
  @ApiProperty({ description: 'Standard ID' })
  id: string;

  @ApiProperty({
    enum: StandardCategoryValues,
    enumName: 'StandardCategory',
    description: 'Standard category',
  })
  category: StandardCategory;

  @ApiProperty({ description: 'Standard title' })
  title: string;

  @ApiProperty({ description: 'Standard description' })
  description: string;

  @ApiProperty({ description: 'List of principles', type: 'array' })
  principles: {
    title: string;
    description: string;
    examples?: string[];
  }[];

  @ApiProperty({ description: 'Standard version' })
  version: string;

  @ApiProperty({ description: 'Whether the standard is active' })
  isActive: boolean;
}

export class StandardCategoryParamDto {
  @ApiProperty({
    enum: StandardCategoryValues,
    enumName: 'StandardCategory',
    description: 'Standard category',
  })
  @IsEnum(StandardCategory)
  category: StandardCategory;
}

export class DocumentStandardsParamDto {
  @ApiProperty({ description: 'Document type ID or slug' })
  @IsString()
  documentTypeId: string;
}

export class StandardsSectionResponseDto {
  @ApiProperty({ description: 'Generated Markdown content' })
  markdown: string;

  @ApiProperty({ description: 'Standards included in the section', type: 'array' })
  standards: {
    category: StandardCategory;
    title: string;
    principles: {
      title: string;
      description: string;
    }[];
  }[];
}

export class DocumentTypeMappingDto {
  @ApiProperty({ description: 'Document type ID' })
  id: string;

  @ApiProperty({ description: 'Document type name' })
  name: string;

  @ApiProperty({ description: 'Document type slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Custom section title for this document' })
  sectionTitle?: string;

  @ApiProperty({ description: 'Priority order in the document' })
  priority: number;
}

export class StandardWithMappingsDto extends StandardResponseDto {
  @ApiProperty({
    description: 'Document types this standard is mapped to',
    type: [DocumentTypeMappingDto],
  })
  documentTypes: DocumentTypeMappingDto[];
}
