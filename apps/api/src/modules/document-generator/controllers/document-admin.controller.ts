import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../../auth/auth.service';
import { PaginationDto } from '@libs/shared';
import { DocumentGeneratorService } from '../services/document-generator.service';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  RejectDocumentDto,
  DocumentResponseDto,
  DocumentTypeResponseDto,
} from '../dto';

@ApiTags('admin/documents')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentGeneratorService: DocumentGeneratorService,
  ) {}

  // ==========================================================================
  // DOCUMENT TYPE MANAGEMENT
  // ==========================================================================

  @Get('document-types')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all document types' })
  @ApiResponse({ status: 200, description: 'List of document types' })
  async listDocumentTypes(@Query() pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.documentType.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.documentType.count(),
    ]);

    return {
      items,
      pagination: {
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (pagination.limit ?? 20)),
      },
    };
  }

  @Get('document-types/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get document type details' })
  @ApiResponse({ status: 200, description: 'Document type details' })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async getDocumentType(@Param('id', ParseUUIDPipe) id: string): Promise<DocumentTypeResponseDto> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
      include: {
        standardMappings: {
          include: { standard: true },
        },
        _count: { select: { documents: true } },
      },
    });

    if (!documentType) {
      throw new Error(`Document type with ID ${id} not found`);
    }

    return documentType;
  }

  @Post('document-types')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create document type' })
  @ApiResponse({ status: 201, description: 'Document type created' })
  async createDocumentType(@Body() dto: CreateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    return this.prisma.documentType.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        category: dto.category,
        templatePath: dto.templatePath,
        requiredQuestions: dto.requiredQuestions ?? [],
        outputFormats: dto.outputFormats ?? ['DOCX'],
        estimatedPages: dto.estimatedPages,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch('document-types/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update document type' })
  @ApiResponse({ status: 200, description: 'Document type updated' })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async updateDocumentType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTypeDto,
  ): Promise<DocumentTypeResponseDto> {
    return this.prisma.documentType.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        category: dto.category,
        templatePath: dto.templatePath,
        requiredQuestions: dto.requiredQuestions,
        outputFormats: dto.outputFormats,
        estimatedPages: dto.estimatedPages,
        isActive: dto.isActive,
      },
    });
  }

  // ==========================================================================
  // DOCUMENT REVIEW MANAGEMENT
  // ==========================================================================

  @Get('documents/pending-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List documents pending review' })
  @ApiResponse({ status: 200, description: 'List of documents pending review' })
  async getPendingReviewDocuments(): Promise<DocumentResponseDto[]> {
    const documents = await this.documentGeneratorService.getPendingReviewDocuments();
    return documents.map((doc) => ({
      id: doc.id,
      sessionId: doc.sessionId,
      documentTypeId: doc.documentTypeId,
      status: doc.status,
      format: doc.format,
      fileName: doc.fileName ?? undefined,
      fileSize: doc.fileSize?.toString() ?? undefined,
      version: doc.version,
      generatedAt: doc.generatedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      documentType: {
        id: doc.documentType.id,
        name: doc.documentType.name,
        slug: doc.documentType.slug,
        description: doc.documentType.description ?? undefined,
        category: doc.documentType.category,
        estimatedPages: doc.documentType.estimatedPages ?? undefined,
        isActive: doc.documentType.isActive,
      },
    }));
  }

  @Patch('documents/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve a document' })
  @ApiResponse({ status: 200, description: 'Document approved' })
  @ApiResponse({ status: 400, description: 'Document not in pending review status' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async approveDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documentGeneratorService.approveDocument(id, user.id);
    return {
      message: 'Document approved successfully',
      document: {
        id: document.id,
        status: document.status,
        approvedAt: document.approvedAt,
      },
    };
  }

  @Patch('documents/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject a document' })
  @ApiResponse({ status: 200, description: 'Document rejected' })
  @ApiResponse({ status: 400, description: 'Document not in pending review status' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async rejectDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.documentGeneratorService.rejectDocument(id, user.id, dto.reason);
    return {
      message: 'Document rejected',
      document: {
        id: document.id,
        status: document.status,
        rejectionReason: document.rejectionReason,
      },
    };
  }
}
