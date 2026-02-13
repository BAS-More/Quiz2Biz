#!/usr/bin/env node
/**
 * Quiz2Biz CLI Tool
 *
 * Command-line interface for Quiz2Biz readiness assessments:
 * - readiness score: Check current readiness score
 * - nqs suggest: Get next question suggestions
 * - heatmap export: Export heatmap as CSV/Markdown
 * - offline: Work with local JSON files
 */

import { Command } from 'commander';
import { scoreCommand } from './commands/score';
import { nqsCommand } from './commands/nqs';
import { heatmapCommand } from './commands/heatmap';
import { configCommand } from './commands/config';
import { offlineCommand } from './commands/offline';

const program = new Command();

program.name('quiz2biz').description('Quiz2Biz Readiness Assessment CLI Tool').version('1.0.0');

// Register commands
program.addCommand(scoreCommand);
program.addCommand(nqsCommand);
program.addCommand(heatmapCommand);
program.addCommand(configCommand);
program.addCommand(offlineCommand);

program.parse(process.argv);
