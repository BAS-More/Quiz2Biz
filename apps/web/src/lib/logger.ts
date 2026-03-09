/**
 * Centralized logger for Quiz2Biz Web
 *
 * In production builds console output is suppressed to prevent
 * information leakage. In development all levels print normally.
 */

const IS_DEV = import.meta.env.DEV;

/* eslint-disable no-console */
const noop = (): void => {};

export const logger = {
  /** Debug-level — dev only */
  debug: IS_DEV ? console.debug.bind(console) : noop,

  /** Info-level — dev only */
  log: IS_DEV ? console.log.bind(console) : noop,

  /** Warning-level — dev only */
  warn: IS_DEV ? console.warn.bind(console) : noop,

  /** Error-level — always active (errors should surface to monitoring) */
  error: console.error.bind(console),
};
/* eslint-enable no-console */
