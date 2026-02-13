/**
 * Policy Pack Module
 *
 * Generates compliance-ready policy documents from readiness gaps.
 * Creates Policy → Standard → Procedure hierarchy aligned with
 * ISO 27001, NIST CSF, and OWASP ASVS frameworks.
 */
import { Module, forwardRef } from '@nestjs/common';
import { PolicyPackController } from './policy-pack.controller';
import { PolicyPackService } from './policy-pack.service';
import { PolicyGeneratorService } from './services/policy-generator.service';
import { ControlMappingService } from './services/control-mapping.service';
import { OpaPolicyService } from './services/opa-policy.service';
import { TerraformRulesService } from './services/terraform-rules.service';
import { PolicyExportService } from './services/policy-export.service';
import { PrismaModule } from '@libs/database';
import { QpgModule } from '../qpg/qpg.module';

@Module({
  imports: [PrismaModule, forwardRef(() => QpgModule)],
  controllers: [PolicyPackController],
  providers: [
    PolicyPackService,
    PolicyGeneratorService,
    ControlMappingService,
    OpaPolicyService,
    TerraformRulesService,
    PolicyExportService,
  ],
  exports: [PolicyPackService],
})
export class PolicyPackModule {}
