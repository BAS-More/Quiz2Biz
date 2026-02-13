import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, DocumentCategory } from '@prisma/client';

// Extract enum values for Swagger schema generation
const DocumentCategoryValues = Object.values(DocumentCategory);
const DocumentStatusValues = Object.values(DocumentStatus);

export class DocumentTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: DocumentCategoryValues, enumName: 'DocumentCategory' })
  category: DocumentCategory;

  @ApiPropertyOptional()
  estimatedPages?: number;

  @ApiProperty()
  isActive: boolean;
}

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  documentTypeId: string;

  @ApiProperty({ enum: DocumentStatusValues, enumName: 'DocumentStatus' })
  status: DocumentStatus;

  @ApiProperty()
  format: string;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional()
  fileSize?: string;

  @ApiProperty()
  version: number;

  @ApiPropertyOptional()
  generatedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: DocumentTypeResponseDto })
  documentType?: DocumentTypeResponseDto;
}

export class DownloadUrlResponseDto {
  @ApiProperty({
    description: 'Secure download URL with SAS token',
    example: 'https://storage.blob.core.windows.net/documents/...',
  })
  url: string;

  @ApiProperty({
    description: 'URL expiration time',
  })
  expiresAt: Date;
}
