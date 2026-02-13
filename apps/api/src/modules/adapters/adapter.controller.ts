import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GitHubAdapter } from './github.adapter';
import { GitLabAdapter } from './gitlab.adapter';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { AdapterConfigService, AdapterType, AdapterConfig } from './adapter-config.service';

// DTOs
class CreateAdapterConfigDto {
  type: AdapterType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

class UpdateAdapterConfigDto {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

class SyncAdapterDto {
  sessionId: string;
  options?: Record<string, unknown>;
}

class TestAdapterConnectionDto {
  type: AdapterType;
  config: Record<string, unknown>;
}

@ApiTags('Adapters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/adapters')
export class AdapterController {
  constructor(
    private readonly githubAdapter: GitHubAdapter,
    private readonly gitlabAdapter: GitLabAdapter,
    private readonly jiraConfluenceAdapter: JiraConfluenceAdapter,
    private readonly adapterConfigService: AdapterConfigService,
  ) {}

  // ==================== ADAPTER TYPES ====================

  @Get('types')
  @ApiOperation({ summary: 'Get all supported adapter types' })
  @ApiResponse({ status: 200, description: 'List of supported adapter types' })
  getSupportedTypes() {
    return {
      types: this.adapterConfigService.getSupportedAdapterTypes(),
    };
  }

  @Get('types/:type')
  @ApiOperation({ summary: 'Get adapter type information' })
  @ApiParam({ name: 'type', enum: ['github', 'gitlab', 'jira', 'confluence', 'azure_devops'] })
  @ApiResponse({ status: 200, description: 'Adapter type information' })
  getTypeInfo(@Param('type') type: AdapterType) {
    return this.adapterConfigService.getAdapterTypeInfo(type);
  }

  // ==================== ADAPTER CONFIGURATIONS ====================

  @Get('configs')
  @ApiOperation({ summary: 'List all adapter configurations' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['github', 'gitlab', 'jira', 'confluence', 'azure_devops'],
  })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of adapter configurations' })
  async listConfigs(
    @Query('tenantId') tenantId: string,
    @Query('type') type?: AdapterType,
    @Query('enabled') enabled?: boolean,
  ) {
    let configs = await this.adapterConfigService.getAdapterConfigs(tenantId);

    if (type) {
      configs = configs.filter((c) => c.type === type);
    }

    if (enabled !== undefined) {
      configs = configs.filter((c) => c.enabled === enabled);
    }

    // Redact sensitive fields
    return {
      configs: configs.map((c) => this.redactSensitiveFields(c)),
    };
  }

