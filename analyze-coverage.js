const data = JSON.parse(require('fs').readFileSync('apps/api/coverage/coverage-summary.json', 'utf8'));
const files = [];
for (const file in data) {
  if (file === 'total') continue;
  const m = data[file];
  const parts = file.split('src');
  let sf = parts.length > 1 ? parts.slice(1).join('src') : file;
  while (sf[0] === '/' || sf[0] === String.fromCharCode(92)) sf = sf.slice(1);
  files.push({
    file: sf,
    lines: m.lines.pct,
    branches: m.branches.pct,
    functions: m.functions.pct,
    statements: m.statements.pct,
    ul: m.lines.total - m.lines.covered,
    ub: m.branches.total - m.branches.covered,
    uf: m.functions.total - m.functions.covered,
    totalLines: m.lines.total,
    totalBranches: m.branches.total,
    totalFunctions: m.functions.total
  });
}

// Show only files below 95% on any metric
const below95 = files.filter(f => f.lines < 95 || f.branches < 95 || f.functions < 95 || f.statements < 95);
below95.sort((a, b) => b.ul - a.ul);
console.log('=== FILES BELOW 95% ON ANY METRIC ===');
for (const f of below95) {
  console.log(`${f.file} | L:${f.lines}% B:${f.branches}% F:${f.functions}% S:${f.statements}% | UL:${f.ul} UB:${f.ub} UF:${f.uf}`);
}
console.log('');
console.log('Total files below 95%:', below95.length);
console.log('Remaining uncovered lines:', below95.reduce((s, f) => s + f.ul, 0));
console.log('Remaining uncovered branches:', below95.reduce((s, f) => s + f.ub, 0));
console.log('Remaining uncovered functions:', below95.reduce((s, f) => s + f.uf, 0));
