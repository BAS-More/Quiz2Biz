import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import * as crypto from 'crypto';

export type AdapterType = 'github' | 'gitlab' | 'jira' | 'confluence' | 'azure_devops';

export interface AdapterConfig {
  id: string;
  type: AdapterType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastSyncAt?: Date;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubAdapterConfig {
  token: string;
  owner: string;
  repo: string;
  apiUrl?: string;
  webhookSecret?: string;
  syncOptions?: {
    pullRequests?: boolean;
    workflowRuns?: boolean;
    releases?: boolean;
    sbom?: boolean;
    securityAdvisories?: boolean;
  };
}

export interface GitLabAdapterConfig {
  token: string;
  projectId: string | number;
  apiUrl?: string;
  webhookToken?: string;
  syncOptions?: {
    pipelines?: boolean;
    mergeRequests?: boolean;
    releases?: boolean;
    vulnerabilities?: boolean;
    coverage?: boolean;
  };
}

export interface JiraAdapterConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
  boardId?: number;
  syncOptions?: {
    issues?: boolean;
    sprints?: boolean;
    comments?: boolean;
    attachments?: boolean;
  };
}

export interface ConfluenceAdapterConfig {
  domain: string;
  email: string;
  apiToken: string;
  spaceKey: string;
  parentPageId?: string;
  syncOptions?: {
    pages?: boolean;
    attachments?: boolean;
    bidirectional?: boolean;
  };
}

