/**
 * NQS (Next Question Suggest) Command
 *
 * Suggests the next best questions to answer based on adaptive logic
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

export const nqsCommand = new Command('nqs')
  .description('Get next question suggestions')
  .argument('[sessionId]', 'Session ID (uses default if not provided)')
  .option('-n, --count <number>', 'Number of suggestions', '5')
  .option('-d, --dimension <key>', 'Filter by dimension')
  .option('-p, --persona <type>', 'Filter by persona (CTO, CFO, CEO, BA, POLICY)')
  .option('-j, --json', 'Output as JSON')
  .action(async (sessionId: string | undefined, options) => {
    const config = new Config();
    const targetSessionId = sessionId || config.get('defaultSession');

    if (!targetSessionId) {
      console.error(chalk.red('Error: No session ID provided and no default session configured.'));
      process.exit(1);
    }

    const spinner = ora('Fetching question suggestions...').start();

    try {
      const client = new ApiClient(config);
      const suggestions = await client.getNextQuestions(targetSessionId, {
        count: parseInt(options.count, 10),
        dimension: options.dimension,
        persona: options.persona,
      });

      spinner.succeed(`Found ${suggestions.questions.length} suggested questions`);

      if (options.json) {
        console.log(JSON.stringify(suggestions, null, 2));
        return;
      }

      // Display suggestions
      console.log('\n' + chalk.bold('📝 Next Question Suggestions'));
      console.log(chalk.gray('─'.repeat(60)));

      if (suggestions.questions.length === 0) {
        console.log(chalk.green('\n✅ All questions answered! Assessment complete.'));
        return;
      }

      suggestions.questions.forEach((q, i) => {
        const priorityIcon = getPriorityIcon(q.priority);
        const severityColor = getSeverityColor(q.severity);

        console.log(`\n${chalk.bold(`${i + 1}. ${q.text}`)}`);
        console.log(`   ${chalk.gray('ID:')} ${q.id}`);
        console.log(
          `   ${chalk.gray('Dimension:')} ${q.dimension} | ${chalk.gray('Persona:')} ${q.persona}`,
        );
        console.log(
          `   ${chalk.gray('Severity:')} ${severityColor(`${(q.severity * 100).toFixed(0)}%`)} | ${chalk.gray('Priority:')} ${priorityIcon}`,
        );

        if (q.bestPractice) {
          console.log(
            `   ${chalk.gray('Best Practice:')} ${chalk.italic(truncate(q.bestPractice, 80))}`,
          );
        }
      });

      // Summary
      console.log('\n' + chalk.gray('─'.repeat(60)));
      console.log(
        chalk.gray(
          `Showing ${suggestions.questions.length} of ${suggestions.totalRemaining} remaining questions`,
        ),
      );

      if (suggestions.topDimension) {
        console.log(
          chalk.gray(
            `Focus area: ${suggestions.topDimension.name} (${suggestions.topDimension.remaining} gaps)`,
          ),
        );
      }
    } catch (error) {
      spinner.fail('Failed to fetch suggestions');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return chalk.red('🔴 Critical');
    case 'HIGH':
      return chalk.hex('#FFA500')('🟠 High');
    case 'MEDIUM':
      return chalk.yellow('🟡 Medium');
    case 'LOW':
      return chalk.green('🟢 Low');
    default:
      return priority;
  }
}

function getSeverityColor(severity: number): chalk.Chalk {
  if (severity >= 0.8) {
    return chalk.red;
  }
  if (severity >= 0.6) {
    return chalk.hex('#FFA500');
  }
  if (severity >= 0.4) {
    return chalk.yellow;
  }
  return chalk.green;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}
