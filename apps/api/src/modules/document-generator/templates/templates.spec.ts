/**
 * @fileoverview Tests for Document Generator Templates
 */
import {
  BASE_STYLES,
  PAGE_MARGINS,
  DOCUMENT_METADATA,
  SECTION_ORDER,
  PLACEHOLDERS,
} from './base.template';

import { documentTemplates, DocumentTemplate } from './document-templates';

describe('Base Template Configuration', () => {
  describe('BASE_STYLES', () => {
    it('should have document styles', () => {
      expect(BASE_STYLES.document.font).toBe('Calibri');
      expect(BASE_STYLES.document.fontSize).toBe(24);
      expect(BASE_STYLES.document.lineSpacing).toBe(276);
    });

    it('should have title styles', () => {
      expect(BASE_STYLES.title.fontSize).toBe(48);
      expect(BASE_STYLES.title.bold).toBe(true);
    });

    it('should have heading1 styles', () => {
      expect(BASE_STYLES.heading1.fontSize).toBe(32);
      expect(BASE_STYLES.heading1.bold).toBe(true);
    });

    it('should have heading2 styles', () => {
      expect(BASE_STYLES.heading2.fontSize).toBe(28);
      expect(BASE_STYLES.heading2.bold).toBe(true);
    });

    it('should have heading3 styles', () => {
      expect(BASE_STYLES.heading3.fontSize).toBe(24);
      expect(BASE_STYLES.heading3.bold).toBe(true);
    });

    it('should have table styles', () => {
      expect(BASE_STYLES.table.headerBackground).toBe('E0E0E0');
      expect(BASE_STYLES.table.borderSize).toBe(1);
    });
  });

  describe('PAGE_MARGINS', () => {
    it('should have 1 inch margins', () => {
      expect(PAGE_MARGINS.top).toBe(1440);
      expect(PAGE_MARGINS.right).toBe(1440);
      expect(PAGE_MARGINS.bottom).toBe(1440);
      expect(PAGE_MARGINS.left).toBe(1440);
    });
  });

  describe('DOCUMENT_METADATA', () => {
    it('should have creator', () => {
      expect(DOCUMENT_METADATA.creator).toBe('Adaptive Questionnaire System');
    });

    it('should have lastModifiedBy', () => {
      expect(DOCUMENT_METADATA.lastModifiedBy).toBe('Document Generator');
    });
  });

  describe('SECTION_ORDER', () => {
    it('should have CTO section order', () => {
      expect(SECTION_ORDER.CTO).toContain('executive_summary');
      expect(SECTION_ORDER.CTO).toContain('architecture');
      expect(SECTION_ORDER.CTO).toContain('security');
    });

    it('should have CFO section order', () => {
      expect(SECTION_ORDER.CFO).toContain('executive_summary');
      expect(SECTION_ORDER.CFO).toContain('financial_projections');
      expect(SECTION_ORDER.CFO).toContain('risk_management');
    });

    it('should have BA section order', () => {
      expect(SECTION_ORDER.BA).toContain('business_requirements');
      expect(SECTION_ORDER.BA).toContain('functional_requirements');
      expect(SECTION_ORDER.BA).toContain('user_stories');
    });
  });

  describe('PLACEHOLDERS', () => {
    it('should have placeholder values', () => {
      expect(PLACEHOLDERS).toBeDefined();
    });
  });
});

describe('Document Templates', () => {
  it('should have business-plan-doc template', () => {
    const template = documentTemplates['business-plan-doc'];

    expect(template).toBeDefined();
    expect(template.name).toBe('Business Plan');
    expect(template.sections.length).toBeGreaterThan(0);
  });

  it('should have marketing-strategy-doc template', () => {
    const template = documentTemplates['marketing-strategy-doc'];

    expect(template).toBeDefined();
    expect(template.name).toBe('Marketing Strategy');
  });

  describe('Business Plan Template', () => {
    const template = documentTemplates['business-plan-doc'];

    it('should have Executive Summary section', () => {
      const section = template.sections.find(s => s.heading === 'Executive Summary');
      expect(section).toBeDefined();
      expect(section?.requiredFields).toContain('business name');
    });

    it('should have Problem & Opportunity section', () => {
      const section = template.sections.find(s => s.heading === 'Problem & Opportunity');
      expect(section).toBeDefined();
    });

    it('should have Product/Service Description section', () => {
      const section = template.sections.find(s => s.heading === 'Product/Service Description');
      expect(section).toBeDefined();
    });

    it('should have Financial Projections section', () => {
      const section = template.sections.find(s => s.heading === 'Financial Projections');
      expect(section).toBeDefined();
      expect(section?.requiredFields).toContain('revenue projections');
    });

    it('should have Risk Assessment section', () => {
      const section = template.sections.find(s => s.heading === 'Risk Assessment & Mitigation');
      expect(section).toBeDefined();
    });
  });

  describe('Template Validation', () => {
    it('should have valid structure for all templates', () => {
      Object.values(documentTemplates).forEach((template: DocumentTemplate) => {
        expect(template.slug).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.sections).toBeDefined();
        expect(Array.isArray(template.sections)).toBe(true);
      });
    });

    it('should have valid sections for all templates', () => {
      Object.values(documentTemplates).forEach((template: DocumentTemplate) => {
        template.sections.forEach(section => {
          expect(section.heading).toBeDefined();
          expect(section.description).toBeDefined();
        });
      });
    });
  });
});
