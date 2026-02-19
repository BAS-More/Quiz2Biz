/**
 * Feature flags — controls visibility of legacy and experimental features.
 * Set via VITE_ environment variables; defaults are V1-safe.
 */
export const featureFlags = {
  /** Show legacy readiness modules: Evidence Registry, Decision Log, Policy Pack */
  legacyModules: import.meta.env.VITE_ENABLE_LEGACY_MODULES === 'true',
} as const;
