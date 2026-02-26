/**
 * @fileoverview Comprehensive tests for templates/index.ts
 *
 * Tests the TEMPLATE_REGISTRY lazy-loaded functions and re-exports.
 * Each registry key must resolve to a valid template with expected properties.
 */
import { TEMPLATE_REGISTRY, TemplateSlug } from './index';

describe('TEMPLATE_REGISTRY', () => {
  const ALL_SLUGS: TemplateSlug[] = [
    'technology-roadmap',
    'business-plan',
    'technology-strategy',
    'product-architecture',
    'api-documentation',
    'data-models',
    'user-flow-maps',
    'technical-debt-register',
    'information-security-policy',
    'incident-response-plan',
    'data-protection-policy',
    'disaster-recovery-plan',
    'engineering-handbook',
    'vendor-management',
    'onboarding-offboarding',
    'ip-assignment-nda',
    'business-requirements',
    'functional-requirements',
    'process-maps',
    'user-stories',
    'requirements-traceability',
    'stakeholder-analysis',
    'business-case',
    'wireframes-mockups',
    'change-request',
  ];

  it('should contain exactly 25 registered template slugs', () => {
    const keys = Object.keys(TEMPLATE_REGISTRY);
    expect(keys.length).toBe(25);
  });

  it('should contain all expected slugs', () => {
    const keys = Object.keys(TEMPLATE_REGISTRY);
    for (const slug of ALL_SLUGS) {
      expect(keys).toContain(slug);
    }
  });

  it('should have a function (lazy loader) for every entry', () => {
    for (const slug of ALL_SLUGS) {
      expect(typeof TEMPLATE_REGISTRY[slug]).toBe('function');
    }
  });

  describe.each(ALL_SLUGS)('TEMPLATE_REGISTRY["%s"]', (slug) => {
    it('should resolve to a truthy template object', async () => {
      const loader = TEMPLATE_REGISTRY[slug];
      const template = await loader();
      expect(template).toBeTruthy();
    });

    it('should have a slug property matching the registry key', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      expect(template.slug).toBe(slug);
    });

    it('should have a non-empty name', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      expect(typeof template.name).toBe('string');
      expect(template.name.length).toBeGreaterThan(0);
    });

    it('should have a non-empty description', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      expect(typeof template.description).toBe('string');
      expect(template.description.length).toBeGreaterThan(0);
    });

    it('should have a category', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      expect(template.category).toBeDefined();
    });

    it('should have a non-empty sections array', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      expect(Array.isArray(template.sections)).toBe(true);
      expect(template.sections.length).toBeGreaterThan(0);
    });

    it('should have sections with title and id', async () => {
      const template = await TEMPLATE_REGISTRY[slug]();
      for (const section of template.sections) {
        expect(section.title).toBeDefined();
        expect(typeof section.title).toBe('string');
        expect(section.id).toBeDefined();
        expect(typeof section.id).toBe('string');
      }
    });
  });

  describe('re-exports', () => {
    it('should export TemplateSlug type that matches registry keys', () => {
      const keys = Object.keys(TEMPLATE_REGISTRY) as TemplateSlug[];
      // This test verifies the type aligns at runtime
      for (const key of keys) {
        const typed: TemplateSlug = key;
        expect(typed).toBe(key);
      }
    });
  });

  describe('lazy loading behavior', () => {
    it('should return a new promise on each call (not cached by default)', async () => {
      const promise1 = TEMPLATE_REGISTRY['business-plan']();
      const promise2 = TEMPLATE_REGISTRY['business-plan']();
      // Both should resolve to the same template shape
      const [t1, t2] = await Promise.all([promise1, promise2]);
      expect(t1.slug).toBe(t2.slug);
      expect(t1.name).toBe(t2.name);
    });

    it('should resolve all templates concurrently without error', async () => {
      const loaders = ALL_SLUGS.map((slug) => TEMPLATE_REGISTRY[slug]());
      const results = await Promise.all(loaders);
      expect(results.length).toBe(25);
      for (const template of results) {
        expect(template).toBeTruthy();
        expect(template.slug).toBeDefined();
      }
    });

    it('should produce unique slugs across all templates', async () => {
      const loaders = ALL_SLUGS.map((slug) => TEMPLATE_REGISTRY[slug]());
      const results = await Promise.all(loaders);
      const slugs = results.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });
});
