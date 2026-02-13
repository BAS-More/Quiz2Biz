/**
 * OPA Policy Service
 * Generates OPA/Rego policies for infrastructure validation
 */
import { Injectable, Logger } from '@nestjs/common';
import { OpaPolicy, PolicySeverity } from '../types';

@Injectable()
export class OpaPolicyService {
  private readonly logger = new Logger(OpaPolicyService.name);

  /**
   * OPA policy templates by dimension
   */
  private readonly policyTemplates: Record<string, OpaPolicy[]> = {
    arch_sec: [
      {
        name: 'require_https',
        packageName: 'quiz2biz.security',
        description: 'Require HTTPS for all ingress resources',
        severity: PolicySeverity.HIGH,
        resourceTypes: ['kubernetes_ingress', 'azurerm_application_gateway'],
        regoCode: `package quiz2biz.security

deny[msg] {
  input.kind == "Ingress"
  not input.spec.tls
  msg := sprintf("Ingress %v must use TLS", [input.metadata.name])
}

deny[msg] {
  input.resource_type == "azurerm_application_gateway"
  listener := input.resource.http_listener[_]
  listener.protocol != "Https"
  msg := "Application Gateway must use HTTPS listener"
}`,
        tests: [
          {
            name: 'deny_http_ingress',
            input: { kind: 'Ingress', metadata: { name: 'test' }, spec: {} },
            expected: false,
          },
          {
            name: 'allow_https_ingress',
            input: { kind: 'Ingress', metadata: { name: 'test' }, spec: { tls: [{}] } },
            expected: true,
          },
        ],
      },
      {
        name: 'no_public_storage',
        packageName: 'quiz2biz.security',
        description: 'Deny publicly accessible storage accounts',
        severity: PolicySeverity.CRITICAL,
        resourceTypes: ['azurerm_storage_account', 'aws_s3_bucket'],
        regoCode: `package quiz2biz.security

deny[msg] {
  input.resource_type == "azurerm_storage_account"
  input.resource.public_network_access_enabled == true
  msg := "Storage account must not allow public network access"
}

deny[msg] {
  input.resource_type == "aws_s3_bucket"
  acl := input.resource.acl
  acl == "public-read"
  msg := "S3 bucket must not be publicly readable"
}`,
        tests: [
          {
            name: 'deny_public_storage',
            input: {
              resource_type: 'azurerm_storage_account',
              resource: { public_network_access_enabled: true },
            },
            expected: false,
          },
        ],
      },
      {
        name: 'encryption_at_rest',
        packageName: 'quiz2biz.security',
        description: 'Require encryption at rest for databases',
        severity: PolicySeverity.HIGH,
        resourceTypes: ['azurerm_postgresql_flexible_server', 'azurerm_mssql_database'],
        regoCode: `package quiz2biz.security

deny[msg] {
  input.resource_type == "azurerm_mssql_database"
  not input.resource.transparent_data_encryption_enabled
  msg := "SQL Database must have transparent data encryption enabled"
}

deny[msg] {
  input.resource_type == "azurerm_postgresql_flexible_server"
  input.resource.storage_mb < 32768
  not input.resource.geo_redundant_backup_enabled
  msg := "PostgreSQL server must have geo-redundant backup for data protection"
}`,
        tests: [],
      },
    ],

    devops_iac: [
      {
        name: 'require_tags',
        packageName: 'quiz2biz.governance',
        description: 'Require mandatory tags on all resources',
        severity: PolicySeverity.MEDIUM,
        resourceTypes: ['*'],
        regoCode: `package quiz2biz.governance

required_tags := ["environment", "owner", "cost-center"]

deny[msg] {
  resource := input.resource
  tag := required_tags[_]
  not resource.tags[tag]
  msg := sprintf("Resource missing required tag: %v", [tag])
}`,
        tests: [
          { name: 'deny_missing_tags', input: { resource: { tags: {} } }, expected: false },
          {
            name: 'allow_all_tags',
            input: {
              resource: { tags: { environment: 'prod', owner: 'team', 'cost-center': '123' } },
            },
            expected: true,
          },
        ],
      },
      {
        name: 'no_hardcoded_secrets',
        packageName: 'quiz2biz.security',
        description: 'Prevent hardcoded secrets in configuration',
        severity: PolicySeverity.CRITICAL,
        resourceTypes: ['*'],
        regoCode: `package quiz2biz.security

secret_patterns := ["password", "secret", "api_key", "token", "credential"]

deny[msg] {
  resource := input.resource
  key := resource[_]
  pattern := secret_patterns[_]
  contains(lower(key), pattern)
  is_string(resource[key])
  not startswith(resource[key], "var.")
  not startswith(resource[key], "data.")
  msg := sprintf("Possible hardcoded secret found in key: %v", [key])
}`,
        tests: [],
      },
    ],

    compliance_policy: [
      {
        name: 'audit_logging_enabled',
        packageName: 'quiz2biz.compliance',
        description: 'Require audit logging on all resources',
        severity: PolicySeverity.HIGH,
        resourceTypes: ['azurerm_key_vault', 'azurerm_storage_account'],
        regoCode: `package quiz2biz.compliance

deny[msg] {
  input.resource_type == "azurerm_key_vault"
  not input.resource.enable_rbac_authorization
  msg := "Key Vault must use RBAC authorization for audit compliance"
}

deny[msg] {
  input.resource_type == "azurerm_storage_account"
  not input.resource.blob_properties[_].logging
  msg := "Storage account must have blob logging enabled"
}`,
        tests: [],
      },
    ],
  };

  /**
   * Get OPA policies for a dimension
   */
  getPoliciesForDimension(dimensionKey: string): OpaPolicy[] {
    return this.policyTemplates[dimensionKey] || [];
  }

  /**
   * Get all available OPA policies
   */
  getAllPolicies(): OpaPolicy[] {
    const policies: OpaPolicy[] = [];
    for (const dimension of Object.values(this.policyTemplates)) {
      policies.push(...dimension);
    }
    return policies;
  }

  /**
   * Generate combined Rego policy file
   */
  generateCombinedRegoFile(policies: OpaPolicy[]): string {
    const lines: string[] = [
      '# Quiz2Biz Auto-Generated OPA Policies',
      '# Generated at: ' + new Date().toISOString(),
      '',
    ];

    for (const policy of policies) {
      lines.push(`# Policy: ${policy.name}`);
      lines.push(`# Description: ${policy.description}`);
      lines.push(`# Severity: ${policy.severity}`);
      lines.push('');
      lines.push(policy.regoCode);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Validate Rego syntax (basic check)
   */
  validateRegoSyntax(regoCode: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic syntax checks
    if (!regoCode.includes('package ')) {
      errors.push('Missing package declaration');
    }

    const hasRule =
      regoCode.includes('deny[') || regoCode.includes('allow[') || regoCode.includes('violation[');
    if (!hasRule) {
      errors.push('No deny, allow, or violation rule found');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
