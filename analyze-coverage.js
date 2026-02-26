const data = JSON.parse(require('fs').readFileSync('apps/api/coverage/coverage-summary.json', 'utf8'));
const files = [];
for (const file in data) {
  if (file === 'total') continue;
  const m = data[file];
  const parts = file.split('src');
  let sf = parts.length > 1 ? parts.slice(1).join('src') : file;
  if (sf[0] === '/' || sf[0] === '\\') sf = sf.slice(1);
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
files.sort((a, b) => b.ul - a.ul);
console.log('=== TOP 50 FILES BY UNCOVERED LINES ===');
for (let i = 0; i < Math.min(50, files.length); i++) {
  const f = files[i];
  console.log(`${f.file} | L:${f.lines}% B:${f.branches}% F:${f.functions}% | UL:${f.ul} UB:${f.ub} UF:${f.uf}`);
}
console.log('');
console.log('=== FILES WITH 0% LINE COVERAGE ===');
files.filter(f => f.lines === 0).forEach(f => {
  console.log(`${f.file} | totalLines:${f.totalLines}`);
});
console.log('');
let z = 0, u50 = 0, u80 = 0, u95 = 0, tul = 0, tub = 0, tuf = 0;
for (const f of files) {
  if (f.lines === 0) z++;
  if (f.lines < 50) u50++;
  if (f.lines < 80) u80++;
  if (f.lines < 95) u95++;
  tul += f.ul; tub += f.ub; tuf += f.uf;
}
console.log('=== SUMMARY ===');
console.log('Total files:', files.length);
console.log('Files 0%:', z);
console.log('Files <50%:', u50);
console.log('Files <80%:', u80);
console.log('Files <95%:', u95);
console.log('Files >=95%:', files.length - u95);
console.log('Total uncovered lines:', tul);
console.log('Total uncovered branches:', tub);
console.log('Total uncovered functions:', tuf);

// Now show files sorted by branches (worst first)
console.log('');
console.log('=== TOP 30 FILES BY UNCOVERED BRANCHES ===');
files.sort((a, b) => b.ub - a.ub);
for (let i = 0; i < Math.min(30, files.length); i++) {
  const f = files[i];
  console.log(`${f.file} | B:${f.branches}% | UB:${f.ub}/${f.totalBranches}`);
}
