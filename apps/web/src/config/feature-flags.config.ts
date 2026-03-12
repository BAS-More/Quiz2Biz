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
} as const;
