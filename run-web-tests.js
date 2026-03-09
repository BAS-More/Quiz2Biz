const { execSync } = require('child_process');
const fs = require('fs');

try {
  const out = execSync('npx vitest run --pool.forks.singleFork=false --reporter=verbose --no-color', {
    cwd: 'c:\\Repos\\Quiz-to-Build\\apps\\web',
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  });
  fs.writeFileSync('c:\\Repos\\Quiz-to-Build\\vt-result.txt', out.toString());
} catch (e) {
  const output = (e.stdout ? e.stdout.toString() : '') + '\n---STDERR---\n' + (e.stderr ? e.stderr.toString() : '');
  fs.writeFileSync('c:\\Repos\\Quiz-to-Build\\vt-result.txt', output);
}
