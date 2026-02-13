import { QuestionType, Persona } from '@prisma/client';

/**
 * CEO Questions - 15+ questions for Strategy, Value, Risk Appetite
 *
 * Categories:
 * - Strategy & Vision (5 questions)
 * - Value Creation & Competitive Position (5 questions)
 * - Risk Appetite & Governance (5 questions)
 */

export interface CEOQuestion {
  id: string;
  text: string;
  type: QuestionType;
  persona: Persona;
  dimensionKey: string;
  severity: number;
  bestPractice: string;
  practicalExplainer: string;
  standardRefs: string;
  acceptance: string;
  helpText?: string;
  options?: { id: string; label: string; value: string }[];
  isRequired?: boolean;
  orderIndex: number;
}

// ==========================================
// STRATEGY & VISION QUESTIONS (5)
// ==========================================
export const strategyQuestions: CEOQuestion[] = [
  {
    id: 'q-ceo-001',
    text: 'Do you have a documented company mission and vision?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.78,
    bestPractice: 'Articulate clear mission (why we exist) and vision (where we are going)',
    practicalExplainer: 'Mission and vision align the team and guide strategic decisions.',
    standardRefs: 'Strategic Planning, Jim Collins Built to Last, Simon Sinek Start With Why',
    acceptance: 'Mission and vision documented; communicated to all employees; reviewed annually',
    orderIndex: 3,
    options: [
      { id: 'ceo-001-1', label: 'Yes, documented and communicated', value: 'full' },
      { id: 'ceo-001-2', label: 'Documented but not widely shared', value: 'partial' },
      { id: 'ceo-001-3', label: 'Informal understanding', value: 'minimal' },
      { id: 'ceo-001-4', label: 'No documented mission/vision', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-002',
    text: 'Do you have a 3-5 year strategic plan with milestones?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.8,
    bestPractice: 'Create multi-year strategic plan with annual milestones and quarterly reviews',
    practicalExplainer: 'Strategic planning provides direction and helps prioritize resources.',
    standardRefs: 'Strategic Planning, Balanced Scorecard, OKR Framework',
    acceptance: 'Strategic plan documented; milestones defined; quarterly progress reviews',
    orderIndex: 4,
    options: [
      { id: 'ceo-002-1', label: 'Yes, detailed multi-year plan', value: 'full' },
      { id: 'ceo-002-2', label: '1-2 year plan only', value: 'partial' },
      { id: 'ceo-002-3', label: 'High-level direction', value: 'minimal' },
      { id: 'ceo-002-4', label: 'No strategic plan', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-003',
    text: 'Have you conducted a SWOT analysis for your business?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.72,
    bestPractice: 'Conduct SWOT analysis annually; use insights for strategic planning',
    practicalExplainer: 'SWOT identifies strengths to leverage and weaknesses to address.',
    standardRefs: 'Strategic Analysis, Porter Five Forces, PESTLE Analysis',
    acceptance: 'SWOT documented; reviewed annually; informs strategy',
    orderIndex: 5,
    options: [
      { id: 'ceo-003-1', label: 'Yes, recent SWOT analysis', value: 'full' },
      { id: 'ceo-003-2', label: 'SWOT exists but outdated', value: 'partial' },
      { id: 'ceo-003-3', label: 'Informal competitive awareness', value: 'minimal' },
      { id: 'ceo-003-4', label: 'No SWOT analysis', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-004',
    text: 'Do you have clear success metrics (KPIs) for the business?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.82,
    bestPractice: 'Define 5-7 key KPIs; track weekly; review in leadership meetings',
    practicalExplainer: 'KPIs measure progress toward strategic goals objectively.',
    standardRefs: 'Balanced Scorecard, OKRs, David Parmenter KPIs',
    acceptance: 'KPIs defined; dashboards active; reviewed weekly by leadership',
    orderIndex: 6,
    options: [
      { id: 'ceo-004-1', label: 'Yes, KPI dashboard active', value: 'full' },
      { id: 'ceo-004-2', label: 'KPIs defined, inconsistent tracking', value: 'partial' },
      { id: 'ceo-004-3', label: 'Basic metrics tracked', value: 'minimal' },
      { id: 'ceo-004-4', label: 'No defined KPIs', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-005',
    text: 'Is your market positioning clearly defined and differentiated?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.79,
    bestPractice:
      'Define clear positioning statement; validate with customers; differentiate from competitors',
    practicalExplainer: 'Clear positioning helps customers understand why to choose you.',
    standardRefs:
      'Positioning (Ries & Trout), Blue Ocean Strategy, Geoffrey Moore Crossing the Chasm',
    acceptance: 'Positioning documented; customer validated; team aligned',
    orderIndex: 7,
    options: [
      { id: 'ceo-005-1', label: 'Yes, clear differentiated positioning', value: 'full' },
      { id: 'ceo-005-2', label: 'Positioning defined, not validated', value: 'partial' },
      { id: 'ceo-005-3', label: 'General positioning idea', value: 'minimal' },
      { id: 'ceo-005-4', label: 'No positioning strategy', value: 'none' },
    ],
    isRequired: true,
  },
];

// ==========================================
// VALUE CREATION & COMPETITIVE POSITION (5)
// ==========================================
export const valueCreationQuestions: CEOQuestion[] = [
  {
    id: 'q-ceo-006',
    text: 'Have you identified your key competitive advantages?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.81,
    bestPractice: 'Document sustainable competitive advantages; validate with market research',
    practicalExplainer: 'Competitive advantages are what make you win against alternatives.',
    standardRefs: 'Porter Competitive Advantage, VRIO Framework, Competitive Strategy',
    acceptance: 'Competitive advantages documented; evidence-based; strategy aligned',
    orderIndex: 8,
    options: [
      { id: 'ceo-006-1', label: 'Yes, documented with evidence', value: 'full' },
      { id: 'ceo-006-2', label: 'Advantages identified informally', value: 'partial' },
      { id: 'ceo-006-3', label: 'General differentiation ideas', value: 'minimal' },
      { id: 'ceo-006-4', label: 'Competitive advantages unclear', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-007',
    text: 'Do you have a moat strategy (defensibility)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.77,
    bestPractice:
      'Build moats through network effects, switching costs, brand, or proprietary tech',
    practicalExplainer: 'Moats protect your business from competitors over time.',
    standardRefs: 'Warren Buffett Moats, Hamilton Helmer 7 Powers, Peter Thiel Zero to One',
    acceptance: 'Moat strategy documented; execution plan in place; progress tracked',
    orderIndex: 9,
    options: [
      { id: 'ceo-007-1', label: 'Yes, clear moat being built', value: 'full' },
      { id: 'ceo-007-2', label: 'Moat strategy identified', value: 'partial' },
      { id: 'ceo-007-3', label: 'Some defensibility', value: 'minimal' },
      { id: 'ceo-007-4', label: 'No moat strategy', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-008',
    text: 'Have you validated product-market fit?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.88,
    bestPractice:
      'Measure PMF through retention, NPS, and organic growth; aim for >40% "very disappointed" score',
    practicalExplainer:
      'Product-market fit means customers love your product enough to grow organically.',
    standardRefs: 'Sean Ellis PMF Survey, Marc Andreessen PMF, Superhuman PMF Engine',
    acceptance: 'PMF survey >40% "very disappointed"; strong retention; organic growth',
    orderIndex: 10,
    options: [
      { id: 'ceo-008-1', label: 'Yes, validated PMF with metrics', value: 'full' },
      { id: 'ceo-008-2', label: 'Early signs of PMF', value: 'partial' },
      { id: 'ceo-008-3', label: 'Testing for PMF', value: 'minimal' },
      { id: 'ceo-008-4', label: 'PMF not yet achieved', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-009',
    text: 'Do you understand your Total Addressable Market (TAM)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.74,
    bestPractice: 'Calculate TAM/SAM/SOM; validate with bottom-up and top-down analysis',
    practicalExplainer: 'TAM helps understand growth potential and investor attractiveness.',
    standardRefs: 'Market Sizing, BCG Market Analysis, McKinsey Market Research',
    acceptance: 'TAM/SAM/SOM calculated; methodology documented; validated',
    orderIndex: 11,
    options: [
      { id: 'ceo-009-1', label: 'Yes, TAM/SAM/SOM calculated', value: 'full' },
      { id: 'ceo-009-2', label: 'TAM estimated', value: 'partial' },
      { id: 'ceo-009-3', label: 'General market understanding', value: 'minimal' },
      { id: 'ceo-009-4', label: 'Market size unknown', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-010',
    text: 'Do you have an advisory board or mentors providing strategic guidance?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.65,
    bestPractice: 'Build advisory board with domain experts; meet quarterly for strategic input',
    practicalExplainer: 'Advisors provide experience and networks you may lack.',
    standardRefs: 'Y Combinator Advisor Guide, First Round Review, Startup Boards',
    acceptance: 'Advisory board established; quarterly meetings; clear value exchange',
    orderIndex: 12,
    options: [
      { id: 'ceo-010-1', label: 'Yes, active advisory board', value: 'full' },
      { id: 'ceo-010-2', label: 'Informal mentors/advisors', value: 'partial' },
      { id: 'ceo-010-3', label: 'Occasional advice', value: 'minimal' },
      { id: 'ceo-010-4', label: 'No advisory support', value: 'none' },
    ],
    isRequired: true,
  },
];

// ==========================================
// RISK APPETITE & GOVERNANCE (5)
// ==========================================
export const riskGovernanceQuestions: CEOQuestion[] = [
  {
    id: 'q-ceo-011',
    text: 'Have you defined your company risk appetite and tolerance?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.76,
    bestPractice:
      'Define risk appetite in key areas (financial, operational, reputational); set thresholds',
    practicalExplainer: 'Risk appetite guides decision-making about acceptable risks.',
    standardRefs: 'COSO ERM, ISO 31000, Risk Management Standards',
    acceptance: 'Risk appetite documented; communicated to leadership; reviewed annually',
    orderIndex: 13,
    options: [
      { id: 'ceo-011-1', label: 'Yes, formal risk appetite defined', value: 'full' },
      { id: 'ceo-011-2', label: 'General risk approach understood', value: 'partial' },
      { id: 'ceo-011-3', label: 'Informal risk awareness', value: 'minimal' },
      { id: 'ceo-011-4', label: 'Risk appetite not defined', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-012',
    text: 'Do you have a risk register and mitigation plans?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.79,
    bestPractice: 'Maintain risk register with likelihood/impact; assign owners; review quarterly',
    practicalExplainer: 'Risk registers help track and manage key threats to the business.',
    standardRefs: 'ISO 31000, PMBOK Risk Management, COSO Framework',
    acceptance: 'Risk register maintained; mitigation plans in place; quarterly reviews',
    orderIndex: 14,
    options: [
      { id: 'ceo-012-1', label: 'Yes, active risk register', value: 'full' },
      { id: 'ceo-012-2', label: 'Risk identification done', value: 'partial' },
      { id: 'ceo-012-3', label: 'Informal risk tracking', value: 'minimal' },
      { id: 'ceo-012-4', label: 'No risk management', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-013',
    text: 'Is there a clear decision-making framework for major decisions?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.73,
    bestPractice: 'Define decision rights (RAPID/RACI); document criteria for escalation',
    practicalExplainer: 'Clear decision frameworks speed up decisions and ensure accountability.',
    standardRefs: 'Bain RAPID Framework, McKinsey Decision Making, Governance Best Practices',
    acceptance: 'Decision framework documented; escalation clear; consistently applied',
    orderIndex: 15,
    options: [
      { id: 'ceo-013-1', label: 'Yes, formal decision framework', value: 'full' },
      { id: 'ceo-013-2', label: 'Basic decision process', value: 'partial' },
      { id: 'ceo-013-3', label: 'Informal decision making', value: 'minimal' },
      { id: 'ceo-013-4', label: 'No decision framework', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-014',
    text: 'Do you have succession planning for key roles?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'people_change',
    severity: 0.68,
    bestPractice: 'Identify successors for key roles; develop talent pipeline; document knowledge',
    practicalExplainer: 'Succession planning reduces "bus factor" risk for key positions.',
    standardRefs: 'HR Best Practices, Talent Management, ISO 27001:A.7',
    acceptance: 'Key roles have successors identified; development plans in place',
    orderIndex: 3,
    options: [
      { id: 'ceo-014-1', label: 'Yes, succession planning in place', value: 'full' },
      { id: 'ceo-014-2', label: 'Some key roles covered', value: 'partial' },
      { id: 'ceo-014-3', label: 'Informal backup plans', value: 'minimal' },
      { id: 'ceo-014-4', label: 'No succession planning', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-ceo-015',
    text: 'Do you have regular board/investor reporting?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CEO,
    dimensionKey: 'strategy',
    severity: 0.72,
    bestPractice: 'Monthly investor updates; quarterly board meetings; consistent reporting format',
    practicalExplainer:
      'Regular reporting builds trust with stakeholders and ensures accountability.',
    standardRefs: 'Board Governance, Investor Relations Best Practices',
    acceptance: 'Monthly updates sent; board meetings quarterly; KPIs consistently reported',
    orderIndex: 16,
    options: [
      { id: 'ceo-015-1', label: 'Yes, regular structured reporting', value: 'full' },
      { id: 'ceo-015-2', label: 'Periodic updates', value: 'partial' },
      { id: 'ceo-015-3', label: 'Ad-hoc communication', value: 'minimal' },
      { id: 'ceo-015-4', label: 'No formal reporting', value: 'none' },
    ],
    isRequired: true,
  },
];

// Combined CEO questions
export const ceoQuestions: CEOQuestion[] = [
  ...strategyQuestions,
  ...valueCreationQuestions,
  ...riskGovernanceQuestions,
];

export default ceoQuestions;
