import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Relaxed rules shared across API, CLI, prisma, and test overrides
const relaxedTypeCheckRules = {
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/no-unsafe-enum-comparison': 'off',
};

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'apps/web/**', '**/*.js', '**/*.mjs', 'apps/api/src/modules/document-commerce/**', 'apps/api/test/integration/**'],
  },

  // Base config for all TS files
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierConfig,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'no-case-declarations': 'off',

      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],

      // Complexity enforcement (ISO/IEC 5055 compliance)
      'complexity': ['error', { max: 15 }],  // Cyclomatic complexity
      'max-depth': ['warn', { max: 4 }],    // Max nesting depth
      'max-lines-per-function': ['warn', { max: 75, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', { max: 4 }],   // Max function parameters

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'method', format: ['camelCase', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
    },
  },

  // Test files - relaxed rules
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/e2e/**/*.ts', '**/tests/**/*.ts', '**/__tests__/**/*.ts'],
    rules: {
      ...relaxedTypeCheckRules,
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/await-thenable': 'off',
      'no-console': 'off',
      'no-duplicate-imports': 'off',
      'max-lines-per-function': 'off',  // Test files are legitimately large
      'complexity': 'off',              // Test setup can be complex
    },
  },

  // Prisma seed files - relaxed rules
  {
    files: ['prisma/**/*.ts'],
    rules: {
      ...relaxedTypeCheckRules,
      'no-console': 'off',
    },
  },

  // API - targeted relaxations (type-safety rules restored to base config warn level)
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // Keep only rules that are legitimately needed for NestJS patterns
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-require-imports': 'off', // Dynamic require for legacy modules
      'no-console': 'off',
      'no-duplicate-imports': 'off',
      'no-constant-condition': 'off',
      'no-useless-assignment': 'off',
    },
  },

  // CLI - relaxed rules
  {
    files: ['apps/cli/**/*.ts'],
    rules: {
      ...relaxedTypeCheckRules,
      'no-console': 'off',
    },
  },

  // Config files - relaxed function length (config files are legitimately long)
  {
    files: ['**/*.config.ts', '**/*.config.mjs', '**/*.config.js', '**/eslint.config.*'],
    rules: {
      'max-lines-per-function': 'warn',
    },
  },
);
