/**
 * Policy Pack Controller
 * API endpoints for policy pack generation
 */
import { Controller, Get, Post, Param, Res, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyPackService } from './policy-pack.service';
import { ContextBuilderService } from '../qpg/services/context-builder.service';
import archiver from 'archiver';

@ApiTags('Policy Pack Generator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/policy-pack')
export class PolicyPackController {
  private readonly logger = new Logger(PolicyPackController.name);

  constructor(
    private readonly policyPackService: PolicyPackService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Generate policy pack for a session
   */
  @Post('generate/:sessionId')
  @ApiOperation({
    summary: 'Generate policy pack from session gaps',
    description: 'Creates Policy → Standard → Procedure documents with OPA/Terraform rules',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Questionnaire session ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Policy pack generated successfully',
  })
  async generatePolicyPack(@Param('sessionId') sessionId: string) {
    this.logger.log(`Generating policy pack for session: ${sessionId}`);

    // Get gaps from session
    const gaps = await this.contextBuilder.buildGapContexts(sessionId);

    // Generate policy pack
    const bundle = await this.policyPackService.generatePolicyPack(sessionId, gaps);

    return {
      id: bundle.id,
      name: bundle.name,
      version: bundle.version,
      generatedAt: bundle.generatedAt,
      policiesCount: bundle.policies.length,
      opaPoliciesCount: bundle.opaPolicies.length,
      hasTerraformRules: !!bundle.terraformRules,
      dimensions: [...new Set(bundle.policies.map((p) => p.dimensionKey))],
      scoreAtGeneration: bundle.scoreAtGeneration,
    };
  }

  /**
   * Download policy pack as ZIP
   */
  @Get('download/:sessionId')
  @ApiOperation({
    summary: 'Download policy pack as ZIP',
    description:
      'Downloads complete policy pack with policies, OPA rules, and Terraform compliance',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Questionnaire session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP file download',
  })
  async downloadPolicyPack(@Param('sessionId') sessionId: string, @Res() res: Response) {
    this.logger.log(`Downloading policy pack for session: ${sessionId}`);

    // Get gaps and generate bundle
    const gaps = await this.contextBuilder.buildGapContexts(sessionId);
    const bundle = await this.policyPackService.generatePolicyPack(sessionId, gaps);

    // Get export structure
    const files = this.policyPackService.getExportStructure(bundle);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="policy-pack-${sessionId}.zip"`,
    });

    archive.pipe(res);

    // Add files to archive
    for (const file of files) {
      archive.append(file.content, { name: file.path });
    }

    await archive.finalize();
  }

  /**
   * Get available control mappings
   */
  @Get('controls/:dimensionKey')
  @ApiOperation({
    summary: 'Get control mappings for a dimension',
    description: 'Returns ISO 27001, NIST CSF, and OWASP ASVS mappings',
  })
  @ApiParam({
    name: 'dimensionKey',
    description: 'Dimension key (e.g., arch_sec, devops_iac)',
  })
  async getControlMappings(@Param('dimensionKey') dimensionKey: string) {
    const mappings = this.policyPackService.getControlMappings(dimensionKey);
    return {
      dimensionKey,
      mappingsCount: mappings.length,
      mappings,
    };
  }

  /**
   * Get all OPA policies
   */
  @Get('opa-policies')
  @ApiOperation({
    summary: 'Get all available OPA policies',
    description: 'Returns OPA/Rego policies for infrastructure validation',
  })
  async getOpaPolicies() {
    const policies = this.policyPackService.getAllOpaPolicies();
    return {
      count: policies.length,
      policies: policies.map((p) => ({
        name: p.name,
        description: p.description,
        severity: p.severity,
        resourceTypes: p.resourceTypes,
      })),
    };
  }

  /**
   * Get all Terraform compliance rules
   */
  @Get('terraform-rules')
  @ApiOperation({
    summary: 'Get all Terraform compliance rules',
    description: 'Returns terraform-compliance feature rules',
  })
  async getTerraformRules() {
    const rules = this.policyPackService.getAllTerraformRules();
    return {
      count: rules.length,
      rules: rules.map((r) => ({
        name: r.name,
        description: r.description,
        dimensionKey: r.dimensionKey,
        resourceTypes: r.resourceTypes,
      })),
    };
  }
}
