/**
 * Base template styles and configuration for all document types
 */

export const BASE_STYLES = {
  document: {
    font: 'Calibri',
    fontSize: 24, // 12pt in half-points
    lineSpacing: 276, // 1.15 line spacing
  },
  title: {
    fontSize: 48, // 24pt
    bold: true,
  },
  heading1: {
    fontSize: 32, // 16pt
    bold: true,
    spaceBefore: 240,
    spaceAfter: 120,
  },
  heading2: {
    fontSize: 28, // 14pt
    bold: true,
    spaceBefore: 200,
    spaceAfter: 100,
  },
  heading3: {
    fontSize: 24, // 12pt
    bold: true,
    spaceBefore: 160,
    spaceAfter: 80,
  },
  paragraph: {
    spaceAfter: 120,
  },
  table: {
    headerBackground: 'E0E0E0',
    borderColor: '000000',
    borderSize: 1,
  },
};

export const PAGE_MARGINS = {
  top: 1440, // 1 inch in twips
  right: 1440,
  bottom: 1440,
  left: 1440,
};

export const DOCUMENT_METADATA = {
  creator: 'Adaptive Questionnaire System',
  company: 'Your Company Name',
  lastModifiedBy: 'Document Generator',
};

/**
 * Standard section order for different document categories
 */
export const SECTION_ORDER = {
  CTO: [
    'document_control',
    'executive_summary',
    'technical_overview',
    'architecture',
    'infrastructure',
    'security',
    'engineering_standards',
    'appendices',
  ],
  CFO: [
    'document_control',
    'executive_summary',
    'company_description',
    'market_analysis',
    'products_services',
    'marketing_strategy',
    'operations_plan',
    'management_team',
    'financial_projections',
    'risk_management',
    'appendices',
  ],
  BA: [
    'document_control',
    'introduction',
    'business_requirements',
    'functional_requirements',
    'non_functional_requirements',
    'user_stories',
    'process_flows',
    'data_requirements',
    'acceptance_criteria',
    'appendices',
  ],
};

/**
 * Default placeholder values for missing data
 */
export const PLACEHOLDERS = {
  text: '[Not provided]',
  number: 0,
  date: 'TBD',
  list: [],
};
