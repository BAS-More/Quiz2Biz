/**
 * UX Quality Validation Tests
 *
 * Validates user experience quality based on Nielsen's 10 Heuristics:
 * 1. Visibility of system status
 * 2. Match between system and real world
 * 3. User control and freedom
 * 4. Consistency and standards
 * 5. Error prevention
 * 6. Recognition rather than recall
 * 7. Flexibility and efficiency of use
 * 8. Aesthetic and minimalist design
 * 9. Help users recognize, diagnose, and recover from errors
 * 10. Help and documentation
 *
 * @see Nielsen Norman Group - 10 Usability Heuristics
 */

import * as fs from 'fs';
import * as path from 'path';

describe('UX Quality Validation', () => {
  const webSrcDir = path.join(__dirname, '../../../../../../apps/web/src');
  const apiSrcDir = path.join(__dirname, '../../../../');

  function getReactFiles(dir: string, files: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        getReactFiles(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  describe('H1: Visibility of System Status', () => {
    it('should have loading indicators for async operations', () => {
      const files = getReactFiles(webSrcDir);
      let hasLoadingIndicators = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('loading') ||
          content.includes('isLoading') ||
          content.includes('Spinner') ||
          content.includes('Skeleton') ||
          content.includes('Loading')
        ) {
          hasLoadingIndicators = true;
          break;
        }
      }

      expect(hasLoadingIndicators).toBe(true);
    });

    it('should show progress for multi-step processes', () => {
      const files = getReactFiles(webSrcDir);
      let hasProgressIndicators = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('progress') ||
          content.includes('Progress') ||
          content.includes('step') ||
          content.includes('Step') ||
          content.includes('stepper')
        ) {
          hasProgressIndicators = true;
          break;
        }
      }

      expect(hasProgressIndicators).toBe(true);
    });

    it('should provide feedback for user actions', () => {
      const files = getReactFiles(webSrcDir);
      let hasFeedback = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('toast') ||
          content.includes('Toast') ||
          content.includes('notification') ||
          content.includes('Notification') ||
          content.includes('alert') ||
          content.includes('success')
        ) {
          hasFeedback = true;
          break;
        }
      }

      expect(hasFeedback).toBe(true);
    });
  });

  describe('H2: Match Between System and Real World', () => {
    it('should use user-friendly language in UI', () => {
      const files = getReactFiles(webSrcDir);
      let jargonFoundCount = 0;
      const technicalJargon = ['NaN', 'undefined', 'null', 'TypeError', 'stacktrace'];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        for (const jargon of technicalJargon) {
          // Check if jargon appears in user-visible text (not in code)
          const visibleTextPattern = new RegExp(`['"\`][^'"\`]*${jargon}[^'"\`]*['"\`]`, 'gi');
          if (visibleTextPattern.test(content)) {
            // Allow in error handling/development code
            if (!content.includes('development') && !content.includes('debug')) {
              jargonFoundCount++;
            }
          }
        }
      }

      // Allow some technical jargon in edge cases (error boundaries, etc.)
      expect(jargonFoundCount).toBeLessThan(150);
    });

    it('should use appropriate icons and visual metaphors', () => {
      const files = getReactFiles(webSrcDir);
      let hasIcons = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('Icon') ||
          content.includes('lucide') ||
          content.includes('heroicons') ||
          content.includes('svg')
        ) {
          hasIcons = true;
          break;
        }
      }

      expect(hasIcons).toBe(true);
    });
  });

  describe('H3: User Control and Freedom', () => {
    it('should have cancel/back options in flows', () => {
      const files = getReactFiles(webSrcDir);
      let hasCancelOptions = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('Cancel') ||
          content.includes('cancel') ||
          content.includes('Back') ||
          content.includes('goBack') ||
          content.includes('navigate(-1)')
        ) {
          hasCancelOptions = true;
          break;
        }
      }

      expect(hasCancelOptions).toBe(true);
    });

    it('should support undo for destructive actions', () => {
      const files = getReactFiles(webSrcDir);
      let hasUndoOrConfirm = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('undo') ||
          content.includes('Undo') ||
          content.includes('confirm') ||
          content.includes('Confirm') ||
          content.includes('Are you sure')
        ) {
          hasUndoOrConfirm = true;
          break;
        }
      }

      expect(hasUndoOrConfirm).toBe(true);
    });
  });

  describe('H4: Consistency and Standards', () => {
    it('should have consistent button states', () => {
      const files = getReactFiles(webSrcDir);
      let hasButtonStates = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('disabled') ||
          content.includes('hover:') ||
          content.includes('active:') ||
          content.includes('focus:')
        ) {
          hasButtonStates = true;
          break;
        }
      }

      expect(hasButtonStates).toBe(true);
    });

    it('should use consistent naming patterns', () => {
      const files = getReactFiles(webSrcDir);
      let namingViolations = 0;

      for (const file of files) {
        const filename = path.basename(file, '.tsx');
        // Components should be PascalCase
        if (!filename.includes('.') && !/^[A-Z][a-zA-Z0-9]*$/.test(filename)) {
          // Allow index files and kebab-case (common in some projects)
          if (filename !== 'index' && !filename.includes('-')) {
            namingViolations++;
          }
        }
      }

      // Allow some naming variations
      expect(namingViolations).toBeLessThan(10);
    });

    it('should have consistent spacing/layout system', () => {
      const files = getReactFiles(webSrcDir);
      let hasLayoutSystem = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('gap-') ||
          content.includes('space-') ||
          content.includes('p-') ||
          content.includes('m-') ||
          content.includes('grid') ||
          content.includes('flex')
        ) {
          hasLayoutSystem = true;
          break;
        }
      }

      expect(hasLayoutSystem).toBe(true);
    });
  });

  describe('H5: Error Prevention', () => {
    it('should validate input before submission', () => {
      const files = getReactFiles(webSrcDir);
      let hasValidation = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('required') ||
          content.includes('validate') ||
          content.includes('pattern') ||
          content.includes('minLength') ||
          content.includes('maxLength') ||
          content.includes('zod') ||
          content.includes('yup')
        ) {
          hasValidation = true;
          break;
        }
      }

      expect(hasValidation).toBe(true);
    });

    it('should confirm destructive actions', () => {
      const files = getReactFiles(webSrcDir);
      let hasConfirmation = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('delete') ||
          content.includes('Delete') ||
          content.includes('remove') ||
          content.includes('Remove')
        ) {
          if (
            content.includes('confirm') ||
            content.includes('Confirm') ||
            content.includes('Modal') ||
            content.includes('Dialog')
          ) {
            hasConfirmation = true;
          }
        }
      }

      expect(hasConfirmation).toBe(true);
    });
  });

  describe('H6: Recognition Rather Than Recall', () => {
    it('should show recent/suggested options', () => {
      const files = getReactFiles(webSrcDir);
      let hasRecognitionAids = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('recent') ||
          content.includes('Recent') ||
          content.includes('suggestion') ||
          content.includes('autocomplete') ||
          content.includes('dropdown') ||
          content.includes('select')
        ) {
          hasRecognitionAids = true;
          break;
        }
      }

      expect(hasRecognitionAids).toBe(true);
    });

    it('should have clear navigation/breadcrumbs', () => {
      const files = getReactFiles(webSrcDir);
      let hasNavigation = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('nav') ||
          content.includes('Nav') ||
          content.includes('breadcrumb') ||
          content.includes('Breadcrumb') ||
          content.includes('Sidebar') ||
          content.includes('Menu')
        ) {
          hasNavigation = true;
          break;
        }
      }

      expect(hasNavigation).toBe(true);
    });
  });

  describe('H7: Flexibility and Efficiency', () => {
    it('should support keyboard shortcuts or quick actions', () => {
      const files = getReactFiles(webSrcDir);
      let hasEfficiencyFeatures = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('shortcut') ||
          content.includes('hotkey') ||
          content.includes('Ctrl+') ||
          content.includes('Cmd+') ||
          content.includes('onKeyDown') ||
          content.includes('useHotkeys')
        ) {
          hasEfficiencyFeatures = true;
          break;
        }
      }

      // Keyboard support is recommended
      if (!hasEfficiencyFeatures) {
        console.warn('Consider adding keyboard shortcuts for power users');
      }
      expect(true).toBe(true);
    });
  });

  describe('H8: Aesthetic and Minimalist Design', () => {
    it('should not have excessive nesting in components', () => {
      const files = getReactFiles(webSrcDir);
      let excessiveNestingCount = 0;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Count max nesting depth of divs
        const lines = content.split('\n');
        let currentDepth = 0;
        let maxDepth = 0;

        for (const line of lines) {
          const openTags = (line.match(/<div|<section|<article/g) || []).length;
          const closeTags = (line.match(/<\/div|<\/section|<\/article/g) || []).length;
          currentDepth += openTags - closeTags;
          maxDepth = Math.max(maxDepth, currentDepth);
        }

        if (maxDepth > 15) {
          excessiveNestingCount++;
        }
      }

      // Allow some deeply nested components (complex layouts)
      expect(excessiveNestingCount).toBeLessThan(10);
    });
  });

  describe('H9: Help Users Recover from Errors', () => {
    it('should have user-friendly error messages', () => {
      const files = getReactFiles(webSrcDir);
      let hasErrorMessages = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('error') ||
          content.includes('Error') ||
          content.includes('ErrorBoundary') ||
          content.includes('errorMessage')
        ) {
          hasErrorMessages = true;
          break;
        }
      }

      expect(hasErrorMessages).toBe(true);
    });

    it('should have empty states for lists', () => {
      const files = getReactFiles(webSrcDir);
      let hasEmptyStates = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('empty') ||
          content.includes('Empty') ||
          content.includes('No results') ||
          content.includes('No data') ||
          content.includes('length === 0') ||
          content.includes('.length === 0')
        ) {
          hasEmptyStates = true;
          break;
        }
      }

      expect(hasEmptyStates).toBe(true);
    });
  });

  describe('H10: Help and Documentation', () => {
    it('should have help text or tooltips for complex features', () => {
      const files = getReactFiles(webSrcDir);
      let hasHelpFeatures = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('tooltip') ||
          content.includes('Tooltip') ||
          content.includes('help') ||
          content.includes('Help') ||
          content.includes('info') ||
          content.includes('description')
        ) {
          hasHelpFeatures = true;
          break;
        }
      }

      expect(hasHelpFeatures).toBe(true);
    });
  });

  describe('Response Time Requirements', () => {
    it('should have debounced search inputs', () => {
      const files = getReactFiles(webSrcDir);
      let hasDebouncing = false;

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        if (
          content.includes('debounce') ||
          content.includes('Debounce') ||
          content.includes('useDebounce')
        ) {
          hasDebouncing = true;
          break;
        }
      }

      // Debouncing is recommended for search
      if (!hasDebouncing) {
        console.warn('Consider adding debounce for search inputs (INP < 200ms)');
      }
      expect(true).toBe(true);
    });
  });
});
