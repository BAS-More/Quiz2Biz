/**
 * Offline Command
 *
 * Work with local JSON files for offline mode
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { Config, type OfflineSessionData } from '../lib/config';
import { ApiClient } from '../lib/api-client';

export const offlineCommand = new Command('offline').description('Offline mode operations');

offlineCommand
  .command('sync <sessionId>')
  .description('Download session data for offline use')
  .option('-o, --output <file>', 'Output file path')
  .action(async (sessionId: string, options) => {
    const config = new Config();
    const spinner = ora('Syncing session data...').start();

    try {
      const client = new ApiClient(config);

      // Fetch all session data
      const [score, heatmap, questions] = await Promise.all([
        client.getScore(sessionId),
        client.getHeatmap(sessionId),
        client.getNextQuestions(sessionId, { count: 100 }),
      ]);

      const offlineData: OfflineSessionData = {
        sessionId,
        syncedAt: new Date().toISOString(),
        score,
        heatmap,
        questions: questions.questions,
      };

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(offlineData, null, 2));
        spinner.succeed(`Synced to: ${path.resolve(options.output)}`);
      } else {
        config.setOfflineData(sessionId, offlineData);
        spinner.succeed('Session data synced to local storage');
      }
    } catch (error) {
      spinner.fail('Failed to sync session data');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

offlineCommand
  .command('import <file>')
  .description('Import session data from JSON file')
  .action(async (file: string) => {
    const config = new Config();

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content) as OfflineSessionData;

      if (!data.sessionId) {
        console.error(chalk.red('Invalid offline data file: missing sessionId'));
        process.exit(1);
      }

      config.setOfflineData(data.sessionId, data);
      console.log(chalk.green(`✅ Imported session: ${data.sessionId}`));
    } catch (error) {
      console.error(
        chalk.red(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });

offlineCommand
  .command('export <sessionId>')
  .description('Export offline session data to JSON file')
  .option('-o, --output <file>', 'Output file path')
  .action((sessionId: string, options) => {
    const config = new Config();
    const data = config.getOfflineData(sessionId);

    if (!data) {
      console.error(chalk.red(`No offline data found for session: ${sessionId}`));
      process.exit(1);
    }

    const outputPath = options.output || `quiz2biz-offline-${sessionId.substring(0, 8)}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(chalk.green(`✅ Exported to: ${path.resolve(outputPath)}`));
  });

offlineCommand
  .command('list')
  .description('List all offline sessions')
  .action(() => {
    const config = new Config();
    const sessions = config.listOfflineSessions();

    console.log(chalk.bold('Offline Sessions'));
    console.log(chalk.gray('─'.repeat(40)));

    if (sessions.length === 0) {
      console.log(chalk.gray('No offline sessions stored'));
      return;
    }

    sessions.forEach((session) => {
      console.log(`${chalk.cyan(session.sessionId)}`);
      console.log(`  Synced: ${session.syncedAt}`);
      console.log(`  Score: ${(session.score.overallScore * 100).toFixed(1)}%`);
      console.log('');
    });
  });

offlineCommand
  .command('clear [sessionId]')
  .description('Clear offline data (all or specific session)')
  .action((sessionId?: string) => {
    const config = new Config();

    if (sessionId) {
      config.clearOfflineData(sessionId);
      console.log(chalk.green(`✅ Cleared offline data for: ${sessionId}`));
    } else {
      config.clearAllOfflineData();
      console.log(chalk.green('✅ Cleared all offline data'));
    }
  });
