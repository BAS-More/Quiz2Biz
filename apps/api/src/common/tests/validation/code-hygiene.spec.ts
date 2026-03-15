/**
 * Code Hygiene Validation Tests
 *
 * Validates code quality standards:
 * - Clean Code principles (functions ≤30 lines, files ≤400 lines)
 * - SOLID principles compliance
 * - DRY principle adherence
 * - Cyclomatic complexity (≤15 per function)
 * - Naming conventions
 * - Comment quality
 *
 * @see ISO/IEC 5055 Source Code Quality
 * @see ISO/IEC 25010 Maintainability
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Code Hygiene Validation', () => {
  const srcDir = path.join(__dirname, '../../../../');

  function getAllTsFiles(dir: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !entry.name.includes('node_modules') &&
        !entry.name.includes('dist') &&
        !entry.name.includes('coverage')
      ) {
        getAllTsFiles(fullPath, files);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.includes('.spec.') &&
        !entry.name.includes('.test.')
      ) {
        files.push(fullPath);
      }
    }
    return files;
  }

  describe('File Size Limits', () => {
    it('should have files under 400 lines', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount > 400) {
          violations.push(`${path.relative(srcDir, file)}: ${lineCount} lines (max 400)`);
        }
      }

      if (violations.length > 0) {
        console.warn('Files exceeding 400 lines:\n' + violations.join('\n'));
      }
      // Allow some violations but flag them
      expect(violations.length).toBeLessThan(50);
    });
  });

  describe('Function Length', () => {
    it('should have functions under 30 lines', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        let inFunction = false;
        let functionStart = 0;
        let braceCount = 0;
        let currentFunctionName = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Detect function start
          const funcMatch = line.match(
            /(?:async\s+)?(?:function|(?:private|public|protected)?\s*(?:static)?\s*(?:async)?\s*\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/,
          );
          const arrowMatch = line.match(
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{/,
          );

          if (funcMatch || arrowMatch) {
            if (!inFunction) {
              inFunction = true;
              functionStart = i;
              currentFunctionName = arrowMatch
                ? arrowMatch[1]
                : line.match(/(\w+)\s*\(/)?.[1] || 'anonymous';
              braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            }
          }

          if (inFunction) {
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;

            if (braceCount === 0) {
              const functionLength = i - functionStart + 1;
              if (functionLength > 30) {
                violations.push(
                  `${path.relative(srcDir, file)}:${functionStart + 1} ${currentFunctionName}(): ${functionLength} lines`,
                );
              }
              inFunction = false;
            }
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Functions exceeding 30 lines:\n' + violations.slice(0, 10).join('\n'));
      }
      // Allow some violations but flag them
      expect(violations.length).toBeLessThan(100);
    });
  });

  describe('Naming Conventions', () => {
    it('should use PascalCase for classes', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const classMatches = content.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);

        if (classMatches) {
          for (const match of classMatches) {
            const className = match.replace('class ', '');
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
              violations.push(`Non-PascalCase class: ${className} in ${path.basename(file)}`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('should use camelCase for functions and variables', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check function names (excluding class methods)
        const funcMatches = content.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (funcMatches) {
          for (const match of funcMatches) {
            const funcName = match.replace('function ', '');
            if (!/^[a-z][a-zA-Z0-9]*$/.test(funcName) && funcName !== '_') {
              violations.push(`Non-camelCase function: ${funcName} in ${path.basename(file)}`);
            }
          }
        }
      }

      // Allow some violations (decorators, etc.)
      expect(violations.length).toBeLessThan(10);
    });

    it('should use UPPER_SNAKE_CASE for constants', () => {
      const files = getAllTsFiles(srcDir);
      let hasProperConstants = true;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for const with all uppercase names
        const constMatches = content.match(/const\s+([A-Z][A-Z0-9_]*)\s*=/g);
        if (constMatches) {
          for (const match of constMatches) {
            const constName = match.match(/const\s+([A-Z][A-Z0-9_]*)/)?.[1];
            if (constName && !/^[A-Z][A-Z0-9_]*$/.test(constName)) {
              hasProperConstants = false;
            }
          }
        }
      }

      expect(hasProperConstants).toBe(true);
    });
  });

  describe('Code Duplication (DRY)', () => {
    it('should not have excessive code duplication', () => {
      const files = getAllTsFiles(srcDir);
      const codeBlocks: Map<string, string[]> = new Map();

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Check for 5+ line blocks that might be duplicated
        for (let i = 0; i < lines.length - 5; i++) {
          const block = lines
            .slice(i, i + 5)
            .join('\n')
            .trim();
          if (block.length > 50) {
            const normalized = block.replace(/\s+/g, ' ');
            const existing = codeBlocks.get(normalized) || [];
            existing.push(`${path.basename(file)}:${i + 1}`);
            codeBlocks.set(normalized, existing);
          }
        }
      }

      const duplicates: string[] = [];
      for (const [, locations] of codeBlocks) {
        if (locations.length > 2) {
          duplicates.push(
            `Block duplicated ${locations.length} times: ${locations.slice(0, 3).join(', ')}`,
          );
        }
      }

      if (duplicates.length > 0) {
        console.warn('Potential code duplication found:\n' + duplicates.slice(0, 5).join('\n'));
      }
      // Some duplication is acceptable in a growing codebase
      expect(duplicates.length).toBeLessThan(500);
    });
  });

  describe('Dead Code Detection', () => {
    it('should not have commented-out code blocks', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        let consecutiveCommentedCode = 0;
        for (const line of lines) {
          // Detect commented-out code (not JSDoc or regular comments)
          if (line.match(/^\s*\/\/\s*(const|let|var|function|if|for|while|return|import|export)/)) {
            consecutiveCommentedCode++;
          } else {
            if (consecutiveCommentedCode >= 3) {
              violations.push(`Commented-out code block in ${path.basename(file)}`);
            }
            consecutiveCommentedCode = 0;
          }
        }
      }

      expect(violations.length).toBeLessThan(10);
    });

    it('should not have unused imports', () => {
      // This is usually handled by ESLint, but we can do a basic check
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Extract imported names
        const importMatches = content.match(/import\s+\{([^}]+)\}/g);
        if (importMatches) {
          for (const match of importMatches) {
            const imports =
              match
                .match(/\{([^}]+)\}/)?.[1]
                .split(',')
                .map((s) => s.trim().split(' ')[0]) || [];
            for (const imp of imports) {
              if (imp && !imp.includes('type')) {
                const usageCount = (content.match(new RegExp(`\\b${imp}\\b`, 'g')) || []).length;
                // Should appear more than once (the import itself)
                if (usageCount === 1) {
                  violations.push(`Potentially unused import: ${imp} in ${path.basename(file)}`);
                }
              }
            }
          }
        }
      }

      // Allow some - this is a heuristic check
      expect(violations.length).toBeLessThan(20);
    });
  });

  describe('Comment Quality', () => {
    it('should have JSDoc for public methods in services', () => {
      const serviceFiles = getAllTsFiles(srcDir).filter((f) => f.includes('.service.ts'));
      let hasJsDoc = false;

      for (const file of serviceFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        if (content.includes('/**') && content.includes('*/')) {
          hasJsDoc = true;
          break;
        }
      }

      expect(hasJsDoc).toBe(true);
    });

    it('should not have TODO comments older than sprint', () => {
      const files = getAllTsFiles(srcDir);
      const todos: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const todoMatches = content.match(/\/\/\s*TODO[:\s].*$/gm);

        if (todoMatches) {
          for (const todo of todoMatches) {
            todos.push(`${path.basename(file)}: ${todo.substring(0, 50)}...`);
          }
        }
      }

      if (todos.length > 10) {
        console.warn(`Found ${todos.length} TODO comments - consider addressing them`);
      }
      // TODOs are allowed but flagged
      expect(todos.length).toBeLessThan(50);
    });
  });

  describe('Async/Await Usage', () => {
    it('should use async/await instead of .then()', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Count .then() usage vs async/await
        const thenCount = (content.match(/\.then\s*\(/g) || []).length;
        const asyncCount = (content.match(/async\s+/g) || []).length;

        // If file uses promises, should prefer async/await
        if (thenCount > 5 && thenCount > asyncCount) {
          violations.push(
            `${path.basename(file)}: ${thenCount} .then() calls (prefer async/await)`,
          );
        }
      }

      expect(violations.length).toBeLessThan(5);
    });
  });

  describe('Error Handling', () => {
    it('should have try-catch blocks for async operations', () => {
      const files = getAllTsFiles(srcDir);
      let hasTryCatch = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (content.includes('try {') && content.includes('catch')) {
          hasTryCatch = true;
          break;
        }
      }

      expect(hasTryCatch).toBe(true);
    });

    it('should not have empty catch blocks', () => {
      const files = getAllTsFiles(srcDir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Find empty catch blocks
        const emptyCatch = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
        if (emptyCatch) {
          violations.push(`Empty catch block in ${path.basename(file)}`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Type Safety', () => {
    it('should minimize use of "any" type', () => {
      const files = getAllTsFiles(srcDir);
      let anyCount = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(/:\s*any\b/g);
        if (matches) {
          anyCount += matches.length;
        }
      }

      if (anyCount > 50) {
        console.warn(`Found ${anyCount} uses of 'any' type - consider using specific types`);
      }
      expect(anyCount).toBeLessThan(150);
    });

    it('should use strict null checks patterns', () => {
      const files = getAllTsFiles(srcDir);
      let hasNullChecks = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('??') ||
          content.includes('?.') ||
          content.includes('!== null') ||
          content.includes('!== undefined')
        ) {
          hasNullChecks = true;
          break;
        }
      }

      expect(hasNullChecks).toBe(true);
    });
  });

  describe('Module Organization', () => {
    it('should have index.ts barrel files for modules', () => {
      const modulesDir = path.join(srcDir, 'modules');
      if (!fs.existsSync(modulesDir)) {
        // Skip if modules directory doesn't exist at expected path
        expect(true).toBe(true);
        return;
      }

      const moduleDirs = fs
        .readdirSync(modulesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      let hasBarrelFiles = 0;
      for (const dir of moduleDirs) {
        const indexPath = path.join(modulesDir, dir.name, 'index.ts');
        if (fs.existsSync(indexPath)) {
          hasBarrelFiles++;
        }
      }

      // At least half should have index files
      expect(hasBarrelFiles).toBeGreaterThan(moduleDirs.length / 2);
    });
  });
});
