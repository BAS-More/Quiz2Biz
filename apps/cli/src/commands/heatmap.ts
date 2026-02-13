/**
 * Heatmap Command
 *
 * Exports readiness heatmap in various formats
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

export const heatmapCommand = new Command('heatmap')
  .description('Export readiness heatmap')
  .argument('[sessionId]', 'Session ID (uses default if not provided)')
  .option('-f, --format <type>', 'Output format: csv, markdown, json', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .option('--stdout', 'Print to stdout instead of file')
  .action(async (sessionId: string | undefined, options) => {
    const config = new Config();
    const targetSessionId = sessionId || config.get('defaultSession');

    if (!targetSessionId) {
      console.error(chalk.red('Error: No session ID provided and no default session configured.'));
      process.exit(1);
    }

    const spinner = ora('Generating heatmap...').start();

    try {
      const client = new ApiClient(config);
      const heatmapData = await client.getHeatmap(targetSessionId);

      spinner.succeed('Heatmap data retrieved');

      let output: string;
      let extension: string;

      switch (options.format) {
        case 'csv':
          output = formatCSV(heatmapData);
          extension = '.csv';
          break;
        case 'json':
          output = JSON.stringify(heatmapData, null, 2);
          extension = '.json';
          break;
        case 'markdown':
        default:
          output = formatMarkdown(heatmapData);
          extension = '.md';
          break;
      }

      if (options.stdout) {
        console.log(output);
      } else {
        const outputPath =
          options.output || `quiz2biz-heatmap-${targetSessionId.substring(0, 8)}${extension}`;
        fs.writeFileSync(outputPath, output);
        console.log(chalk.green(`✅ Heatmap exported to: ${path.resolve(outputPath)}`));
      }
    } catch (error) {
      spinner.fail('Failed to generate heatmap');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

function formatMarkdown(data: HeatmapData): string {
  const lines: string[] = [
    '# Quiz2Biz Readiness Heatmap',
    '',
    `**Session:** ${data.sessionName}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Overall Score:** ${(data.overallScore * 100).toFixed(1)}%`,
    '',
    '## Dimension Summary',
    '',
    '| Dimension | Score | Coverage | Status |',
    '|-----------|-------|----------|--------|',
  ];

  data.dimensions.forEach((dim) => {
    const status =
      dim.score >= 0.95 ? '🟢' : dim.score >= 0.7 ? '🟡' : dim.score >= 0.4 ? '🟠' : '🔴';
    lines.push(
      `| ${dim.name} | ${(dim.score * 100).toFixed(0)}% | ${dim.questionsAnswered}/${dim.totalQuestions} | ${status} |`,
    );
  });

  lines.push('', '## Question Details', '');

  data.dimensions.forEach((dim) => {
    lines.push(`### ${dim.name}`, '');
    lines.push('| Question | Severity | Coverage | Status |');
    lines.push('|----------|----------|----------|--------|');

    dim.questions.forEach((q) => {
      const residual = q.severity * (1 - q.coverage);
      const status =
        residual <= 0.05 ? '🟢' : residual <= 0.15 ? '🟡' : residual <= 0.3 ? '🟠' : '🔴';
      const questionText = q.text.length > 50 ? q.text.substring(0, 47) + '...' : q.text;
      lines.push(
        `| ${questionText} | ${(q.severity * 100).toFixed(0)}% | ${(q.coverage * 100).toFixed(0)}% | ${status} |`,
      );
    });

    lines.push('');
  });

  return lines.join('\n');
}

function formatCSV(data: HeatmapData): string {
  const rows: string[] = [
    'Dimension,Question ID,Question Text,Severity,Coverage,Residual Risk,Status',
  ];

  data.dimensions.forEach((dim) => {
    dim.questions.forEach((q) => {
      const residual = q.severity * (1 - q.coverage);
      const status =
        residual <= 0.05
          ? 'GREEN'
          : residual <= 0.15
            ? 'YELLOW'
            : residual <= 0.3
              ? 'ORANGE'
              : 'RED';
      const escapedText = `"${q.text.replace(/"/g, '""')}"`;
      rows.push(
        `${dim.name},${q.id},${escapedText},${q.severity.toFixed(2)},${q.coverage.toFixed(2)},${residual.toFixed(2)},${status}`,
      );
    });
  });

  return rows.join('\n');
}

interface HeatmapData {
  sessionName: string;
  overallScore: number;
  dimensions: Array<{
    name: string;
    key: string;
    score: number;
    questionsAnswered: number;
    totalQuestions: number;
    questions: Array<{
      id: string;
      text: string;
      severity: number;
      coverage: number;
    }>;
  }>;
}
