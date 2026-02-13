/**
 * Web Vitals Performance Configuration
 *
 * Defines performance budgets and targets for Core Web Vitals
 * Based on Google's recommended thresholds for good user experience.
 */

export interface WebVitalsThresholds {
  // Core Web Vitals
  FCP: number; // First Contentful Paint (ms)
  LCP: number; // Largest Contentful Paint (ms)
  TTI: number; // Time to Interactive (ms)
  CLS: number; // Cumulative Layout Shift (score)
  FID: number; // First Input Delay (ms)
  TBT: number; // Total Blocking Time (ms)

  // Resource budgets (bytes)
  JS: number;
  CSS: number;
  Images: number;
  Fonts: number;
  Total: number;
}

/**
 * Performance thresholds for Quiz2Biz application
 * Targets:
 * - FCP < 1.8s
 * - LCP < 2.5s
 * - TTI < 3.8s
 * - CLS < 0.1
 * - JS < 300KB
 * - CSS < 50KB
 * - Images < 1MB
 * - Total < 2MB
 */
export const WEB_VITALS_TARGETS: WebVitalsThresholds = {
  // Core Web Vitals (milliseconds except CLS)
  FCP: 1800, // First Contentful Paint: < 1.8 seconds
  LCP: 2500, // Largest Contentful Paint: < 2.5 seconds
  TTI: 3800, // Time to Interactive: < 3.8 seconds
  CLS: 0.1, // Cumulative Layout Shift: < 0.1
  FID: 100, // First Input Delay: < 100ms
  TBT: 200, // Total Blocking Time: < 200ms

  // Resource budgets (bytes)
  JS: 300 * 1024, // JavaScript: < 300KB
  CSS: 50 * 1024, // CSS: < 50KB
  Images: 1024 * 1024, // Images: < 1MB
  Fonts: 100 * 1024, // Fonts: < 100KB
  Total: 2048 * 1024, // Total page weight: < 2MB
};

/**
 * Per-page performance budgets
 */
export const PAGE_SPECIFIC_BUDGETS: Record<string, Partial<WebVitalsThresholds>> = {
  '/': {
    FCP: 1500,
    LCP: 2000,
    JS: 200 * 1024,
  },
  '/login': {
    FCP: 1200,
    LCP: 1800,
    JS: 150 * 1024,
  },
  '/dashboard': {
    FCP: 2000,
    LCP: 2800,
    JS: 400 * 1024,
  },
  '/questionnaire': {
    FCP: 1800,
    LCP: 2500,
    TTI: 3500,
    JS: 350 * 1024,
  },
};

/**
 * Performance budget validator
 */
export function validatePerformanceBudget(
  metrics: Partial<WebVitalsThresholds>,
  page?: string,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  const targets =
    page && PAGE_SPECIFIC_BUDGETS[page]
      ? { ...WEB_VITALS_TARGETS, ...PAGE_SPECIFIC_BUDGETS[page] }
      : WEB_VITALS_TARGETS;

  if (metrics.FCP !== undefined && metrics.FCP > targets.FCP) {
    violations.push(`FCP ${metrics.FCP}ms exceeds target ${targets.FCP}ms`);
  }
  if (metrics.LCP !== undefined && metrics.LCP > targets.LCP) {
    violations.push(`LCP ${metrics.LCP}ms exceeds target ${targets.LCP}ms`);
  }
  if (metrics.TTI !== undefined && metrics.TTI > targets.TTI) {
    violations.push(`TTI ${metrics.TTI}ms exceeds target ${targets.TTI}ms`);
  }
  if (metrics.CLS !== undefined && metrics.CLS > targets.CLS) {
    violations.push(`CLS ${metrics.CLS} exceeds target ${targets.CLS}`);
  }
  if (metrics.JS !== undefined && metrics.JS > targets.JS) {
    violations.push(`JS ${formatBytes(metrics.JS)} exceeds budget ${formatBytes(targets.JS)}`);
  }
  if (metrics.CSS !== undefined && metrics.CSS > targets.CSS) {
    violations.push(`CSS ${formatBytes(metrics.CSS)} exceeds budget ${formatBytes(targets.CSS)}`);
  }
  if (metrics.Total !== undefined && metrics.Total > targets.Total) {
    violations.push(
      `Total ${formatBytes(metrics.Total)} exceeds budget ${formatBytes(targets.Total)}`,
    );
  }

  return { passed: violations.length === 0, violations };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default { WEB_VITALS_TARGETS, PAGE_SPECIFIC_BUDGETS, validatePerformanceBudget };
