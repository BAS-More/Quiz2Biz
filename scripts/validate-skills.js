#!/usr/bin/env node
/**
 * validate-skills.js
 * Validates all SKILL.md files referenced in CLAUDE.md and .qoder/rules/*.md files.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');

let passed = 0;
let failed = 0;
const results = [];

function pass(name, detail) {
  passed++;
  results.push({ status: 'PASS', name, detail });
}

function fail(name, detail) {
  failed++;
  results.push({ status: 'FAIL', name, detail });
}

function report() {
  console.log('\n=== Skill Validation Report ===\n');
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${r.name} — ${r.detail}`);
  }
  console.log(
    `\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`,
  );
  if (failed > 0) {
    process.exit(1);
  }
}

// 1. Check CLAUDE.md exists
if (!fs.existsSync(CLAUDE_MD)) {
  fail('CLAUDE.md', 'File does not exist');
  report();
  process.exit(1);
}
pass('CLAUDE.md exists', CLAUDE_MD);

const claudeContent = fs.readFileSync(CLAUDE_MD, 'utf-8');

// 2. Extract referenced SKILL.md files from CLAUDE.md
const skillPattern = /`([^`]*SKILL[^`]*\.md)`/g;
const skillRefs = new Set();
let match;
while ((match = skillPattern.exec(claudeContent)) !== null) {
  skillRefs.add(match[1]);
}

// 3. Validate each referenced SKILL.md file
for (const ref of skillRefs) {
  const fullPath = path.join(ROOT, ref);
  if (!fs.existsSync(fullPath)) {
    fail(`SKILL ref: ${ref}`, 'Referenced file does not exist');
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8').trim();
  if (content.length === 0) {
    fail(`SKILL ref: ${ref}`, 'File is empty');
    continue;
  }

  if (!/^#/m.test(content)) {
    fail(`SKILL ref: ${ref}`, 'File has no markdown headings');
    continue;
  }

  pass(`SKILL ref: ${ref}`, `${content.split('\n').length} lines`);
}

// 4. Validate .qoder/rules/*.md files
const rulesDir = path.join(ROOT, '.qoder', 'rules');
if (fs.existsSync(rulesDir)) {
  const ruleFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));

  if (ruleFiles.length === 0) {
    fail('.qoder/rules/', 'No .md files found');
  }

  for (const file of ruleFiles) {
    const fullPath = path.join(rulesDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8').trim();

    if (content.length === 0) {
      fail(`Rule: ${file}`, 'File is empty');
      continue;
    }

    if (!/^#/m.test(content)) {
      fail(`Rule: ${file}`, 'File has no markdown headings');
      continue;
    }

    pass(`Rule: ${file}`, `${content.split('\n').length} lines`);
  }
} else {
  pass('.qoder/rules/', 'Directory not found (optional)');
}

// 5. Check CLAUDE.md has required sections
const requiredSections = [
  'Claude Developer Platform',
  'Mandatory Skills',
  'Pre-Flight Validation',
  'Operational Rules',
];

for (const section of requiredSections) {
  if (new RegExp(`## ${section}`, 'i').test(claudeContent)) {
    pass(`Section: ${section}`, 'Present in CLAUDE.md');
  } else {
    fail(`Section: ${section}`, 'Missing from CLAUDE.md');
  }
}

report();