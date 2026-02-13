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

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DocumentController, DocumentAdminController, DeliverablesCompilerController],
  providers: [
    DocumentGeneratorService,
    DocumentBuilderService,
    TemplateEngineService,
    StorageService,
    DeliverablesCompilerService,
  ],
  exports: [DocumentGeneratorService, DeliverablesCompilerService],
})
export class DocumentGeneratorModule {}
