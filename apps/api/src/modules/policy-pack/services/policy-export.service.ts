/**
 * Policy Export Service
 * Exports policy packs as ZIP bundles with README
 */
import { Injectable, Logger } from '@nestjs/common';
import { PolicyPackBundle, PolicyDocument } from '../types';

@Injectable()
export class PolicyExportService {
  private readonly logger = new Logger(PolicyExportService.name);

  /**
   * Generate README content for policy pack
   */
  generateReadme(bundle: PolicyPackBundle): string {
    const lines: string[] = [
      `# ${bundle.name}`,
      '',
      `Version: ${bundle.version}`,
      `Generated: ${bundle.generatedAt.toISOString()}`,
      '',
      '## Contents',
      '',
      '### Policies',
      '',
    ];

    for (const policy of bundle.policies) {
      lines.push(`- **${policy.title}** (${policy.type})`);
      lines.push(`  - Dimension: ${policy.dimensionKey}`);
      lines.push(`  - Status: ${policy.status}`);
      lines.push(`  - Standards: ${policy.standards.length}`);
      lines.push('');
    }

    lines.push('### OPA/Rego Policies');
    lines.push('');
    for (const opa of bundle.opaPolicies) {
      lines.push(`- **${opa.name}**: ${opa.description} (${opa.severity})`);
    }
    lines.push('');

    lines.push('### Terraform Compliance Rules');
    lines.push('');
    lines.push('See `terraform/features/` directory for compliance rules.');
    lines.push('');

    lines.push('## Usage');
    lines.push('');
    lines.push('### OPA Policies');
    lines.push('```bash');
    lines.push('# Validate with OPA');
    lines.push('opa eval --data opa-policies/ --input terraform.json "data.quiz2biz"');
    lines.push('```');
    lines.push('');
    lines.push('### Terraform Compliance');
    lines.push('```bash');
    lines.push('# Run terraform-compliance');
    lines.push('terraform plan -out=plan.tfplan');
    lines.push('terraform show -json plan.tfplan > plan.json');
    lines.push('terraform-compliance -f terraform/features/ -p plan.json');
    lines.push('```');
    lines.push('');

    lines.push('## Control Mappings');
    lines.push('');
    lines.push('| Framework | Controls |');
    lines.push('|-----------|----------|');

    const frameworkCounts: Record<string, number> = {};
    for (const policy of bundle.policies) {
      for (const mapping of policy.controlMappings) {
        frameworkCounts[mapping.framework] = (frameworkCounts[mapping.framework] || 0) + 1;
      }
    }
    for (const [framework, count] of Object.entries(frameworkCounts)) {
      lines.push(`| ${framework} | ${count} |`);
    }
    lines.push('');

    if (bundle.sourceSessionId) {
      lines.push('---');
      lines.push('');
      lines.push(`Generated from Quiz2Biz Session: ${bundle.sourceSessionId}`);
      lines.push(`Score at Generation: ${bundle.scoreAtGeneration ?? 'N/A'}%`);
    }

    return lines.join('\n');
  }

