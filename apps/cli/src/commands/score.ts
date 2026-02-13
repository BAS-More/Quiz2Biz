/**
 * Score Command
 *
 * Retrieves and displays the current readiness score
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { ApiClient } from '../lib/api-client';
import { Config } from '../lib/config';

export const scoreCommand = new Command('score')
  .description('Get readiness score for a session')
  .argument('[sessionId]', 'Session ID (uses default if not provided)')
  .option('-d, --detailed', 'Show detailed dimension breakdown')
  .option('-j, --json', 'Output as JSON')
  .option('--offline', 'Use offline data file')
  .action(async (sessionId: string | undefined, options) => {
    const config = new Config();
    const targetSessionId = sessionId || config.get('defaultSession');

    if (!targetSessionId) {
      console.error(chalk.red('Error: No session ID provided and no default session configured.'));
      console.log(chalk.gray('Use: quiz2biz config set defaultSession <sessionId>'));
      process.exit(1);
    }

    const spinner = ora('Fetching readiness score...').start();

    try {
      let scoreData: ScoreData;

      if (options.offline) {
        const offlineData = config.getOfflineData(targetSessionId);
        if (!offlineData) {
          spinner.fail('No offline data found for this session');
          process.exit(1);
        }
        scoreData = offlineData.score;
      } else {
        const client = new ApiClient(config);
        scoreData = await client.getScore(targetSessionId);
      }

      spinner.succeed('Score retrieved');

      if (options.json) {
        console.log(JSON.stringify(scoreData, null, 2));
        return;
      }

      // Display score
      console.log('\n' + chalk.bold('📊 Quiz2Biz Readiness Score'));
      console.log(chalk.gray('─'.repeat(40)));

      const scoreColor = getScoreColor(scoreData.overallScore);
      console.log(
        `\n${chalk.bold('Overall Score:')} ${scoreColor(`${(scoreData.overallScore * 100).toFixed(1)}%`)}`,
      );
      console.log(`${chalk.bold('Status:')} ${getScoreStatus(scoreData.overallScore)}`);
      console.log(`${chalk.bold('Target:')} 95%`);

      if (options.detailed && scoreData.dimensions) {
        console.log('\n' + chalk.bold('Dimension Breakdown:'));

        const tableData = [
          [chalk.bold('Dimension'), chalk.bold('Score'), chalk.bold('Coverage'), chalk.bold('Gap')],
          ...scoreData.dimensions.map((dim) => [
            dim.name,
            getScoreColor(dim.score)(`${(dim.score * 100).toFixed(0)}%`),
            `${dim.questionsAnswered}/${dim.totalQuestions}`,
            dim.score < 0.95
              ? chalk.red(`${((0.95 - dim.score) * 100).toFixed(0)}%`)
              : chalk.green('✓'),
          ]),
        ];

        console.log(
          table(tableData, {
            border: {
              topBody: '─',
              bottomBody: '─',
              joinBody: '─',
              topJoin: '┬',
              bottomJoin: '┴',
              bodyLeft: '│',
              bodyRight: '│',
              bodyJoin: '│',
              joinLeft: '├',
              joinRight: '┤',
              joinJoin: '┼',
            },
          }),
        );
      }

      // Progress summary
      console.log('\n' + chalk.bold('Progress:'));
      console.log(`  Sections left: ${scoreData.progress?.sectionsLeft ?? 'N/A'}`);
      console.log(`  Questions left: ${scoreData.progress?.questionsLeft ?? 'N/A'}`);
      console.log(
        `  Current section: ${scoreData.progress?.currentSectionProgress ?? 0}/${scoreData.progress?.currentSectionTotal ?? 0}`,
      );
    } catch (error) {
      spinner.fail('Failed to fetch score');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

function getScoreColor(score: number): chalk.Chalk {
  if (score >= 0.95) {
    return chalk.green;
  }
  if (score >= 0.7) {
    return chalk.yellow;
  }
  if (score >= 0.4) {
    return chalk.hex('#FFA500');
  } // Orange
  return chalk.red;
}

function getScoreStatus(score: number): string {
  if (score >= 0.95) {
    return chalk.green('✅ Ready for Production');
  }
  if (score >= 0.7) {
    return chalk.yellow('⚠️  Needs Improvement');
  }
  if (score >= 0.4) {
    return chalk.hex('#FFA500')('🔶 Significant Gaps');
  }
  return chalk.red('❌ Critical Gaps');
}

interface ScoreData {
  overallScore: number;
  dimensions?: Array<{
    name: string;
    score: number;
    questionsAnswered: number;
    totalQuestions: number;
  }>;
  progress?: {
    sectionsLeft: number;
    questionsLeft: number;
    currentSectionProgress: number;
    currentSectionTotal: number;
  };
}
