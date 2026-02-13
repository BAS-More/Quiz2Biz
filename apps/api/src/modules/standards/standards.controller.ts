import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StandardCategory } from '@prisma/client';

// Extract enum values for Swagger schema generation
const StandardCategoryValues = Object.values(StandardCategory);
import { StandardsService } from './standards.service';
import {
  StandardResponseDto,
  StandardWithMappingsDto,
  StandardsSectionResponseDto,
} from './dto/standard.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all engineering standards' })
  @ApiResponse({
    status: 200,
    description: 'List of all active engineering standards',
    type: [StandardResponseDto],
  })
  async findAll(): Promise<StandardResponseDto[]> {
    return this.standardsService.findAll();
  }

  @Get(':category')
  @Public()
  @ApiOperation({ summary: 'Get standard by category' })
  @ApiParam({
    name: 'category',
    enum: StandardCategoryValues,
    description: 'Standard category',
  })
  @ApiResponse({
    status: 200,
    description: 'Engineering standard details',
    type: StandardWithMappingsDto,
  })
  @ApiResponse({ status: 404, description: 'Standard category not found' })
  async findByCategory(@Param('category') category: string): Promise<StandardWithMappingsDto> {
    return this.standardsService.findWithMappings(category as StandardCategory);
  }

  @Get('document/:documentTypeId')
  @Public()
  @ApiOperation({ summary: 'Get standards for a document type' })
  @ApiParam({
    name: 'documentTypeId',
    description: 'Document type ID or slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Standards mapped to the document type',
    type: [StandardResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async getStandardsForDocument(
    @Param('documentTypeId') documentTypeId: string,
  ): Promise<StandardResponseDto[]> {
    return this.standardsService.getStandardsForDocument(documentTypeId);
  }

  @Get('document/:documentTypeId/section')
  @Public()
  @ApiOperation({ summary: 'Generate standards section for document' })
  @ApiParam({
    name: 'documentTypeId',
    description: 'Document type ID or slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated Markdown section for document',
    type: StandardsSectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async generateStandardsSection(
    @Param('documentTypeId') documentTypeId: string,
  ): Promise<StandardsSectionResponseDto> {
    return this.standardsService.generateStandardsSection(documentTypeId);
  }
}
