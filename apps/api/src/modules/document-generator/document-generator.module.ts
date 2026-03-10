import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@libs/database';
import { DocumentController } from './controllers/document.controller';
import { DocumentAdminController } from './controllers/document-admin.controller';
import { DeliverablesCompilerController } from './controllers/deliverables-compiler.controller';
import { DocumentGeneratorService } from './services/document-generator.service';
import { DocumentBuilderService } from './services/document-builder.service';
import { TemplateEngineService } from './services/template-engine.service';
import { StorageService } from './services/storage.service';
import { DeliverablesCompilerService } from './services/deliverables-compiler.service';
import { AiDocumentContentService } from './services/ai-document-content.service';
import { QualityCalibratorService } from './services/quality-calibrator.service';
import { MarkdownRendererService } from './services/markdown-renderer.service';
import { ProviderComparisonService } from './services/provider-comparison.service';
import { PdfRendererService } from './services/pdf-renderer.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DocumentController, DocumentAdminController, DeliverablesCompilerController],
  providers: [
    DocumentGeneratorService,
    DocumentBuilderService,
    TemplateEngineService,
    StorageService,
    DeliverablesCompilerService,
    AiDocumentContentService,
    QualityCalibratorService,
    MarkdownRendererService,
    ProviderComparisonService,
    PdfRendererService,
  ],
  exports: [
    DocumentGeneratorService,
    DeliverablesCompilerService,
    AiDocumentContentService,
    QualityCalibratorService,
    MarkdownRendererService,
    ProviderComparisonService,
    PdfRendererService,
  ],
})
export class DocumentGeneratorModule {}
