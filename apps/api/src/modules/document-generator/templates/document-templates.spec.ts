/**
 * @fileoverview Comprehensive tests for document-templates.ts
 *
 * Tests getDocumentTemplate(), getAllDocumentTemplates(), and the full
 * documentTemplates registry with section-level validation.
 */
import {
  documentTemplates,
  getDocumentTemplate,
  getAllDocumentTemplates,
  DocumentTemplate,
  DocumentTemplateSection,
} from './document-templates';

describe('documentTemplates registry', () => {
  const ALL_TEMPLATE_SLUGS = [
    'business-plan-doc',
    'marketing-strategy-doc',
    'financial-projections-doc',
    'investor-pitch-doc',
    'ai-prompts-doc',
    'ms-strategy-doc',
    'fp-report-doc',
  ];

  it('should contain exactly 7 document templates', () => {
    expect(Object.keys(documentTemplates).length).toBe(7);
  });

  it('should contain all expected template slugs', () => {
    const keys = Object.keys(documentTemplates);
    for (const slug of ALL_TEMPLATE_SLUGS) {
      expect(keys).toContain(slug);
    }
  });

  describe.each(ALL_TEMPLATE_SLUGS)('template "%s"', (slug) => {
    let template: DocumentTemplate;

    beforeAll(() => {
      template = documentTemplates[slug];
    });

    it('should have slug matching its registry key', () => {
      expect(template.slug).toBe(slug);
    });

    it('should have a non-empty name', () => {
      expect(typeof template.name).toBe('string');
      expect(template.name.length).toBeGreaterThan(0);
    });

    it('should have at least one section', () => {
      expect(Array.isArray(template.sections)).toBe(true);
      expect(template.sections.length).toBeGreaterThan(0);
    });

    it('should have sections with non-empty heading and description', () => {
      for (const section of template.sections) {
        expect(typeof section.heading).toBe('string');
        expect(section.heading.length).toBeGreaterThan(0);
        expect(typeof section.description).toBe('string');
        expect(section.description.length).toBeGreaterThan(0);
      }
    });

    it('should have unique section headings', () => {
      const headings = template.sections.map((s) => s.heading);
      const unique = new Set(headings);
      expect(unique.size).toBe(headings.length);
    });
  });

  describe('requiredFields validation', () => {
    it('business-plan-doc should have requiredFields on most sections', () => {
      const template = documentTemplates['business-plan-doc'];
      const sectionsWithRequired = template.sections.filter(
        (s) => s.requiredFields && s.requiredFields.length > 0,
      );
      // All 10 sections of business plan have requiredFields
      expect(sectionsWithRequired.length).toBe(template.sections.length);
    });

    it('investor-pitch-doc should not require requiredFields on every section', () => {
      const template = documentTemplates['investor-pitch-doc'];
      const sectionsWithRequired = template.sections.filter(
        (s) => s.requiredFields && s.requiredFields.length > 0,
      );
      // investor-pitch-doc has no requiredFields
      expect(sectionsWithRequired.length).toBe(0);
    });

    it('requiredFields should be arrays of strings where present', () => {
      for (const template of Object.values(documentTemplates)) {
        for (const section of template.sections) {
          if (section.requiredFields) {
            expect(Array.isArray(section.requiredFields)).toBe(true);
            for (const field of section.requiredFields) {
              expect(typeof field).toBe('string');
              expect(field.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  describe('specific template content', () => {
    it('business-plan-doc should have 10 sections', () => {
      expect(documentTemplates['business-plan-doc'].sections.length).toBe(10);
    });

    it('marketing-strategy-doc should have 8 sections', () => {
      expect(documentTemplates['marketing-strategy-doc'].sections.length).toBe(8);
    });

    it('financial-projections-doc should have 7 sections', () => {
      expect(documentTemplates['financial-projections-doc'].sections.length).toBe(7);
    });

    it('investor-pitch-doc should have 7 sections', () => {
      expect(documentTemplates['investor-pitch-doc'].sections.length).toBe(7);
    });

    it('ai-prompts-doc should have 6 sections', () => {
      expect(documentTemplates['ai-prompts-doc'].sections.length).toBe(6);
    });

    it('ms-strategy-doc should have 7 sections', () => {
      expect(documentTemplates['ms-strategy-doc'].sections.length).toBe(7);
    });

    it('fp-report-doc should have 8 sections', () => {
      expect(documentTemplates['fp-report-doc'].sections.length).toBe(8);
    });

    it('business-plan-doc Executive Summary should require business name', () => {
      const section = documentTemplates['business-plan-doc'].sections.find(
        (s) => s.heading === 'Executive Summary',
      );
      expect(section?.requiredFields).toContain('business name');
      expect(section?.requiredFields).toContain('mission statement');
      expect(section?.requiredFields).toContain('key objectives');
    });

    it('financial-projections-doc should have Break-Even Analysis section', () => {
      const section = documentTemplates['financial-projections-doc'].sections.find(
        (s) => s.heading === 'Break-Even Analysis',
      );
      expect(section).toBeDefined();
      expect(section?.requiredFields).toContain('break-even point');
    });
  });
});

describe('getDocumentTemplate', () => {
  it('should return a template for a valid slug', () => {
    const template = getDocumentTemplate('business-plan-doc');
    expect(template).not.toBeNull();
    expect(template?.slug).toBe('business-plan-doc');
    expect(template?.name).toBe('Business Plan');
  });

  it('should return null for an invalid slug', () => {
    const template = getDocumentTemplate('nonexistent-slug');
    expect(template).toBeNull();
  });

  it('should return null for an empty string', () => {
    const template = getDocumentTemplate('');
    expect(template).toBeNull();
  });

  it('should return the same reference as documentTemplates for a valid slug', () => {
    const template = getDocumentTemplate('marketing-strategy-doc');
    expect(template).toBe(documentTemplates['marketing-strategy-doc']);
  });

  it('should return correct template for each known slug', () => {
    const slugNamePairs: Array<[string, string]> = [
      ['business-plan-doc', 'Business Plan'],
      ['marketing-strategy-doc', 'Marketing Strategy'],
      ['financial-projections-doc', 'Financial Projections'],
      ['investor-pitch-doc', 'Investor Pitch Deck'],
      ['ai-prompts-doc', 'AI Prompt Library'],
      ['ms-strategy-doc', 'Marketing Strategy Report'],
      ['fp-report-doc', 'Financial Projections Report'],
    ];

    for (const [slug, expectedName] of slugNamePairs) {
      const template = getDocumentTemplate(slug);
      expect(template).not.toBeNull();
      expect(template?.name).toBe(expectedName);
    }
  });

  it('should return null for a slug with a typo', () => {
    expect(getDocumentTemplate('business-plan')).toBeNull();
    expect(getDocumentTemplate('business_plan_doc')).toBeNull();
    expect(getDocumentTemplate('Business-Plan-Doc')).toBeNull();
  });

  it('should return a template whose sections array is not empty', () => {
    const template = getDocumentTemplate('fp-report-doc');
    expect(template).not.toBeNull();
    expect(template!.sections.length).toBeGreaterThan(0);
  });
});

describe('getAllDocumentTemplates', () => {
  it('should return an array', () => {
    const templates = getAllDocumentTemplates();
    expect(Array.isArray(templates)).toBe(true);
  });

  it('should return 7 templates', () => {
    const templates = getAllDocumentTemplates();
    expect(templates.length).toBe(7);
  });

  it('should return templates with valid structure', () => {
    const templates = getAllDocumentTemplates();
    for (const template of templates) {
      expect(template.slug).toBeDefined();
      expect(template.name).toBeDefined();
      expect(Array.isArray(template.sections)).toBe(true);
      expect(template.sections.length).toBeGreaterThan(0);
    }
  });

  it('should return all unique slugs', () => {
    const templates = getAllDocumentTemplates();
    const slugs = templates.map((t) => t.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('should return all unique names', () => {
    const templates = getAllDocumentTemplates();
    const names = templates.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('should contain the business-plan-doc template', () => {
    const templates = getAllDocumentTemplates();
    const businessPlan = templates.find((t) => t.slug === 'business-plan-doc');
    expect(businessPlan).toBeDefined();
    expect(businessPlan?.name).toBe('Business Plan');
  });

  it('should return the same data as Object.values(documentTemplates)', () => {
    const fromFunction = getAllDocumentTemplates();
    const fromDirect = Object.values(documentTemplates);
    expect(fromFunction).toEqual(fromDirect);
  });
});