  @Get('configs/:adapterId')
  @ApiOperation({ summary: 'Get adapter configuration by ID' })
  @ApiParam({ name: 'adapterId' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Adapter configuration' })
  @ApiResponse({ status: 404, description: 'Adapter not found' })
  async getConfig(@Param('adapterId') adapterId: string, @Query('tenantId') tenantId: string) {
    const config = await this.adapterConfigService.getAdapterConfig(tenantId, adapterId);
    if (!config) {
      throw new NotFoundException(`Adapter ${adapterId} not found`);
    }
    return this.redactSensitiveFields(config);
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create a new adapter configuration' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 201, description: 'Adapter configuration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async createConfig(@Query('tenantId') tenantId: string, @Body() dto: CreateAdapterConfigDto) {
    // Validate configuration
    const validation = this.adapterConfigService.validateConfig(dto.type, dto.config);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    const config = await this.adapterConfigService.upsertAdapterConfig(tenantId, dto);
    return this.redactSensitiveFields(config);
  }

  @Put('configs/:adapterId')
  @ApiOperation({ summary: 'Update an adapter configuration' })
  @ApiParam({ name: 'adapterId' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Adapter configuration updated' })
  @ApiResponse({ status: 404, description: 'Adapter not found' })
  async updateConfig(
    @Param('adapterId') adapterId: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateAdapterConfigDto,
  ) {
    const existing = await this.adapterConfigService.getAdapterConfig(tenantId, adapterId);
    if (!existing) {
      throw new NotFoundException(`Adapter ${adapterId} not found`);
    }

    if (dto.config) {
      const validation = this.adapterConfigService.validateConfig(existing.type, {
        ...existing.config,
        ...dto.config,
      });
      if (!validation.valid) {
        throw new BadRequestException(validation.errors.join(', '));
      }
    }

    const config = await this.adapterConfigService.upsertAdapterConfig(tenantId, {
      ...existing,
      ...dto,
      id: adapterId,
      config: dto.config ? { ...existing.config, ...dto.config } : existing.config,
    });

    return this.redactSensitiveFields(config);
  }

  @Delete('configs/:adapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an adapter configuration' })
  @ApiParam({ name: 'adapterId' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 204, description: 'Adapter configuration deleted' })
  async deleteConfig(@Param('adapterId') adapterId: string, @Query('tenantId') tenantId: string) {
    await this.adapterConfigService.deleteAdapterConfig(tenantId, adapterId);
  }

  // ==================== CONNECTION TESTING ====================

  @Post('test-connection')
  @ApiOperation({ summary: 'Test adapter connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(@Body() dto: TestAdapterConnectionDto) {
    try {
      switch (dto.type) {
        case 'github': {
          const config = dto.config as any;
          // Try to fetch a single PR to test connection
          await this.githubAdapter.fetchPullRequests(
            { token: config.token, owner: config.owner, repo: config.repo },
            { perPage: 1 },
          );
          return { success: true, message: 'GitHub connection successful' };
        }

        case 'gitlab': {
          const config = dto.config as any;
          await this.gitlabAdapter.fetchPipelines(
            { token: config.token, projectId: config.projectId, apiUrl: config.apiUrl },
            { perPage: 1 },
          );
          return { success: true, message: 'GitLab connection successful' };
        }

        case 'jira': {
          const config = dto.config as any;
          await this.jiraConfluenceAdapter.fetchProject(
            { domain: config.domain, email: config.email, apiToken: config.apiToken },
            config.projectKey,
          );
          return { success: true, message: 'Jira connection successful' };
        }

        case 'confluence': {
          const config = dto.config as any;
          await this.jiraConfluenceAdapter.searchPages(
            {
              domain: config.domain,
              email: config.email,
              apiToken: config.apiToken,
              spaceKey: config.spaceKey,
            },
            { limit: 1 },
          );
          return { success: true, message: 'Confluence connection successful' };
        }

        default:
          throw new BadRequestException(`Unsupported adapter type: ${dto.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  // ==================== SYNC OPERATIONS ====================

  @Post('configs/:adapterId/sync')
  @ApiOperation({ summary: 'Trigger evidence sync for an adapter' })
  @ApiParam({ name: 'adapterId' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Sync results' })
  async syncAdapter(
    @Param('adapterId') adapterId: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: SyncAdapterDto,
  ) {
    const config = await this.adapterConfigService.getAdapterConfig(tenantId, adapterId);
    if (!config) {
      throw new NotFoundException(`Adapter ${adapterId} not found`);
    }

    if (!config.enabled) {
      throw new BadRequestException('Adapter is disabled');
    }

    // Update sync status
    await this.adapterConfigService.updateSyncStatus(tenantId, adapterId, 'syncing');

    try {
      let result: { ingested: number; errors: string[]; results: Record<string, number> };

      switch (config.type) {
        case 'github': {
          const githubConfig = config.config as any;
          result = await this.githubAdapter.ingestAllEvidence(
            {
              token: githubConfig.token,
              owner: githubConfig.owner,
              repo: githubConfig.repo,
              apiUrl: githubConfig.apiUrl,
            },
            dto.sessionId,
          );
          break;
        }

        case 'gitlab': {
          const gitlabConfig = config.config as any;
          result = await this.gitlabAdapter.ingestAllEvidence(
            {
              token: gitlabConfig.token,
              projectId: gitlabConfig.projectId,
              apiUrl: gitlabConfig.apiUrl,
            },
            dto.sessionId,
          );
          break;
        }

        case 'jira':
        case 'confluence': {
          const atlassianConfig = config.config as any;
          const confluenceConfig =
            config.type === 'confluence' || atlassianConfig.spaceKey
              ? {
                  domain: atlassianConfig.domain,
                  email: atlassianConfig.email,
                  apiToken: atlassianConfig.apiToken,
                  spaceKey: atlassianConfig.spaceKey,
                }
              : null;

          result = await this.jiraConfluenceAdapter.ingestAllEvidence(
            {
              domain: atlassianConfig.domain,
              email: atlassianConfig.email,
              apiToken: atlassianConfig.apiToken,
            },
            confluenceConfig,
            dto.sessionId,
            atlassianConfig.projectKey,
          );
          break;
        }

        default:
          throw new BadRequestException(`Sync not implemented for ${config.type}`);
      }

      // Update sync status to success
      await this.adapterConfigService.updateSyncStatus(tenantId, adapterId, 'success');

      return {
        adapterId,
        adapterType: config.type,
        sessionId: dto.sessionId,
        ...result,
      };
    } catch (error) {
      // Update sync status to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.adapterConfigService.updateSyncStatus(tenantId, adapterId, 'error', errorMessage);
      throw error;
    }
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all enabled adapters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Sync results for all adapters' })
  async syncAllAdapters(@Query('tenantId') tenantId: string, @Body() dto: SyncAdapterDto) {
    const enabledAdapters = await this.adapterConfigService.getEnabledAdapters(tenantId);
    const results: Array<{
      adapterId: string;
      adapterType: AdapterType;
      success: boolean;
      ingested?: number;
      error?: string;
    }> = [];

    for (const adapter of enabledAdapters) {
      try {
        const result = await this.syncAdapter(adapter.id, tenantId, dto);
        results.push({
          adapterId: adapter.id,
          adapterType: adapter.type,
          success: true,
          ingested: result.ingested,
        });
      } catch (error) {
        results.push({
          adapterId: adapter.id,
          adapterType: adapter.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalIngested = results.reduce((sum, r) => sum + (r.ingested || 0), 0);
    const successCount = results.filter((r) => r.success).length;

    return {
      sessionId: dto.sessionId,
      totalAdapters: enabledAdapters.length,
      successfulSyncs: successCount,
      failedSyncs: enabledAdapters.length - successCount,
      totalIngested,
      results,
    };
  }

  // ==================== WEBHOOKS ====================

  @Post('webhooks/github')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub webhook endpoint' })
  async handleGitHubWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('adapterId') adapterId: string,
    @Query('tenantId') tenantId: string,
  ) {
    // In production, verify webhook signature
    // const signature = headers['x-hub-signature-256'];
    // this.githubAdapter.verifyWebhookSignature(...)

    const config = await this.adapterConfigService.getAdapterConfig(tenantId, adapterId);
    if (!config || !config.enabled) {
      return { status: 'ignored', reason: 'Adapter not found or disabled' };
    }

    // Process webhook event based on event type
    // This would typically trigger an async job
    return {
      status: 'received',
      adapterId,
      event: payload.action || 'unknown',
    };
  }

  @Post('webhooks/gitlab')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitLab webhook endpoint' })
  async handleGitLabWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('adapterId') adapterId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const config = await this.adapterConfigService.getAdapterConfig(tenantId, adapterId);
    if (!config || !config.enabled) {
      return { status: 'ignored', reason: 'Adapter not found or disabled' };
    }

    return {
      status: 'received',
      adapterId,
      event: payload.object_kind || 'unknown',
    };
  }

  // ==================== HELPERS ====================

  private redactSensitiveFields(config: AdapterConfig): AdapterConfig {
    const redacted = { ...config, config: { ...config.config } };
    const sensitiveFields = [
      'token',
      'apiToken',
      'personalAccessToken',
      'webhookSecret',
      'webhookToken',
    ];

    for (const field of sensitiveFields) {
      if (redacted.config[field]) {
        redacted.config[field] = '***REDACTED***';
      }
    }

    return redacted;
  }
}
