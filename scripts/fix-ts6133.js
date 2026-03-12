/**
 * Automated TS6133 fixer for test files.
 * TypeScript noUnusedLocals doesn't honor _ prefix, so we must REMOVE unused vars.
 * 
 * Patterns handled:
 *   1. Unused imports → remove from import statement
 *   2. Unused `let varName` (module-level) → remove decl + change assignment to bare call
 *   3. Unused `const result = expr` → change to just `expr`
 *   4. Unused destructured → remove from destructuring
 */
const fs = require('fs');
const path = require('path');

const errorFile = path.join(__dirname, '..', 'ts6133-fresh.txt');
const raw = fs.readFileSync(errorFile, 'utf8');
const errors = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
        const m = line.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read/);
        if (!m) return null;
        return { file: m[1], line: parseInt(m[2]), col: parseInt(m[3]), name: m[4] };
    })
    .filter(Boolean);

const byFile = {};
for (const e of errors) {
    if (!byFile[e.file]) byFile[e.file] = [];
    byFile[e.file].push(e);
}

const apiDir = path.join(__dirname, '..', 'apps', 'api');
let totalFixed = 0;
let totalManual = 0;
const manualList = [];

for (const [relFile, fileErrors] of Object.entries(byFile)) {
    const absPath = path.join(apiDir, relFile);
    if (!fs.existsSync(absPath)) {
        console.log(`SKIP (not found): ${relFile}`);
        continue;
    }

    let content = fs.readFileSync(absPath, 'utf8');
    let lines = content.split('\n');
    let modified = false;
    const linesToRemove = new Set();

    // Sort errors by line number descending to process from bottom up
    const sorted = [...fileErrors].sort((a, b) => b.line - a.line);

    for (const err of sorted) {
        const lineIdx = err.line - 1;
        if (lineIdx >= lines.length) continue;

        const line = lines[lineIdx];
        const varName = err.name;

        // PATTERN 1: Unused import
        if (isImportLine(lines, lineIdx, varName)) {
            const removed = removeFromImport(lines, lineIdx, varName);
            if (removed) {
                modified = true;
                totalFixed++;
                continue;
            }
        }

        // PATTERN 2: `let varName` or `let _varName` (module-level test setup variable)
        const letMatch = line.match(new RegExp(`\\blet\\s+${esc(varName)}\\b`));
        if (letMatch) {
            // Remove the declaration line
            linesToRemove.add(lineIdx);
            // Find and fix all assignments: `varName = ...` → just the RHS expression
            removeAssignments(lines, varName, lineIdx, linesToRemove);
            modified = true;
            totalFixed++;
            continue;
        }

        // PATTERN 3: `const varName = expr` (local, not import)
        const constMatch = line.match(new RegExp(`\\bconst\\s+${esc(varName)}\\s*=\\s*`));
        if (constMatch && !line.includes('import')) {
            // Replace `const varName = expr;` with just `expr;`
            const newLine = line.replace(
                new RegExp(`\\bconst\\s+${esc(varName)}\\s*=\\s*`),
                line.match(/^\s*/)[0] // keep indentation
            );
            // If the RHS is just a value literal (not a function call), remove the whole line
            const rhs = newLine.trim();
            if (rhs === '' || rhs === ';') {
                linesToRemove.add(lineIdx);
            } else if (isSideEffectFree(rhs)) {
                // Pure value like `Date.now`, `'string'`, `{ ... }` - remove entire line
                linesToRemove.add(lineIdx);
            } else {
                lines[lineIdx] = newLine;
            }
            modified = true;
            totalFixed++;
            continue;
        }

        // PATTERN 4: Destructured variable `{ ..., varName, ... }` or `{ ..., varName: alias, ... }`
        // Also handles for...of destructuring
        if (isDestructured(line, varName)) {
            const fixed = removeFromDestructuring(lines, lineIdx, varName);
            if (fixed) {
                modified = true;
                totalFixed++;
                continue;
            }
        }

        // Unhandled
        totalManual++;
        manualList.push(`${relFile}:${err.line} - '${varName}' - ${line.trim().substring(0, 100)}`);
    }

    // Remove marked lines (bottom-up to preserve indices)
    const sortedRemoves = [...linesToRemove].sort((a, b) => b - a);
    for (const idx of sortedRemoves) {
        lines.splice(idx, 1);
    }

    if (modified) {
        // Clean up double blank lines
        let result = lines.join('\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFileSync(absPath, result, 'utf8');
        console.log(`FIXED: ${relFile} (${fileErrors.length} errors)`);
    }
}

console.log(`\nTotal fixed: ${totalFixed} / ${errors.length}`);
if (manualList.length > 0) {
    console.log(`\nMANUAL fixes needed (${manualList.length}):`);
    for (const m of manualList) {
        console.log(`  ${m}`);
    }
}

// --- Helper functions ---

function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isImportLine(lines, lineIdx, varName) {
    const line = lines[lineIdx];
    // Check if this line is part of an import statement
    if (line.match(/^\s*import\s/)) return true;
    // Walk up to find the import keyword (for multi-line imports)
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 30); i--) {
        if (lines[i].match(/^\s*import\s/)) return true;
        if (lines[i].includes('} from ')) {
            return i === lineIdx; // only if we're on the closing line
        }
        if (i < lineIdx && lines[i].trim() !== '' &&
            !lines[i].trim().match(/^[A-Za-z_]\w*,?\s*$/) &&
            !lines[i].trim().startsWith('//')) {
            break;
        }
    }
    return false;
}