@Injectable()
export class AdapterConfigService {
  private readonly logger = new Logger(AdapterConfigService.name);
  private readonly configCache: Map<string, AdapterConfig[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all adapter configurations for a tenant
   */
  async getAdapterConfigs(tenantId: string): Promise<AdapterConfig[]> {
    const cached = this.configCache.get(tenantId);
    if (cached) {
      return cached;
    }

    // In production, this would load from database
    // For now, we'll load from environment as defaults
    const configs = await this.loadFromDatabase(tenantId);
    this.configCache.set(tenantId, configs);
    return configs;
  }

  /**
   * Get a specific adapter configuration
   */
  async getAdapterConfig(tenantId: string, adapterId: string): Promise<AdapterConfig | null> {
    const configs = await this.getAdapterConfigs(tenantId);
    return configs.find((c) => c.id === adapterId) || null;
  }

  /**
   * Get enabled adapters of a specific type
   */
  async getEnabledAdapters(tenantId: string, type?: AdapterType): Promise<AdapterConfig[]> {
    const configs = await this.getAdapterConfigs(tenantId);
    return configs.filter((c) => c.enabled && (!type || c.type === type));
  }

  /**
   * Create or update an adapter configuration
   */
  async upsertAdapterConfig(
    tenantId: string,
    data: Omit<AdapterConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<AdapterConfig> {
    const now = new Date();
    const id = data.id || this.generateId();

    const config: AdapterConfig = {
      id,
      type: data.type,
      name: data.name,
      enabled: data.enabled,
      config: this.encryptSensitiveFields(data.config),
      lastSyncAt: data.lastSyncAt,
      syncStatus: data.syncStatus || 'idle',
      lastError: data.lastError,
      createdAt: now,
      updatedAt: now,
    };

    // Save to database (using JSON field in tenant settings for now)
    await this.saveToDatabase(tenantId, config);

    // Invalidate cache
    this.configCache.delete(tenantId);

    this.logger.log(`Adapter config ${id} saved for tenant ${tenantId}`);
    return config;
  }

  /**
   * Delete an adapter configuration
   */
  async deleteAdapterConfig(tenantId: string, adapterId: string): Promise<void> {
    await this.removeFromDatabase(tenantId, adapterId);
    this.configCache.delete(tenantId);
    this.logger.log(`Adapter config ${adapterId} deleted for tenant ${tenantId}`);
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    tenantId: string,
    adapterId: string,
    status: 'syncing' | 'error' | 'success' | 'idle',
    error?: string,
  ): Promise<void> {
    const config = await this.getAdapterConfig(tenantId, adapterId);
    if (!config) {
      return;
    }

    config.syncStatus = status;
    config.lastError = status === 'error' ? error : undefined;
    if (status === 'success') {
      config.lastSyncAt = new Date();
    }

    await this.saveToDatabase(tenantId, config);
    this.configCache.delete(tenantId);
  }

  /**
   * Validate adapter configuration
   */
  validateConfig(
    type: AdapterType,
    config: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (type) {
      case 'github':
        if (!config.token) {
          errors.push('GitHub token is required');
        }
        if (!config.owner) {
          errors.push('GitHub owner is required');
        }
        if (!config.repo) {
          errors.push('GitHub repo is required');
        }
        break;

      case 'gitlab':
        if (!config.token) {
          errors.push('GitLab token is required');
        }
        if (!config.projectId) {
          errors.push('GitLab project ID is required');
        }
        break;

      case 'jira':
        if (!config.domain) {
          errors.push('Jira domain is required');
        }
        if (!config.email) {
          errors.push('Jira email is required');
        }
        if (!config.apiToken) {
          errors.push('Jira API token is required');
        }
        if (!config.projectKey) {
          errors.push('Jira project key is required');
        }
        break;

      case 'confluence':
        if (!config.domain) {
          errors.push('Confluence domain is required');
        }
        if (!config.email) {
          errors.push('Confluence email is required');
        }
        if (!config.apiToken) {
          errors.push('Confluence API token is required');
        }
        if (!config.spaceKey) {
          errors.push('Confluence space key is required');
        }
        break;

      case 'azure_devops':
        if (!config.organizationUrl) {
          errors.push('Azure DevOps organization URL is required');
        }
        if (!config.personalAccessToken) {
          errors.push('Azure DevOps PAT is required');
        }
        if (!config.project) {
          errors.push('Azure DevOps project is required');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get adapter type display info
   */
  getAdapterTypeInfo(type: AdapterType): {
    displayName: string;
    description: string;
    icon: string;
    capabilities: string[];
  } {
    const info: Record<
      AdapterType,
      { displayName: string; description: string; icon: string; capabilities: string[] }
    > = {
      github: {
        displayName: 'GitHub',
        description: 'Sync PRs, workflow runs, releases, SBOMs, and security advisories',
        icon: 'github',
        capabilities: ['pull_requests', 'workflow_runs', 'releases', 'sbom', 'security_advisories'],
      },
      gitlab: {
        displayName: 'GitLab',
        description: 'Sync pipelines, merge requests, releases, vulnerabilities, and coverage',
        icon: 'gitlab',
        capabilities: ['pipelines', 'merge_requests', 'releases', 'vulnerabilities', 'coverage'],
      },
      jira: {
        displayName: 'Jira',
        description: 'Sync issues, sprints, and project information',
        icon: 'jira',
        capabilities: ['issues', 'sprints', 'projects', 'comments'],
      },
      confluence: {
        displayName: 'Confluence',
        description: 'Sync documentation pages and attachments',
        icon: 'confluence',
        capabilities: ['pages', 'attachments', 'bidirectional_sync'],
      },
      azure_devops: {
        displayName: 'Azure DevOps',
        description: 'Sync pipelines, repos, work items, and artifacts',
        icon: 'azure',
        capabilities: ['pipelines', 'repos', 'work_items', 'artifacts'],
      },
    };

    return info[type];
  }

  /**
   * Get all supported adapter types
   */
  getSupportedAdapterTypes(): Array<{
    type: AdapterType;
    info: Record<string, unknown> | undefined;
  }> {
    const types: AdapterType[] = ['github', 'gitlab', 'jira', 'confluence', 'azure_devops'];
    return types.map((type) => ({ type, info: this.getAdapterTypeInfo(type) }));
  }

  // Private helper methods

  private generateId(): string {
    return `adapter_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  private encryptSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
    // In production, encrypt sensitive fields like tokens
    // For now, just return as-is (should use Key Vault in production)
    return config;
  }

  private decryptSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
    // In production, decrypt sensitive fields
    return config;
  }

  private async loadFromDatabase(tenantId: string): Promise<AdapterConfig[]> {
    try {
      // Load from tenant settings or dedicated adapter_configs table
      const result = await this.prisma.$queryRaw<Array<{ config: string }>>`
        SELECT config FROM tenant_settings 
        WHERE tenant_id = ${tenantId} AND key = 'adapter_configs'
      `;

      if (result.length > 0 && result[0].config) {
        const configs = JSON.parse(result[0].config) as AdapterConfig[];
        return configs.map((c) => ({
          ...c,
          config: this.decryptSensitiveFields(c.config),
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          lastSyncAt: c.lastSyncAt ? new Date(c.lastSyncAt) : undefined,
        }));
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load adapter configs from DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Return default configs from environment
    return this.getDefaultConfigs();
  }

  private async saveToDatabase(tenantId: string, config: AdapterConfig): Promise<void> {
    try {
      const existing = await this.loadFromDatabase(tenantId);
      const updated = existing.filter((c) => c.id !== config.id);
      updated.push(config);

      await this.prisma.$executeRaw`
        INSERT INTO tenant_settings (tenant_id, key, config, updated_at)
        VALUES (${tenantId}, 'adapter_configs', ${JSON.stringify(updated)}::jsonb, NOW())
        ON CONFLICT (tenant_id, key) 
        DO UPDATE SET config = ${JSON.stringify(updated)}::jsonb, updated_at = NOW()
      `;
    } catch (error) {
      this.logger.error(
        `Failed to save adapter config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async removeFromDatabase(tenantId: string, adapterId: string): Promise<void> {
    try {
      const existing = await this.loadFromDatabase(tenantId);
      const updated = existing.filter((c) => c.id !== adapterId);

      await this.prisma.$executeRaw`
        UPDATE tenant_settings 
        SET config = ${JSON.stringify(updated)}::jsonb, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND key = 'adapter_configs'
      `;
    } catch (error) {
      this.logger.error(
        `Failed to remove adapter config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private getDefaultConfigs(): AdapterConfig[] {
    const configs: AdapterConfig[] = [];

    // Check for GitHub env vars
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    if (githubToken) {
      configs.push({
        id: 'default_github',
        type: 'github',
        name: 'Default GitHub',
        enabled: true,
        config: {
          token: githubToken,
          owner: this.configService.get<string>('GITHUB_OWNER'),
          repo: this.configService.get<string>('GITHUB_REPO'),
        },
        syncStatus: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Check for GitLab env vars
    const gitlabToken = this.configService.get<string>('GITLAB_TOKEN');
    if (gitlabToken) {
      configs.push({
        id: 'default_gitlab',
        type: 'gitlab',
        name: 'Default GitLab',
        enabled: true,
        config: {
          token: gitlabToken,
          projectId: this.configService.get<string>('GITLAB_PROJECT_ID'),
          apiUrl: this.configService.get<string>('GITLAB_API_URL'),
        },
        syncStatus: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Check for Jira env vars
    const jiraApiToken = this.configService.get<string>('JIRA_API_TOKEN');
    if (jiraApiToken) {
      configs.push({
        id: 'default_jira',
        type: 'jira',
        name: 'Default Jira',
        enabled: true,
        config: {
          domain: this.configService.get<string>('JIRA_DOMAIN'),
          email: this.configService.get<string>('JIRA_EMAIL'),
          apiToken: jiraApiToken,
          projectKey: this.configService.get<string>('JIRA_PROJECT_KEY'),
        },
        syncStatus: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return configs;
  }
}
