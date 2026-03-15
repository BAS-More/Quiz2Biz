/**
 * Conditional Provider Wrapper
 *
 * Wraps children with a provider only when a feature flag is enabled.
 * Avoids nested ternaries in the component tree while keeping
 * the React tree stable (same number of elements regardless of flag).
 */

import type { ReactNode, ComponentType } from 'react';

interface ConditionalProviderProps {
  /** Feature flag — when false the Provider is skipped */
  flag: boolean;
  /** The provider component to conditionally render */
  Provider: ComponentType<{ children: ReactNode }>;
  /** Child elements */
  children: ReactNode;
}

export function ConditionalProvider({ flag, Provider, children }: ConditionalProviderProps) {
  return flag ? <Provider>{children}</Provider> : <>{children}</>;
}
