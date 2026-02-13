import { Module } from '@nestjs/common';
import { PrismaModule } from '@libs/database';
import { AdminQuestionnaireController } from './controllers/admin-questionnaire.controller';
import { AdminQuestionnaireService } from './services/admin-questionnaire.service';
import { AdminAuditService } from './services/admin-audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminQuestionnaireController],
  providers: [AdminQuestionnaireService, AdminAuditService],
  exports: [AdminQuestionnaireService, AdminAuditService],
})
export class AdminModule {}
