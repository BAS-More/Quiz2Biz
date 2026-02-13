import { Module } from '@nestjs/common';
import { EvidenceRegistryService } from './evidence-registry.service';
import { EvidenceRegistryController } from './evidence-registry.controller';
import { EvidenceIntegrityService } from './evidence-integrity.service';
import { CIArtifactIngestionService } from './ci-artifact-ingestion.service';
import { PrismaModule } from '@libs/database';

/**
 * Evidence Registry Module
 *
 * Implements Quiz2Biz evidence management:
 * - File uploads with SHA-256 hashing
 * - Azure Blob Storage integration
 * - Verification workflow with coverage updates
 * - Evidence linking to questions and sessions
 * - Hash chain evidence integrity (Sprint 14)
 * - RFC 3161 timestamp authority integration
 * - CI artifact automatic ingestion
 */
@Module({
  imports: [PrismaModule],
  controllers: [EvidenceRegistryController],
  providers: [EvidenceRegistryService, EvidenceIntegrityService, CIArtifactIngestionService],
  exports: [EvidenceRegistryService, EvidenceIntegrityService, CIArtifactIngestionService],
})
export class EvidenceRegistryModule {}
