/**
 * Automated TS2339 fixer: wraps Prisma mock method calls with (... as jest.Mock)
 * 
 * Pattern: `prisma.model.method.mockResolvedValue(...)` 
 * Fix:     `(prisma.model.method as jest.Mock).mockResolvedValue(...)`
 */
const fs = require('fs');
const path = require('path');

const errorFile = path.join(__dirname, '..', 'ts2339-errors.txt');
const raw = fs.readFileSync(errorFile, 'utf8');
const errors = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
        const m = line.match(/^(.+?)\((\d+),(\d+)\): error TS2339: Property '(.+?)' does not exist/);
        if (!m) return null;
        return { file: m[1], line: parseInt(m[2]), col: parseInt(m[3]), prop: m[4] };
    })
    .filter(Boolean);

const byFile = {};
for (const e of errors) {
    if (!byFile[e.file]) byFile[e.file] = [];
    byFile[e.file].push(e);
}

const apiDir = path.join(__dirname, '..', 'apps', 'api');
let totalFixed = 0;
const manualList = [];

for (const [relFile, fileErrors] of Object.entries(byFile)) {
    const absPath = path.join(apiDir, relFile);
    if (!fs.existsSync(absPath)) {
        console.log(`SKIP (not found): ${relFile}`);
        continue;
    }

    let content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Sort errors by line number descending to avoid offset issues  
    const sorted = [...fileErrors].sort((a, b) => b.line - a.line);

    for (const err of sorted) {
        const lineIdx = err.line - 1;
        if (lineIdx >= lines.length) continue;

        const line = lines[lineIdx];
        const prop = err.prop; // e.g., 'mockResolvedValue', 'mockRejectedValue', 'mock'
        const col = err.col - 1; // 0-based column

        // Find the property access: everything before `.prop` at the error column
        // The col points to the property name after the dot
        // We need to find the start of the chain: `something.model.method`
        const beforeProp = line.substring(0, col - 1); // -1 for the dot

        // Find the chain start: walk back from col to find the beginning of the expression
        // The chain looks like: prismaService.model.method or mockPrismaService.model.method
        // We need to wrap just the chain part: (chain as jest.Mock).prop(...)

        // Strategy: use regex to find the chain ending at col-1
        // Match: word.word.word pattern ending right before the dot
        const chainMatch = beforeProp.match(/(\w+(?:\.\w+)+)\s*$/);
        if (!chainMatch) {
            manualList.push(`${relFile}:${err.line} - .${prop} - no chain match: ${line.trim().substring(0, 100)}`);
            continue;
        }

        const chain = chainMatch[1];
        const chainStart = beforeProp.lastIndexOf(chain);
        const chainEnd = chainStart + chain.length;

        // Build the new line:
        // before_chain + (chain as jest.Mock) + .prop + rest
        const prefix = line.substring(0, chainStart);
        const suffix = line.substring(col - 1); // from the dot onward: .mockResolvedValue(...)

        const newLine = `${prefix}(${chain} as jest.Mock)${suffix}`;
        lines[lineIdx] = newLine;
        modified = true;
        totalFixed++;
    }

    if (modified) {
        fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
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
