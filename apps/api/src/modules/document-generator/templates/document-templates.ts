/**
 * Document generation templates for each document type.
 * Each template defines the section structure that AI will fill with content.
 */

export interface DocumentTemplateSection {
  heading: string;
  description: string;
  requiredFields?: string[];
}

export interface DocumentTemplate {
  slug: string;
  name: string;
  sections: DocumentTemplateSection[];
}

export const documentTemplates: Record<string, DocumentTemplate> = {
  'business-plan-doc': {
    slug: 'business-plan-doc',
    name: 'Business Plan',
    sections: [
      {
        heading: 'Executive Summary',
        description: 'High-level overview of the business, its mission, and key objectives.',
        requiredFields: ['business name', 'mission statement', 'key objectives'],
      },
      {
        heading: 'Problem & Opportunity',
        description: 'The problem being solved and the market opportunity.',
        requiredFields: ['problem statement', 'market opportunity size'],
      },
      {
        heading: 'Product/Service Description',
        description: 'Detailed description of the product or service, features, and value proposition.',
        requiredFields: ['product description', 'unique value proposition'],
      },
      {
        heading: 'Target Market & Customers',
        description: 'Customer segments, market size (TAM/SAM/SOM), and customer personas.',
        requiredFields: ['target segments', 'market size estimates'],
      },
      {
        heading: 'Business Model & Revenue',
        description: 'Revenue streams, pricing strategy, and unit economics.',
        requiredFields: ['revenue model', 'pricing approach'],
      },
      {
        heading: 'Go-to-Market Strategy',
        description: 'Marketing channels, launch strategy, and customer acquisition plan.',
        requiredFields: ['channels', 'launch plan'],
      },
      {
        heading: 'Operations Plan',
        description: 'Team structure, key hires, operational processes, and partnerships.',
        requiredFields: ['team structure', 'operational processes'],
      },
      {
        heading: 'Financial Projections',
        description: '3-5 year revenue projections, expense budgets, cash flow, and break-even analysis.',
        requiredFields: ['revenue projections', 'expense budget', 'break-even timeline'],
      },
      {
        heading: 'Risk Assessment & Mitigation',
        description: 'Key risks, mitigation strategies, and contingency plans.',
        requiredFields: ['risk factors', 'mitigation strategies'],
      },
      {
        heading: 'Milestones & Timeline',
        description: 'Key milestones, timeline, and success metrics.',
        requiredFields: ['milestones', 'timeline', 'KPIs'],
      },
    ],
  },

  'marketing-strategy-doc': {
    slug: 'marketing-strategy-doc',
    name: 'Marketing Strategy',
    sections: [
      {
        heading: 'Executive Summary',
        description: 'Overview of the marketing strategy and key goals.',
      },
      {
        heading: 'Target Audience Analysis',
        description: 'Customer personas, segments, behaviors, and pain points.',
        requiredFields: ['customer personas', 'segments'],
      },
      {
        heading: 'Brand & Positioning',
        description: 'Brand identity, value proposition, and competitive positioning.',
        requiredFields: ['brand positioning', 'key messages'],
      },
      {
        heading: 'Channel Strategy',
        description: 'Marketing channels, content distribution, and platform strategy.',
        requiredFields: ['primary channels', 'content types'],
      },
      {
        heading: 'Content Strategy',
        description: 'Content types, editorial calendar, SEO strategy, and thought leadership.',
        requiredFields: ['content pillars', 'publishing cadence'],
      },
      {
        heading: 'Customer Acquisition Plan',
        description: 'Paid media, organic growth, referral programs, and conversion funnels.',
        requiredFields: ['acquisition channels', 'funnel stages'],
      },
      {
        heading: 'Budget & Resources',
        description: 'Marketing budget allocation, team resources, and tool stack.',
        requiredFields: ['budget breakdown', 'resource allocation'],
      },
      {
        heading: 'Metrics & KPIs',
        description: 'Performance metrics, attribution models, and success criteria.',
        requiredFields: ['key metrics', 'targets'],
      },
    ],
  },

  'financial-projections-doc': {
    slug: 'financial-projections-doc',
    name: 'Financial Projections',
    sections: [
      {
        heading: 'Executive Summary',
        description: 'Overview of financial outlook and key projections.',
      },
      {
        heading: 'Revenue Model',
        description: 'Revenue streams, pricing tiers, growth assumptions, and conversion rates.',
        requiredFields: ['revenue streams', 'pricing', 'growth rate'],
      },
      {
        heading: 'Cost Structure',
        description: 'Fixed costs, variable costs, COGS, and operating expenses.',
        requiredFields: ['fixed costs', 'variable costs', 'COGS'],
      },
      {
        heading: 'Cash Flow Projections',
        description: 'Monthly/quarterly cash flow, burn rate, and runway analysis.',
        requiredFields: ['cash flow forecast', 'burn rate'],
      },
      {
        heading: 'Funding & Investment',
        description: 'Capital requirements, funding sources, equity structure, and use of funds.',
        requiredFields: ['capital needed', 'funding sources'],
      },
      {
        heading: 'Break-Even Analysis',
        description: 'Break-even point, margin targets, and path to profitability.',
        requiredFields: ['break-even point', 'margin targets'],
      },
      {
        heading: 'Scenarios & Sensitivity',
        description: 'Best/worst/expected case scenarios and key assumption sensitivity.',
        requiredFields: ['scenarios', 'key assumptions'],
      },
    ],
  },

  'investor-pitch-doc': {
    slug: 'investor-pitch-doc',
    name: 'Investor Pitch Deck',
    sections: [
      {
        heading: 'The Problem',
        description: 'Clear statement of the problem and who experiences it.',
      },
      {
        heading: 'The Solution',
        description: 'Your product/service and how it solves the problem.',
      },
      {
        heading: 'Market Opportunity',
        description: 'TAM, SAM, SOM and market growth trends.',
      },
      {
        heading: 'Business Model',
        description: 'How you make money, pricing, and unit economics.',
      },
      {
        heading: 'Traction',
        description: 'Key metrics, milestones achieved, and growth indicators.',
      },
      {
        heading: 'Team',
        description: 'Founders, key hires, and relevant experience.',
      },
      {
        heading: 'The Ask',
        description: 'Funding amount, use of funds, and expected milestones.',
      },
    ],
  },

  'ai-prompts-doc': {
    slug: 'ai-prompts-doc',
    name: 'AI Prompt Library',
    sections: [
      {
        heading: 'Business Operations Prompts',
        description: 'AI prompts for day-to-day business operations and decision-making.',
      },
      {
        heading: 'Marketing & Content Prompts',
        description: 'AI prompts for marketing copy, social media, and content creation.',
      },
      {
        heading: 'Customer Service Prompts',
        description: 'AI prompts for customer communication, support, and engagement.',
      },
      {
        heading: 'Financial Analysis Prompts',
        description: 'AI prompts for financial modeling, analysis, and reporting.',
      },
      {
        heading: 'Product Development Prompts',
        description: 'AI prompts for product ideation, specification, and testing.',
      },
      {
        heading: 'Customization Guide',
        description: 'How to customize and extend these prompts for your specific business needs.',
      },
    ],
  },

  'ms-strategy-doc': {
    slug: 'ms-strategy-doc',
    name: 'Marketing Strategy Report',
    sections: [
      {
        heading: 'Situation Analysis',
        description: 'Current market position, SWOT analysis, and competitive landscape.',
      },
      {
        heading: 'Target Market Definition',
        description: 'Detailed customer segments with demographics, psychographics, and behaviors.',
      },
      {
        heading: 'Strategic Objectives',
        description: 'Marketing goals tied to business objectives with measurable targets.',
      },
      {
        heading: 'Channel Mix Strategy',
        description: 'Recommended channels, budget allocation per channel, and expected ROI.',
      },
      {
        heading: 'Content & Messaging Framework',
        description: 'Core messaging, content pillars, brand voice guidelines.',
      },
      {
        heading: 'Implementation Timeline',
        description: 'Phased rollout plan with key milestones and resource requirements.',
      },
      {
        heading: 'Measurement Framework',
        description: 'KPIs, reporting cadence, and optimization methodology.',
      },
    ],
  },

  'fp-report-doc': {
    slug: 'fp-report-doc',
    name: 'Financial Projections Report',
    sections: [
      {
        heading: 'Executive Financial Summary',
        description: 'High-level financial overview and key takeaways.',
      },
      {
        heading: 'Revenue Forecast',
        description: 'Detailed 3-5 year revenue projections by stream.',
      },
      {
        heading: 'Operating Expenses',
        description: 'Detailed expense breakdown with growth assumptions.',
      },
      {
        heading: 'Cash Flow Statement',
        description: 'Monthly/quarterly cash flow with working capital analysis.',
      },
      {
        heading: 'Capital Structure',
        description: 'Equity, debt, and funding round analysis.',
      },
      {
        heading: 'Profitability Analysis',
        description: 'Gross margin, operating margin, and net income projections.',
      },
      {
        heading: 'Risk & Sensitivity',
        description: 'Monte Carlo or scenario analysis on key variables.',
      },
      {
        heading: 'Appendix: Assumptions',
        description: 'All key assumptions documented with rationale.',
      },
    ],
  },
};

/**
 * Get template by document type slug.
 */
export function getDocumentTemplate(slug: string): DocumentTemplate | null {
  return documentTemplates[slug] || null;
}

/**
 * Get all available document templates.
 */
export function getAllDocumentTemplates(): DocumentTemplate[] {
  return Object.values(documentTemplates);
}