  /**
   * Generate policy document as markdown
   */
  generatePolicyMarkdown(policy: PolicyDocument): string {
    const lines: string[] = [
      `# ${policy.title}`,
      '',
      `**Version:** ${policy.version}`,
      `**Type:** ${policy.type}`,
      `**Status:** ${policy.status}`,
      `**Owner:** ${policy.owner}`,
      `**Effective Date:** ${policy.effectiveDate.toISOString().split('T')[0]}`,
      `**Review Date:** ${policy.reviewDate.toISOString().split('T')[0]}`,
      '',
      '## Objective',
      '',
      policy.objective,
      '',
      '## Scope',
      '',
      policy.scope,
      '',
      '## Policy Statements',
      '',
    ];

    for (const stmt of policy.statements) {
      const icon =
        String(stmt.requirement) === 'SHALL'
          ? '🔴'
          : String(stmt.requirement) === 'SHOULD'
            ? '🟡'
            : '🟢';
      lines.push(`${icon} **${stmt.requirement}:** ${stmt.text}`);
      if (stmt.evidenceRequired) {
        lines.push('   - *Evidence required*');
      }
      lines.push('');
    }

    if (policy.standards.length > 0) {
      lines.push('## Standards');
      lines.push('');
      for (const std of policy.standards) {
        lines.push(`### ${std.title}`);
        lines.push('');
        lines.push('#### Requirements');
        lines.push('');
        for (const req of std.requirements) {
          lines.push(`- **${req.id}:** ${req.description}`);
          lines.push(`  - Specification: ${req.specification}`);
          lines.push(`  - Verification: ${req.verificationMethod}`);
        }
        lines.push('');

        if (std.procedures.length > 0) {
          lines.push('#### Procedures');
          lines.push('');
          for (const proc of std.procedures) {
            lines.push(`##### ${proc.title}`);
            lines.push('');
            lines.push(`**Roles:** ${proc.roles.join(', ')}`);
            lines.push(`**Frequency:** ${proc.frequency || 'As needed'}`);
            lines.push('');
            lines.push('**Steps:**');
            for (const step of proc.steps) {
              lines.push(`${step.order}. ${step.description} *(${step.responsibleRole})*`);
            }
            lines.push('');
          }
        }
      }
    }

    if (policy.controlMappings.length > 0) {
      lines.push('## Control Mappings');
      lines.push('');
      lines.push('| Framework | Control ID | Description |');
      lines.push('|-----------|------------|-------------|');
      for (const mapping of policy.controlMappings) {
        lines.push(
          `| ${mapping.framework} | ${mapping.controlId} | ${mapping.controlDescription} |`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate bundle manifest
   */
  generateManifest(bundle: PolicyPackBundle): string {
    return JSON.stringify(
      {
        id: bundle.id,
        name: bundle.name,
        version: bundle.version,
        generatedAt: bundle.generatedAt.toISOString(),
        sourceSessionId: bundle.sourceSessionId,
        scoreAtGeneration: bundle.scoreAtGeneration,
        contents: {
          policies: bundle.policies.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            dimension: p.dimensionKey,
          })),
          opaPolicies: bundle.opaPolicies.map((o) => ({
            name: o.name,
            severity: o.severity,
          })),
          hasTerraformRules: !!bundle.terraformRules,
        },
      },
      null,
      2,
    );
  }

  /**
   * Get file structure for ZIP export
   */
  getExportStructure(bundle: PolicyPackBundle): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];

    // README
    files.push({
      path: 'README.md',
      content: this.generateReadme(bundle),
    });

    // Manifest
    files.push({
      path: 'manifest.json',
      content: this.generateManifest(bundle),
    });

    // Policies
    for (const policy of bundle.policies) {
      files.push({
        path: `policies/${policy.dimensionKey}/${policy.id}.md`,
        content: this.generatePolicyMarkdown(policy),
      });
      files.push({
        path: `policies/${policy.dimensionKey}/${policy.id}.json`,
        content: JSON.stringify(policy, null, 2),
      });
    }

    // OPA policies
    for (const opa of bundle.opaPolicies) {
      files.push({
        path: `opa-policies/${opa.name}.rego`,
        content: opa.regoCode,
      });
    }

    // Combined OPA policy
    if (bundle.opaPolicies.length > 0) {
      const combinedRego = bundle.opaPolicies.map((o) => o.regoCode).join('\n\n---\n\n');
      files.push({
        path: 'opa-policies/combined.rego',
        content: combinedRego,
      });
    }

    // Terraform rules
    if (bundle.terraformRules) {
      files.push({
        path: 'terraform/features/quiz2biz.feature',
        content: bundle.terraformRules,
      });
    }

    return files;
  }
}
