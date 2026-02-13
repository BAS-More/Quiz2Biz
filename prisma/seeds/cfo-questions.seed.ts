import { QuestionType, Persona } from '@prisma/client';

/**
 * CFO Questions - 20+ questions for Unit Economics, Runway, Spend Governance
 *
 * Categories:
 * - Unit Economics (7 questions)
 * - Runway & Financial Planning (7 questions)
 * - Spend Governance & Controls (6 questions)
 */

export interface CFOQuestion {
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
// UNIT ECONOMICS QUESTIONS (7)
// ==========================================
export const unitEconomicsQuestions: CFOQuestion[] = [
  {
    id: 'q-cfo-001',
    text: 'Do you track Customer Acquisition Cost (CAC) by channel?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.85,
    bestPractice: 'Calculate CAC by channel monthly; target CAC payback <12 months',
    practicalExplainer:
      'CAC tells you how much you spend to acquire each customer, critical for profitability.',
    standardRefs: 'SaaS Metrics, a16z Financial Metrics, Bessemer CAC Ratio',
    acceptance: 'CAC calculated per channel; trend tracked monthly; benchmark comparison available',
    orderIndex: 4,
    options: [
      { id: 'cfo-001-1', label: 'Yes, CAC tracked by channel monthly', value: 'full' },
      { id: 'cfo-001-2', label: 'Blended CAC tracked', value: 'partial' },
      { id: 'cfo-001-3', label: 'Occasional CAC calculation', value: 'minimal' },
      { id: 'cfo-001-4', label: 'No CAC tracking', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-002',
    text: 'Have you calculated your Customer Lifetime Value (LTV)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.83,
    bestPractice: 'Calculate LTV using cohort analysis; maintain LTV:CAC ratio >3:1',
    practicalExplainer: 'LTV predicts total revenue from a customer over their lifetime.',
    standardRefs: 'SaaS Metrics, Sequoia Capital LTV Guide, ProfitWell',
    acceptance: 'LTV calculated; cohort analysis available; LTV:CAC ratio tracked',
    orderIndex: 5,
    options: [
      { id: 'cfo-002-1', label: 'Yes, LTV with cohort analysis', value: 'full' },
      { id: 'cfo-002-2', label: 'Basic LTV calculated', value: 'partial' },
      { id: 'cfo-002-3', label: 'Estimated LTV', value: 'minimal' },
      { id: 'cfo-002-4', label: 'No LTV calculation', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-003',
    text: 'Do you monitor Monthly Recurring Revenue (MRR) movements?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.88,
    bestPractice: 'Track new, expansion, contraction, and churn MRR separately',
    practicalExplainer: 'MRR breakdown reveals the health of your revenue - growth vs. churn.',
    standardRefs: 'SaaS Metrics, ChartMogul, Baremetrics, OpenView Partners',
    acceptance:
      'MRR dashboard with new/expansion/contraction/churn breakdown; daily/weekly tracking',
    orderIndex: 6,
    options: [
      { id: 'cfo-003-1', label: 'Yes, full MRR movement analysis', value: 'full' },
      { id: 'cfo-003-2', label: 'Total MRR tracked monthly', value: 'partial' },
      { id: 'cfo-003-3', label: 'Basic revenue tracking', value: 'minimal' },
      { id: 'cfo-003-4', label: 'No MRR tracking', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-004',
    text: 'Do you calculate and monitor gross margin?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.82,
    bestPractice: 'Track gross margin by product/service; target >70% for SaaS',
    practicalExplainer: 'Gross margin shows how much profit remains after direct costs.',
    standardRefs: 'GAAP Accounting, SaaS Benchmarks, KeyBanc SaaS Survey',
    acceptance: 'Gross margin calculated; broken down by product; trend analysis available',
    orderIndex: 7,
    options: [
      { id: 'cfo-004-1', label: 'Yes, gross margin by product', value: 'full' },
      { id: 'cfo-004-2', label: 'Overall gross margin tracked', value: 'partial' },
      { id: 'cfo-004-3', label: 'Basic cost tracking', value: 'minimal' },
      { id: 'cfo-004-4', label: 'No gross margin tracking', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-005',
    text: 'Do you track churn rate and Net Revenue Retention (NRR)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.87,
    bestPractice: 'Target NRR >100%; track logo and revenue churn separately',
    practicalExplainer: 'NRR shows if existing customers are growing or shrinking in value.',
    standardRefs: 'SaaS Metrics, Bessemer Cloud Index, Tomasz Tunguz NRR Guide',
    acceptance: 'Churn rate <5% monthly; NRR tracked; cohort retention analysis',
    orderIndex: 8,
    options: [
      { id: 'cfo-005-1', label: 'Yes, NRR and detailed churn tracking', value: 'full' },
      { id: 'cfo-005-2', label: 'Churn rate tracked', value: 'partial' },
      { id: 'cfo-005-3', label: 'Basic customer count tracking', value: 'minimal' },
      { id: 'cfo-005-4', label: 'No churn tracking', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-006',
    text: 'Have you defined your pricing strategy with competitive analysis?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.76,
    bestPractice: 'Use value-based pricing; conduct pricing experiments; review quarterly',
    practicalExplainer: 'Pricing strategy directly impacts revenue and market positioning.',
    standardRefs: 'Madhavan Ramanujam Monetizing Innovation, OpenView Pricing Guide',
    acceptance:
      'Pricing strategy documented; competitive analysis complete; pricing experiments run',
    orderIndex: 9,
    options: [
      { id: 'cfo-006-1', label: 'Yes, documented pricing strategy', value: 'full' },
      { id: 'cfo-006-2', label: 'Basic pricing with some analysis', value: 'partial' },
      { id: 'cfo-006-3', label: 'Ad-hoc pricing decisions', value: 'minimal' },
      { id: 'cfo-006-4', label: 'No pricing strategy', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-007',
    text: 'Do you track payback period on customer acquisition?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.79,
    bestPractice: 'Target CAC payback <12 months; track by customer segment',
    practicalExplainer: 'Payback period shows how quickly you recover customer acquisition costs.',
    standardRefs: 'SaaS Metrics, Bessemer Efficiency Score, Scale Venture Partners',
    acceptance: 'Payback period calculated; tracked by segment; <12 months target met',
    orderIndex: 10,
    options: [
      { id: 'cfo-007-1', label: 'Yes, payback tracked by segment', value: 'full' },
      { id: 'cfo-007-2', label: 'Overall payback calculated', value: 'partial' },
      { id: 'cfo-007-3', label: 'Rough payback estimate', value: 'minimal' },
      { id: 'cfo-007-4', label: 'No payback tracking', value: 'none' },
    ],
    isRequired: true,
  },
];

// ==========================================
// RUNWAY & FINANCIAL PLANNING (7)
// ==========================================
export const runwayQuestions: CFOQuestion[] = [
  {
    id: 'q-cfo-008',
    text: 'Do you maintain a cash flow forecast with multiple scenarios?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.92,
    bestPractice: 'Maintain 13-week rolling cash forecast with best/base/worst scenarios',
    practicalExplainer: 'Cash flow forecasting prevents running out of money unexpectedly.',
    standardRefs: 'CFO Guide to Cash Management, Treasury Best Practices',
    acceptance: '13-week forecast active; scenarios documented; weekly updates',
    orderIndex: 11,
    options: [
      { id: 'cfo-008-1', label: 'Yes, rolling forecast with scenarios', value: 'full' },
      { id: 'cfo-008-2', label: 'Monthly cash forecast', value: 'partial' },
      { id: 'cfo-008-3', label: 'Basic cash tracking', value: 'minimal' },
      { id: 'cfo-008-4', label: 'No cash forecasting', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-009',
    text: 'Do you know your current runway in months?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.95,
    bestPractice: 'Maintain minimum 12-18 months runway; recalculate monthly with burn rate',
    practicalExplainer: 'Runway tells you how long you can operate with current cash and burn.',
    standardRefs: 'Y Combinator Startup Finance, Sequoia R.I.P. Good Times',
    acceptance: 'Runway calculated; >12 months maintained; updated monthly',
    orderIndex: 12,
    options: [
      { id: 'cfo-009-1', label: 'Yes, >18 months runway tracked', value: 'full' },
      { id: 'cfo-009-2', label: '12-18 months runway', value: 'partial' },
      { id: 'cfo-009-3', label: '<12 months runway', value: 'minimal' },
      { id: 'cfo-009-4', label: 'Runway unknown', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-010',
    text: 'Do you have a financial model with monthly projections?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.84,
    bestPractice: 'Build 3-year monthly financial model; update actuals monthly; variance analysis',
    practicalExplainer: 'Financial models help plan growth and communicate with investors.',
    standardRefs: 'SCORE Financial Projections, SBA Business Planning',
    acceptance: '3-year model exists; monthly actuals compared; variance <10%',
    orderIndex: 13,
    options: [
      { id: 'cfo-010-1', label: 'Yes, detailed model with actuals', value: 'full' },
      { id: 'cfo-010-2', label: 'Annual projections only', value: 'partial' },
      { id: 'cfo-010-3', label: 'Basic forecasts', value: 'minimal' },
      { id: 'cfo-010-4', label: 'No financial model', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-011',
    text: 'Do you track burn rate (gross and net)?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.9,
    bestPractice: 'Track gross and net burn monthly; identify burn drivers',
    practicalExplainer: 'Burn rate shows how fast you are spending cash.',
    standardRefs: 'VC Burn Rate Analysis, Startup Financial Management',
    acceptance: 'Gross/net burn tracked; drivers identified; trend monitored',
    orderIndex: 14,
    options: [
      { id: 'cfo-011-1', label: 'Yes, gross and net burn tracked', value: 'full' },
      { id: 'cfo-011-2', label: 'Net burn tracked monthly', value: 'partial' },
      { id: 'cfo-011-3', label: 'Rough burn estimate', value: 'minimal' },
      { id: 'cfo-011-4', label: 'Burn rate unknown', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-012',
    text: 'Do you have a break-even analysis?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.78,
    bestPractice: 'Calculate break-even point; identify path to profitability',
    practicalExplainer: 'Break-even shows when revenue covers all costs.',
    standardRefs: 'Management Accounting, SBA Break-Even Analysis',
    acceptance: 'Break-even calculated; timeline to profitability documented',
    orderIndex: 15,
    options: [
      { id: 'cfo-012-1', label: 'Yes, break-even with timeline', value: 'full' },
      { id: 'cfo-012-2', label: 'Break-even calculated', value: 'partial' },
      { id: 'cfo-012-3', label: 'Rough estimate', value: 'minimal' },
      { id: 'cfo-012-4', label: 'No break-even analysis', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-013',
    text: 'Do you have contingency plans for funding gaps?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.86,
    bestPractice:
      'Identify cost reduction levers; maintain investor relationships; have bridge options',
    practicalExplainer: 'Contingency plans ensure survival if funding or revenue falls short.',
    standardRefs: 'Startup Finance, Crisis Management, Cash Conservation',
    acceptance: 'Cost reduction plan ready; bridge options identified; triggers defined',
    orderIndex: 16,
    options: [
      { id: 'cfo-013-1', label: 'Yes, documented contingency plans', value: 'full' },
      { id: 'cfo-013-2', label: 'Some options identified', value: 'partial' },
      { id: 'cfo-013-3', label: 'Informal backup plans', value: 'minimal' },
      { id: 'cfo-013-4', label: 'No contingency planning', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-014',
    text: 'Do you have fundraising readiness materials?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.74,
    bestPractice: 'Maintain investor deck, data room, and cap table ready at all times',
    practicalExplainer: 'Being fundraising-ready allows you to move quickly on opportunities.',
    standardRefs: 'Y Combinator Series A Guide, Sequoia Pitch Template',
    acceptance: 'Pitch deck current; data room organized; cap table clean',
    orderIndex: 17,
    options: [
      { id: 'cfo-014-1', label: 'Yes, fully fundraising ready', value: 'full' },
      { id: 'cfo-014-2', label: 'Basic materials exist', value: 'partial' },
      { id: 'cfo-014-3', label: 'Outdated materials', value: 'minimal' },
      { id: 'cfo-014-4', label: 'No fundraising materials', value: 'none' },
    ],
    isRequired: true,
  },
];

// ==========================================
// SPEND GOVERNANCE & CONTROLS (6)
// ==========================================
export const spendGovernanceQuestions: CFOQuestion[] = [
  {
    id: 'q-cfo-015',
    text: 'Do you have a budget approval process?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.81,
    bestPractice: 'Define approval thresholds by amount; implement purchase order system',
    practicalExplainer: 'Budget approval prevents unauthorized spending and surprise expenses.',
    standardRefs: 'COSO Internal Controls, SOX Compliance, Procurement Best Practices',
    acceptance: 'Approval matrix defined; thresholds enforced; audit trail exists',
    orderIndex: 18,
    options: [
      { id: 'cfo-015-1', label: 'Yes, formal approval process', value: 'full' },
      { id: 'cfo-015-2', label: 'Basic approval for large purchases', value: 'partial' },
      { id: 'cfo-015-3', label: 'Informal approval', value: 'minimal' },
      { id: 'cfo-015-4', label: 'No approval process', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-016',
    text: 'Do you track vendor contracts and renewals?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.77,
    bestPractice: 'Maintain vendor registry with renewal dates; review 60 days before renewal',
    practicalExplainer:
      'Tracking contracts prevents unwanted auto-renewals and enables negotiation.',
    standardRefs: 'Vendor Management, Contract Lifecycle Management',
    acceptance: 'Vendor registry exists; renewal calendar active; terms reviewed annually',
    orderIndex: 19,
    options: [
      { id: 'cfo-016-1', label: 'Yes, vendor management system', value: 'full' },
      { id: 'cfo-016-2', label: 'Spreadsheet tracking', value: 'partial' },
      { id: 'cfo-016-3', label: 'Ad-hoc tracking', value: 'minimal' },
      { id: 'cfo-016-4', label: 'No contract tracking', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-017',
    text: 'Do you have departmental budget ownership?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.76,
    bestPractice:
      'Assign budget owners; monthly budget vs. actual reviews; variance accountability',
    practicalExplainer: 'Budget ownership creates accountability for spending decisions.',
    standardRefs: 'Management Accounting, Responsibility Accounting',
    acceptance: 'Budget owners assigned; monthly reviews conducted; variance explained',
    orderIndex: 20,
    options: [
      { id: 'cfo-017-1', label: 'Yes, budget owners with accountability', value: 'full' },
      { id: 'cfo-017-2', label: 'Budgets assigned, limited review', value: 'partial' },
      { id: 'cfo-017-3', label: 'Centralized budgeting', value: 'minimal' },
      { id: 'cfo-017-4', label: 'No budget ownership', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-018',
    text: 'Do you have expense reporting and reimbursement policies?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.72,
    bestPractice: 'Document expense policy; require receipts; implement expense management tool',
    practicalExplainer: 'Clear policies ensure consistent and compliant expense handling.',
    standardRefs: 'IRS Publication 463, Expense Management Best Practices',
    acceptance: 'Expense policy documented; receipts required; tool implemented',
    orderIndex: 21,
    options: [
      { id: 'cfo-018-1', label: 'Yes, policy with expense tool', value: 'full' },
      { id: 'cfo-018-2', label: 'Written policy, manual process', value: 'partial' },
      { id: 'cfo-018-3', label: 'Informal guidelines', value: 'minimal' },
      { id: 'cfo-018-4', label: 'No expense policy', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-019',
    text: 'Do you perform regular financial reconciliation?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.84,
    bestPractice:
      'Reconcile bank accounts monthly; AR/AP reconciliation; close books within 10 days',
    practicalExplainer: 'Reconciliation catches errors and ensures accurate financial records.',
    standardRefs: 'GAAP, Month-End Close Best Practices, Accounting Standards',
    acceptance: 'Monthly reconciliation; <10 day close; discrepancies resolved',
    orderIndex: 22,
    options: [
      { id: 'cfo-019-1', label: 'Yes, monthly with fast close', value: 'full' },
      { id: 'cfo-019-2', label: 'Monthly reconciliation', value: 'partial' },
      { id: 'cfo-019-3', label: 'Quarterly reconciliation', value: 'minimal' },
      { id: 'cfo-019-4', label: 'No regular reconciliation', value: 'none' },
    ],
    isRequired: true,
  },
  {
    id: 'q-cfo-020',
    text: 'Do you have segregation of duties for financial transactions?',
    type: QuestionType.SINGLE_CHOICE,
    persona: Persona.CFO,
    dimensionKey: 'finance',
    severity: 0.8,
    bestPractice:
      'Separate request, approval, and execution roles; require dual signatures for large payments',
    practicalExplainer:
      'Segregation of duties prevents fraud by requiring multiple people for transactions.',
    standardRefs: 'COSO Framework, SOX Controls, Internal Audit Standards',
    acceptance: 'Duties separated; dual signatures required; access controls in place',
    orderIndex: 23,
    options: [
      { id: 'cfo-020-1', label: 'Yes, formal segregation of duties', value: 'full' },
      { id: 'cfo-020-2', label: 'Dual approval for large amounts', value: 'partial' },
      { id: 'cfo-020-3', label: 'Limited separation', value: 'minimal' },
      { id: 'cfo-020-4', label: 'No segregation of duties', value: 'none' },
    ],
    isRequired: true,
  },
];

// Combined CFO questions
export const cfoQuestions: CFOQuestion[] = [
  ...unitEconomicsQuestions,
  ...runwayQuestions,
  ...spendGovernanceQuestions,
];

export default cfoQuestions;
