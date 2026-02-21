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
import { TEMPLATE_REGISTRY } from './index';

// Import all individual templates for coverage
import { TECHNOLOGY_ROADMAP_TEMPLATE } from './technology-roadmap.template';
import { BUSINESS_PLAN_TEMPLATE } from './business-plan.template';
import { TECHNOLOGY_STRATEGY_TEMPLATE } from './technology-strategy.template';
import { PRODUCT_ARCHITECTURE_TEMPLATE } from './product-architecture.template';
import { API_DOCUMENTATION_TEMPLATE } from './api-documentation.template';
import { DATA_MODELS_TEMPLATE } from './data-models.template';
import { USER_FLOW_MAPS_TEMPLATE } from './user-flow-maps.template';
import { TECHNICAL_DEBT_REGISTER_TEMPLATE } from './technical-debt-register.template';
import { INFORMATION_SECURITY_POLICY_TEMPLATE } from './information-security-policy.template';
import { INCIDENT_RESPONSE_PLAN_TEMPLATE } from './incident-response-plan.template';
import { DATA_PROTECTION_POLICY_TEMPLATE } from './data-protection-policy.template';
import { DISASTER_RECOVERY_PLAN_TEMPLATE } from './disaster-recovery-plan.template';
import { ENGINEERING_HANDBOOK_TEMPLATE } from './engineering-handbook.template';
import { VENDOR_MANAGEMENT_TEMPLATE } from './vendor-management.template';
import { ONBOARDING_OFFBOARDING_TEMPLATE } from './onboarding-offboarding.template';
import { IP_ASSIGNMENT_NDA_TEMPLATE } from './ip-assignment-nda.template';
import { BUSINESS_REQUIREMENTS_TEMPLATE } from './business-requirements.template';
import { FUNCTIONAL_REQUIREMENTS_TEMPLATE } from './functional-requirements.template';
import { PROCESS_MAPS_TEMPLATE } from './process-maps.template';
import { USER_STORIES_TEMPLATE } from './user-stories.template';
import { REQUIREMENTS_TRACEABILITY_TEMPLATE } from './requirements-traceability.template';
import { STAKEHOLDER_ANALYSIS_TEMPLATE } from './stakeholder-analysis.template';
import { BUSINESS_CASE_TEMPLATE } from './business-case.template';
import { WIREFRAMES_MOCKUPS_TEMPLATE } from './wireframes-mockups.template';
import { CHANGE_REQUEST_TEMPLATE } from './change-request.template';

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

describe('TEMPLATE_REGISTRY', () => {
  it('should have all templates registered', () => {
    expect(Object.keys(TEMPLATE_REGISTRY).length).toBeGreaterThan(20);
  });

  it('should have technology-roadmap loader', () => {
    expect(TEMPLATE_REGISTRY['technology-roadmap']).toBeDefined();
  });

  it('should load templates asynchronously', async () => {
    const loader = TEMPLATE_REGISTRY['business-plan'];
    const template = await loader();
    expect(template).toBeDefined();
    expect(template.slug).toBe('business-plan');
  });
});

describe('Individual Template Exports', () => {
  const allTemplates = [
    { name: 'TECHNOLOGY_ROADMAP_TEMPLATE', template: TECHNOLOGY_ROADMAP_TEMPLATE },
    { name: 'BUSINESS_PLAN_TEMPLATE', template: BUSINESS_PLAN_TEMPLATE },
    { name: 'TECHNOLOGY_STRATEGY_TEMPLATE', template: TECHNOLOGY_STRATEGY_TEMPLATE },
    { name: 'PRODUCT_ARCHITECTURE_TEMPLATE', template: PRODUCT_ARCHITECTURE_TEMPLATE },
    { name: 'API_DOCUMENTATION_TEMPLATE', template: API_DOCUMENTATION_TEMPLATE },
    { name: 'DATA_MODELS_TEMPLATE', template: DATA_MODELS_TEMPLATE },
    { name: 'USER_FLOW_MAPS_TEMPLATE', template: USER_FLOW_MAPS_TEMPLATE },
    { name: 'TECHNICAL_DEBT_REGISTER_TEMPLATE', template: TECHNICAL_DEBT_REGISTER_TEMPLATE },
    { name: 'INFORMATION_SECURITY_POLICY_TEMPLATE', template: INFORMATION_SECURITY_POLICY_TEMPLATE },
    { name: 'INCIDENT_RESPONSE_PLAN_TEMPLATE', template: INCIDENT_RESPONSE_PLAN_TEMPLATE },
    { name: 'DATA_PROTECTION_POLICY_TEMPLATE', template: DATA_PROTECTION_POLICY_TEMPLATE },
    { name: 'DISASTER_RECOVERY_PLAN_TEMPLATE', template: DISASTER_RECOVERY_PLAN_TEMPLATE },
    { name: 'ENGINEERING_HANDBOOK_TEMPLATE', template: ENGINEERING_HANDBOOK_TEMPLATE },
    { name: 'VENDOR_MANAGEMENT_TEMPLATE', template: VENDOR_MANAGEMENT_TEMPLATE },
    { name: 'ONBOARDING_OFFBOARDING_TEMPLATE', template: ONBOARDING_OFFBOARDING_TEMPLATE },
    { name: 'IP_ASSIGNMENT_NDA_TEMPLATE', template: IP_ASSIGNMENT_NDA_TEMPLATE },
    { name: 'BUSINESS_REQUIREMENTS_TEMPLATE', template: BUSINESS_REQUIREMENTS_TEMPLATE },
    { name: 'FUNCTIONAL_REQUIREMENTS_TEMPLATE', template: FUNCTIONAL_REQUIREMENTS_TEMPLATE },
    { name: 'PROCESS_MAPS_TEMPLATE', template: PROCESS_MAPS_TEMPLATE },
    { name: 'USER_STORIES_TEMPLATE', template: USER_STORIES_TEMPLATE },
    { name: 'REQUIREMENTS_TRACEABILITY_TEMPLATE', template: REQUIREMENTS_TRACEABILITY_TEMPLATE },
    { name: 'STAKEHOLDER_ANALYSIS_TEMPLATE', template: STAKEHOLDER_ANALYSIS_TEMPLATE },
    { name: 'BUSINESS_CASE_TEMPLATE', template: BUSINESS_CASE_TEMPLATE },
    { name: 'WIREFRAMES_MOCKUPS_TEMPLATE', template: WIREFRAMES_MOCKUPS_TEMPLATE },
    { name: 'CHANGE_REQUEST_TEMPLATE', template: CHANGE_REQUEST_TEMPLATE },
  ];

  it.each(allTemplates)('$name should be defined', ({ template }) => {
    expect(template).toBeDefined();
  });

  it.each(allTemplates)('$name should have required properties', ({ template }) => {
    expect(template.slug).toBeDefined();
    expect(template.name).toBeDefined();
    expect(template.description).toBeDefined();
    expect(template.category).toBeDefined();
    expect(template.sections).toBeDefined();
    expect(Array.isArray(template.sections)).toBe(true);
  });

  it.each(allTemplates)('$name should have valid sections', ({ template }) => {
    expect(template.sections.length).toBeGreaterThan(0);
    template.sections.forEach(section => {
      expect(section.heading).toBeDefined();
      expect(section.description).toBeDefined();
    });
  });
});
