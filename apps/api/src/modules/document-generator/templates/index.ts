/**
 * Document Templates Index
 *
 * Exports all document template configurations for use by the document generator.
 */

export * from './base.template';
export * from './technology-roadmap.template';
export * from './business-plan.template';
export * from './technology-strategy.template';
export * from './product-architecture.template';
export * from './api-documentation.template';
export * from './data-models.template';
export * from './user-flow-maps.template';
export * from './technical-debt-register.template';
export * from './information-security-policy.template';
export * from './incident-response-plan.template';
export * from './data-protection-policy.template';
export * from './disaster-recovery-plan.template';
export * from './engineering-handbook.template';
export * from './vendor-management.template';
export * from './onboarding-offboarding.template';
export * from './ip-assignment-nda.template';
export * from './business-requirements.template';
export * from './functional-requirements.template';
export * from './process-maps.template';
export * from './user-stories.template';
export * from './requirements-traceability.template';
export * from './stakeholder-analysis.template';
export * from './business-case.template';
export * from './wireframes-mockups.template';
export * from './change-request.template';

/**
 * Registry of all available document templates by slug
 */
export const TEMPLATE_REGISTRY = {
  ['technology-roadmap']: () =>
    import('./technology-roadmap.template').then((m) => m.TECHNOLOGY_ROADMAP_TEMPLATE),
  ['business-plan']: () => import('./business-plan.template').then((m) => m.BUSINESS_PLAN_TEMPLATE),
  ['technology-strategy']: () =>
    import('./technology-strategy.template').then((m) => m.TECHNOLOGY_STRATEGY_TEMPLATE),
  ['product-architecture']: () =>
    import('./product-architecture.template').then((m) => m.PRODUCT_ARCHITECTURE_TEMPLATE),
  ['api-documentation']: () =>
    import('./api-documentation.template').then((m) => m.API_DOCUMENTATION_TEMPLATE),
  ['data-models']: () =>
    import('./data-models.template').then((m) => m.DATA_MODELS_TEMPLATE),
  ['user-flow-maps']: () =>
    import('./user-flow-maps.template').then((m) => m.USER_FLOW_MAPS_TEMPLATE),
  ['technical-debt-register']: () =>
    import('./technical-debt-register.template').then((m) => m.TECHNICAL_DEBT_REGISTER_TEMPLATE),
  ['information-security-policy']: () =>
    import('./information-security-policy.template').then((m) => m.INFORMATION_SECURITY_POLICY_TEMPLATE),
  ['incident-response-plan']: () =>
    import('./incident-response-plan.template').then((m) => m.INCIDENT_RESPONSE_PLAN_TEMPLATE),
  ['data-protection-policy']: () =>
    import('./data-protection-policy.template').then((m) => m.DATA_PROTECTION_POLICY_TEMPLATE),
  ['disaster-recovery-plan']: () =>
    import('./disaster-recovery-plan.template').then((m) => m.DISASTER_RECOVERY_PLAN_TEMPLATE),
  ['engineering-handbook']: () =>
    import('./engineering-handbook.template').then((m) => m.ENGINEERING_HANDBOOK_TEMPLATE),
  ['vendor-management']: () =>
    import('./vendor-management.template').then((m) => m.VENDOR_MANAGEMENT_TEMPLATE),
  ['onboarding-offboarding']: () =>
    import('./onboarding-offboarding.template').then((m) => m.ONBOARDING_OFFBOARDING_TEMPLATE),
  ['ip-assignment-nda']: () =>
    import('./ip-assignment-nda.template').then((m) => m.IP_ASSIGNMENT_NDA_TEMPLATE),
  ['business-requirements']: () =>
    import('./business-requirements.template').then((m) => m.BUSINESS_REQUIREMENTS_TEMPLATE),
  ['functional-requirements']: () =>
    import('./functional-requirements.template').then((m) => m.FUNCTIONAL_REQUIREMENTS_TEMPLATE),
  ['process-maps']: () =>
    import('./process-maps.template').then((m) => m.PROCESS_MAPS_TEMPLATE),
  ['user-stories']: () =>
    import('./user-stories.template').then((m) => m.USER_STORIES_TEMPLATE),
  ['requirements-traceability']: () =>
    import('./requirements-traceability.template').then((m) => m.REQUIREMENTS_TRACEABILITY_TEMPLATE),
  ['stakeholder-analysis']: () =>
    import('./stakeholder-analysis.template').then((m) => m.STAKEHOLDER_ANALYSIS_TEMPLATE),
  ['business-case']: () =>
    import('./business-case.template').then((m) => m.BUSINESS_CASE_TEMPLATE),
  ['wireframes-mockups']: () =>
    import('./wireframes-mockups.template').then((m) => m.WIREFRAMES_MOCKUPS_TEMPLATE),
  ['change-request']: () =>
    import('./change-request.template').then((m) => m.CHANGE_REQUEST_TEMPLATE),
} as const;

export type TemplateSlug = keyof typeof TEMPLATE_REGISTRY;
