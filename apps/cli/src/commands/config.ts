/**
 * Config Command
 *
 * Manages CLI configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Config } from '../lib/config';

export const configCommand = new Command('config').description('Manage CLI configuration');

const VALID_KEYS = ['apiUrl', 'apiToken', 'defaultSession'] as const;

function isValidConfigKey(key: string): key is 'apiUrl' | 'apiToken' | 'defaultSession' {
  return VALID_KEYS.includes(key as any);
}

configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key: string, value: string) => {
    if (!isValidConfigKey(key)) {
      console.log(chalk.red(`❌ Invalid config key: ${key}`));
      console.log(chalk.gray(`Valid keys: ${VALID_KEYS.join(', ')}`));
      return;
    }
    const config = new Config();
    config.set(key, value);
    console.log(chalk.green(`✅ Set ${key} = ${value}`));
  });

configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .action((key: string) => {
    if (!isValidConfigKey(key)) {
      console.log(chalk.red(`❌ Invalid config key: ${key}`));
      console.log(chalk.gray(`Valid keys: ${VALID_KEYS.join(', ')}`));
      return;
    }
    const config = new Config();
    const value = config.get(key);
    if (value !== undefined) {
      console.log(value);
    } else {
      console.log(chalk.gray('(not set)'));
    }
  });

configCommand
  .command('list')
  .description('List all configuration values')
  .action(() => {
    const config = new Config();
    const all = config.getAll();

    console.log(chalk.bold('Quiz2Biz CLI Configuration'));
    console.log(chalk.gray('─'.repeat(40)));

    Object.entries(all).forEach(([key, value]) => {
      if (key !== 'offlineData') {
        console.log(`${chalk.cyan(key)}: ${String(value)}`);
      }
    });
  });

configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .action(() => {
    const config = new Config();
    config.reset();
    console.log(chalk.green('✅ Configuration reset to defaults'));
  });

configCommand
  .command('path')
  .description('Show configuration file path')
  .action(() => {
    const config = new Config();
    console.log(config.getPath());
  });
