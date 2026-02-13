/**
 * Terraform Rules Service
 * Generates Terraform compliance rules from readiness gaps
 */
import { Injectable, Logger } from '@nestjs/common';

export interface TerraformRule {
  name: string;
  description: string;
  dimensionKey: string;
  resourceTypes: string[];
  ruleCode: string;
}

@Injectable()
export class TerraformRulesService {
  private readonly logger = new Logger(TerraformRulesService.name);

  /**
   * Terraform compliance rules by dimension
   */
  private readonly rules: TerraformRule[] = [
    // Architecture & Security
    {
      name: 'ensure_https_only',
      description: 'Ensure all web applications use HTTPS',
      dimensionKey: 'arch_sec',
      resourceTypes: ['azurerm_app_service', 'azurerm_container_app'],
      ruleCode: `
Feature: Ensure HTTPS is enforced
  Scenario: App Service must use HTTPS
    Given I have azurerm_app_service defined
    Then it must have https_only
    And its value must be true

  Scenario: Container App must use HTTPS ingress
    Given I have azurerm_container_app defined
    When it has ingress
    Then it must have transport
    And its value must be "https"
`,
    },
    {
      name: 'encryption_at_rest',
      description: 'Ensure data is encrypted at rest',
      dimensionKey: 'arch_sec',
      resourceTypes: ['azurerm_storage_account', 'azurerm_mssql_database'],
      ruleCode: `
Feature: Ensure encryption at rest
  Scenario: Storage account must use encryption
    Given I have azurerm_storage_account defined
    Then it must have min_tls_version
    And its value must be "TLS1_2"

  Scenario: SQL Database must have TDE
    Given I have azurerm_mssql_database defined
    Then it must have transparent_data_encryption_enabled
    And its value must be true
`,
    },
    {
      name: 'network_segmentation',
      description: 'Ensure proper network segmentation',
      dimensionKey: 'arch_sec',
      resourceTypes: ['azurerm_network_security_group'],
      ruleCode: `
Feature: Network security
  Scenario: NSG must not allow all inbound
    Given I have azurerm_network_security_group defined
    When it has security_rule
    Then it must not have source_address_prefix
    And its value must not be "*"
    When its direction is "Inbound"
    And its access is "Allow"
`,
    },

    // DevOps & IaC
    {
      name: 'resource_tagging',
      description: 'Ensure all resources have required tags',
      dimensionKey: 'devops_iac',
      resourceTypes: ['*'],
      ruleCode: `
Feature: Resource tagging compliance
  Scenario Outline: Resources must have mandatory tags
    Given I have <resource_type> defined
    Then it must have tags
    And it must contain environment
    And it must contain owner
    And it must contain cost-center

  Examples:
    | resource_type |
    | azurerm_resource_group |
    | azurerm_storage_account |
    | azurerm_app_service |
    | azurerm_container_app |
`,
    },
    {
      name: 'diagnostic_settings',
      description: 'Ensure diagnostic settings are configured',
      dimensionKey: 'devops_iac',
      resourceTypes: ['azurerm_monitor_diagnostic_setting'],
      ruleCode: `
Feature: Monitoring and logging
  Scenario: Key resources must have diagnostics
    Given I have azurerm_key_vault defined
    Then it must have a azurerm_monitor_diagnostic_setting
    And it must have enabled_log
`,
    },

    // Compliance & Policy
    {
      name: 'audit_retention',
      description: 'Ensure audit logs are retained',
      dimensionKey: 'compliance_policy',
      resourceTypes: ['azurerm_log_analytics_workspace'],
      ruleCode: `
Feature: Audit log retention
  Scenario: Log Analytics must retain logs
    Given I have azurerm_log_analytics_workspace defined
    Then it must have retention_in_days
    And its value must be greater than 89
`,
    },

    // Data & Privacy
    {
      name: 'data_residency',
      description: 'Ensure data stays in approved regions',
      dimensionKey: 'privacy_legal',
      resourceTypes: ['azurerm_resource_group', 'azurerm_storage_account'],
      ruleCode: `
Feature: Data residency compliance
  Scenario: Resources must be in approved regions
    Given I have azurerm_resource_group defined
    Then it must have location
    And its value must match the "(westeurope|northeurope|uksouth|ukwest)" regex
`,
    },
  ];

  /**
   * Get rules for a dimension
   */
  getRulesForDimension(dimensionKey: string): TerraformRule[] {
    return this.rules.filter((r) => r.dimensionKey === dimensionKey);
  }

  /**
   * Get all rules
   */
  getAllRules(): TerraformRule[] {
    return this.rules;
  }

  /**
   * Generate combined terraform-compliance feature file
   */
  generateFeatureFile(rules: TerraformRule[]): string {
    const lines: string[] = [
      '# Quiz2Biz Auto-Generated Terraform Compliance Rules',
      '# Generated at: ' + new Date().toISOString(),
      '# Run with: terraform-compliance -f features/ -p plan.json',
      '',
    ];

    for (const rule of rules) {
      lines.push(`# Rule: ${rule.name}`);
      lines.push(`# Description: ${rule.description}`);
      lines.push(`# Dimension: ${rule.dimensionKey}`);
      lines.push(rule.ruleCode);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate terraform-compliance config
   */
  generateConfig(): string {
    return `# terraform-compliance configuration
# Place in .terraform-compliance.yml

format: json
log_level: info
exit_on_failure: true
features:
  - features/quiz2biz/
`;
  }
}
