#!/usr/bin/env node
"use strict";
/**
 * Quiz2Biz CLI Tool
 *
 * Command-line interface for Quiz2Biz readiness assessments:
 * - readiness score: Check current readiness score
 * - nqs suggest: Get next question suggestions
 * - heatmap export: Export heatmap as CSV/Markdown
 * - offline: Work with local JSON files
 */
Object.defineProperty(exports, "__esModule", { value: true });
var commander_1 = require("commander");
var score_1 = require("./commands/score");
var nqs_1 = require("./commands/nqs");
var heatmap_1 = require("./commands/heatmap");
var config_1 = require("./commands/config");
var offline_1 = require("./commands/offline");
var program = new commander_1.Command();
program.name('quiz2biz').description('Quiz2Biz Readiness Assessment CLI Tool').version('1.0.0');
// Register commands
program.addCommand(score_1.scoreCommand);
program.addCommand(nqs_1.nqsCommand);
program.addCommand(heatmap_1.heatmapCommand);
program.addCommand(config_1.configCommand);
program.addCommand(offline_1.offlineCommand);
program.parse(process.argv);
