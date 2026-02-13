import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../../auth/auth.service';
import { DocumentGeneratorService } from '../services/document-generator.service';
import {
  RequestGenerationDto,
  DocumentResponseDto,
  DocumentTypeResponseDto,
  DownloadUrlResponseDto,
} from '../dto';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentController {
  constructor(private readonly documentGeneratorService: DocumentGeneratorService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Request document generation for a session' })
  @ApiResponse({
    status: 201,
    description: 'Document generation started',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Session not completed or missing required questions' })
  @ApiResponse({ status: 404, description: 'Session or document type not found' })
  async generateDocument(
    @Body() dto: RequestGenerationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentGeneratorService.generateDocument({
      sessionId: dto.sessionId,
      documentTypeId: dto.documentTypeId,
      userId: user.id,
    });

    return this.mapToResponse(document);
  }

  @Get('types')
  @ApiOperation({ summary: 'List available document types' })
  @ApiResponse({
    status: 200,
    description: 'List of document types',
    type: [DocumentTypeResponseDto],
  })
  async listDocumentTypes(): Promise<DocumentTypeResponseDto[]> {
    return this.documentGeneratorService.listDocumentTypes();
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'List all documents for a session' })
  @ApiResponse({ status: 200, description: 'List of documents', type: [DocumentResponseDto] })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionDocuments(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentGeneratorService.getSessionDocuments(sessionId, user.id);

    return documents.map((doc) => this.mapToResponse(doc));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({ status: 200, description: 'Document details', type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentGeneratorService.getDocument(id, user.id);
    return this.mapToResponse(document);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get secure download URL for document' })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description: 'URL expiration in minutes (default: 60)',
  })
  @ApiResponse({ status: 200, description: 'Download URL', type: DownloadUrlResponseDto })
  @ApiResponse({ status: 400, description: 'Document not available for download' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expiresIn') expiresIn: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DownloadUrlResponseDto> {
    const expiresInMinutes = expiresIn ? parseInt(expiresIn, 10) : 60;
    const url = await this.documentGeneratorService.getDownloadUrl(id, user.id, expiresInMinutes);

    return {
      url,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60000),
    };
  }

  private mapToResponse(document: {
    id: string;
    sessionId: string;
    documentTypeId: string;
    status: string;
    format: string;
    fileName: string | null;
    fileSize: bigint | null;
    version: number;
    generatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    documentType?: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      category: string;
      estimatedPages: number | null;
      isActive: boolean;
    };
  }): DocumentResponseDto {
    return {
      id: document.id,
      sessionId: document.sessionId,
      documentTypeId: document.documentTypeId,
      status: document.status as DocumentResponseDto['status'],
      format: document.format,
      fileName: document.fileName ?? undefined,
      fileSize: document.fileSize?.toString() ?? undefined,
      version: document.version,
      generatedAt: document.generatedAt ?? undefined,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      documentType: document.documentType
        ? {
            id: document.documentType.id,
            name: document.documentType.name,
            slug: document.documentType.slug,
            description: document.documentType.description ?? undefined,
            category: document.documentType.category as DocumentTypeResponseDto['category'],
            estimatedPages: document.documentType.estimatedPages ?? undefined,
            isActive: document.documentType.isActive,
          }
        : undefined,
    };
  }
}