function removeFromImport(lines, lineIdx, varName) {
    // Find the full import statement (may span multiple lines)
    let importStart = lineIdx;
    for (let i = lineIdx; i >= Math.max(0, lineIdx - 30); i--) {
        if (lines[i].match(/^\s*import\s/)) {
            importStart = i;
            break;
        }
    }
    let importEnd = lineIdx;
    for (let i = lineIdx; i < Math.min(lines.length, lineIdx + 30); i++) {
        if (lines[i].includes(' from ') || lines[i].includes("from '") || lines[i].includes('from "')) {
            importEnd = i;
            break;
        }
    }

    // Get the full import text
    const fullImport = lines.slice(importStart, importEnd + 1).join('\n');

    // Try to remove the variable from the import
    const patterns = [
        new RegExp(`\\b${esc(varName)}\\s*,\\s*`, 'g'),  // `VarName, `
        new RegExp(`\\s*,\\s*${esc(varName)}\\b`, 'g'),   // `, VarName`
        new RegExp(`\\b${esc(varName)}\\b`, 'g'),          // Only name in import
    ];

    let newImport = fullImport;
    for (const p of patterns) {
        if (p.test(newImport)) {
            newImport = newImport.replace(p, '');
            break;
        }
    }

    if (newImport === fullImport) return false;

    // Check if the import is now empty: `import {  } from '...'`
    if (newImport.match(/import\s*\{\s*\}\s*from/)) {
        // Remove entire import
        for (let i = importStart; i <= importEnd; i++) {
            lines[i] = '';
        }
    } else {
        // Replace the import lines
        const newLines = newImport.split('\n');
        for (let i = importStart; i <= importEnd; i++) {
            const idx = i - importStart;
            lines[i] = idx < newLines.length ? newLines[idx] : '';
        }
    }
    return true;
}

function removeAssignments(lines, varName, declLine, linesToRemove) {
    // Find assignments like `varName = ...` or `_varName = ...` (if already prefixed)
    const possibleNames = [varName];
    // Also check for _-prefixed version (from prior session fixes)
    if (varName.startsWith('_')) {
        possibleNames.push(varName.substring(1)); // search for unprefixed too
    }

    for (let i = declLine + 1; i < lines.length; i++) {
        for (const name of possibleNames) {
            const assignPattern = new RegExp(`^(\\s+)${esc(name)}\\s*=\\s*(.+)$`);
            const m = lines[i].match(assignPattern);
            if (m) {
                const indent = m[1];
                const rhs = m[2].trim();
                // Replace assignment with just the RHS (the function call)
                if (rhs.includes('module.get') || rhs.includes('.get(') || rhs.includes('new ')) {
                    lines[i] = `${indent}${rhs}`;
                } else if (isSideEffectFree(rhs)) {
                    linesToRemove.add(i);
                } else {
                    lines[i] = `${indent}${rhs}`;
                }
            }
        }
    }
}

function isSideEffectFree(expr) {
    const s = expr.replace(/;$/, '').trim();
    // String/number literals, property access, object literals, etc.
    if (/^['"`]/.test(s)) return true;
    if (/^\d/.test(s)) return true;
    if (/^(true|false|null|undefined)$/.test(s)) return true;
    if (/^(Date\.now|process\.memoryUsage|Math\.\w+)$/.test(s)) return true;
    if (/^\{.*\}$/.test(s) && !s.includes('=>') && !s.includes('function')) return true;
    if (/^\[.*\]$/.test(s) && !s.includes('=>')) return true;
    return false;
}

function isDestructured(line, varName) {
    return line.includes('{') && line.includes(varName) &&
        (line.includes('const {') || line.includes('let {') || line.includes('const{') ||
            line.includes('for ') || line.includes('for('));
}

function removeFromDestructuring(lines, lineIdx, varName) {
    const line = lines[lineIdx];

    // Try to remove from destructuring: `{ a, varName, b }` → `{ a, b }`
    const patterns = [
        new RegExp(`\\b${esc(varName)}\\s*,\\s*`),    // `varName, `
        new RegExp(`\\s*,\\s*${esc(varName)}\\b`),     // `, varName`
        new RegExp(`\\b${esc(varName)}\\b`),            // only name
    ];

    for (const p of patterns) {
        if (p.test(line)) {
            const newLine = line.replace(p, '');
            // Check we didn't break the destructuring
            if (newLine.includes('{') && newLine.includes('}')) {
                lines[lineIdx] = newLine;
                return true;
            } else if (!newLine.includes('{')) {
                // The destructuring might be multi-line
                lines[lineIdx] = newLine;
                return true;
            }
        }
    }
    return false;
}
