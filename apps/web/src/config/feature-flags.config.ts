/**
 * Feature flags — controls visibility of legacy and experimental features.
 * Set via VITE_ environment variables; defaults are V1-safe.
 */

const envFlag = (key: string, fallback: boolean): boolean => {
  const val = import.meta.env[key];
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return fallback;
};

export const featureFlags = {
  /** Show legacy readiness modules: Evidence Registry, Decision Log, Policy Pack */
  legacyModules: envFlag('VITE_ENABLE_LEGACY_MODULES', false),
  /** Enable QPG prompt generation */
  qpg: envFlag('VITE_ENABLE_QPG', false),
  /** Enforce 95% readiness completion gate */
  readinessGate: envFlag('VITE_ENABLE_READINESS_GATE', false),
  /** Enable AI Chat Widget */
  aiChatWidget: envFlag('VITE_ENABLE_AI_CHAT', false),
  /** Enable real-time collaboration */
  realTimeCollab: envFlag('VITE_ENABLE_REALTIME', false),
  /** Enable onboarding tours for first-time users */
  onboarding: envFlag('VITE_ENABLE_ONBOARDING', false),
  /** Enable accessibility provider (keyboard nav, screen reader, voice) */
  accessibility: envFlag('VITE_ENABLE_ACCESSIBILITY', false),
  /** Enable internationalization / multi-language support */
  i18n: envFlag('VITE_ENABLE_I18N', false),
  /** Enable AI answer suggestions in questionnaire */
  aiSuggestions: envFlag('VITE_ENABLE_AI_SUGGESTIONS', false),
  /** Enable AI predictive form-error detection */
  aiPredictiveErrors: envFlag('VITE_ENABLE_AI_PREDICTIVE_ERRORS', false),
  /** Enable AI smart search in navigation */
  aiSmartSearch: envFlag('VITE_ENABLE_AI_SMART_SEARCH', false),
} as const;
