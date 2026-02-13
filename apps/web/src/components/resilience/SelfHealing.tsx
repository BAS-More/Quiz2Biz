/**
 * SelfHealing.tsx - Self-Healing Error Recovery System
 * Sprint 36 Task 1: Circuit breaker pattern, auto-retry with exponential backoff, fallback to cached data
 *
 * Nielsen Heuristics Addressed:
 * - #1 Visibility: Show recovery status, retry progress
 * - #5 Error prevention: Automatic error recovery
 * - #9 Help users recover: Self-healing mechanisms
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery */
  recoveryTimeout: number;
  /** Number of successes needed to close circuit */
  successThreshold: number;
  /** Window in ms to count failures */
  failureWindow: number;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastStateChange: Date;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd */
  jitter: boolean;
}

/**
 * Retry state
 */
export interface RetryState {
  attempts: number;
  nextDelay: number;
  isRetrying: boolean;
  lastError: Error | null;
}

/**
 * Cache entry for fallback data
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  key: string;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  /** Enable cached data fallback */
  useCachedData: boolean;
  /** Enable stale data (beyond TTL) in emergencies */
  allowStaleData: boolean;
  /** Maximum age of stale data in ms */
  maxStaleAge: number;
  /** Enable default value fallback */
  useDefaultValue: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  latency: number;
  lastChecked: Date;
  error?: string;
}

/**
 * Recovery action
 */
export interface RecoveryAction {
  id: string;
  type: 'retry' | 'fallback' | 'circuit_open' | 'circuit_close' | 'cache_hit' | 'cache_miss';
  service: string;
  timestamp: Date;
  success: boolean;
  details: string;
}

/**
 * Self-healing context value
 */
export interface SelfHealingContextValue {
  // Circuit breaker state per service
  circuits: Map<string, CircuitBreakerState>;

  // Recovery actions log
  recoveryLog: RecoveryAction[];

  // Health check results
  healthStatus: Map<string, HealthCheckResult>;

  // Global config
  isEnabled: boolean;

  // Actions
  executeWithResilience: <T>(
    service: string,
    operation: () => Promise<T>,
    options?: Partial<ResilienceOptions<T>>,
  ) => Promise<T>;

  getCircuitState: (service: string) => CircuitBreakerState;
  resetCircuit: (service: string) => void;
  checkHealth: (service: string, healthCheck: () => Promise<boolean>) => Promise<HealthCheckResult>;
  cacheData: <T>(key: string, data: T, ttl?: number) => void;
  getCachedData: <T>(key: string) => T | null;
  clearCache: (key?: string) => void;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Options for resilient execution
 */
export interface ResilienceOptions<T> {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  fallback: FallbackConfig;
  cacheKey?: string;
  defaultValue?: T;
  onRetry?: (attempt: number, error: Error) => void;
  onFallback?: (reason: string) => void;
  onCircuitStateChange?: (state: CircuitState) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000,
  successThreshold: 3,
  failureWindow: 60000,
};

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  useCachedData: true,
  allowStaleData: true,
  maxStaleAge: 300000, // 5 minutes
  useDefaultValue: true,
};

const STORAGE_KEYS = {
  CACHE: 'quiz2biz_resilience_cache',
  CIRCUITS: 'quiz2biz_circuit_states',
};

// ============================================================================
// Context
// ============================================================================

const SelfHealingContext = createContext<SelfHealingContextValue | null>(null);

export const useSelfHealing = (): SelfHealingContextValue => {
  const context = useContext(SelfHealingContext);
  if (!context) {
    throw new Error('useSelfHealing must be used within a SelfHealingProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface SelfHealingProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  defaultRetryConfig?: Partial<RetryConfig>;
  defaultCircuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  defaultFallbackConfig?: Partial<FallbackConfig>;
}

export const SelfHealingProvider: React.FC<SelfHealingProviderProps> = ({
  children,
  enabled = true,
  defaultRetryConfig,
  defaultCircuitBreakerConfig,
  defaultFallbackConfig,
}) => {
  const [circuits, setCircuits] = useState<Map<string, CircuitBreakerState>>(new Map());
  const [recoveryLog, setRecoveryLog] = useState<RecoveryAction[]>([]);
  const [healthStatus, setHealthStatus] = useState<Map<string, HealthCheckResult>>(new Map());
  const [isEnabled, setEnabled] = useState(enabled);
  const cacheRef = useRef<Map<string, CacheEntry<unknown>>>(new Map());

  // Merged default configs
  const retryConfig = useMemo(
    () => ({ ...DEFAULT_RETRY_CONFIG, ...defaultRetryConfig }),
    [defaultRetryConfig],
  );

  const circuitBreakerConfig = useMemo(
    () => ({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...defaultCircuitBreakerConfig }),
    [defaultCircuitBreakerConfig],
  );

  const fallbackConfig = useMemo(
    () => ({ ...DEFAULT_FALLBACK_CONFIG, ...defaultFallbackConfig }),
    [defaultFallbackConfig],
  );

  // Load cache from localStorage
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(STORAGE_KEYS.CACHE);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        const cacheMap = new Map<string, CacheEntry<unknown>>();
        Object.entries(parsed).forEach(([key, value]) => {
          cacheMap.set(key, value as CacheEntry<unknown>);
        });
        cacheRef.current = cacheMap;
      }

      const savedCircuits = localStorage.getItem(STORAGE_KEYS.CIRCUITS);
      if (savedCircuits) {
        const parsed = JSON.parse(savedCircuits);
        const circuitsMap = new Map<string, CircuitBreakerState>();
        Object.entries(parsed).forEach(([key, value]) => {
          circuitsMap.set(key, value as CircuitBreakerState);
        });
        setCircuits(circuitsMap);
      }
    } catch (error) {
      console.error('Failed to load resilience state:', error);
    }
  }, []);

  // Save circuits to localStorage
  useEffect(() => {
    const obj: Record<string, CircuitBreakerState> = {};
    circuits.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEYS.CIRCUITS, JSON.stringify(obj));
  }, [circuits]);

  // Log recovery action
  const logRecovery = useCallback((action: Omit<RecoveryAction, 'id' | 'timestamp'>) => {
    const newAction: RecoveryAction = {
      ...action,
      id: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setRecoveryLog((prev) => [newAction, ...prev.slice(0, 99)]); // Keep last 100
  }, []);

  // Get or create circuit breaker state
  const getCircuitState = useCallback(
    (service: string): CircuitBreakerState => {
      const existing = circuits.get(service);
      if (existing) {
        return existing;
      }

      const newState: CircuitBreakerState = {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
        lastStateChange: new Date(),
      };
      setCircuits((prev) => new Map(prev).set(service, newState));
      return newState;
    },
    [circuits],
  );

  // Update circuit breaker state
  const updateCircuit = useCallback(
    (service: string, update: Partial<CircuitBreakerState>) => {
      setCircuits((prev) => {
        const newCircuits = new Map(prev);
        const current = newCircuits.get(service) || getCircuitState(service);
        newCircuits.set(service, { ...current, ...update });
        return newCircuits;
      });
    },
    [getCircuitState],
  );

  // Reset circuit breaker
  const resetCircuit = useCallback(
    (service: string) => {
      const newState: CircuitBreakerState = {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
        lastStateChange: new Date(),
      };
      setCircuits((prev) => new Map(prev).set(service, newState));
      logRecovery({
        type: 'circuit_close',
        service,
        success: true,
        details: 'Circuit manually reset',
      });
    },
    [logRecovery],
  );

  // Cache data
  const cacheData = useCallback(<T,>(key: string, data: T, ttl: number = 60000) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      key,
    };
    cacheRef.current.set(key, entry as CacheEntry<unknown>);

    // Persist to localStorage
    const obj: Record<string, CacheEntry<unknown>> = {};
    cacheRef.current.forEach((value, k) => {
      obj[k] = value;
    });
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(obj));
  }, []);

  // Get cached data
  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    return entry.data;
  }, []);

  // Check if cached data is fresh
  const isCacheFresh = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) {
      return false;
    }

    const age = Date.now() - new Date(entry.timestamp).getTime();
    return age < entry.ttl;
  }, []);

  // Check if cached data is within stale limit
  const isCacheWithinStaleLimit = useCallback((key: string, maxStaleAge: number): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) {
      return false;
    }

    const age = Date.now() - new Date(entry.timestamp).getTime();
    return age < maxStaleAge;
  }, []);

  // Clear cache
  const clearCache = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }

    // Update localStorage
    const obj: Record<string, CacheEntry<unknown>> = {};
    cacheRef.current.forEach((value, k) => {
      obj[k] = value;
    });
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(obj));
  }, []);

  // Health check
  const checkHealth = useCallback(
    async (service: string, healthCheck: () => Promise<boolean>): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      let healthy = false;
      let error: string | undefined;

      try {
        healthy = await healthCheck();
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
      }

      const result: HealthCheckResult = {
        service,
        healthy,
        latency: Date.now() - startTime,
        lastChecked: new Date(),
        error,
      };

      setHealthStatus((prev) => new Map(prev).set(service, result));
      return result;
    },
    [],
  );

  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((attempt: number, config: RetryConfig): number => {
    const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

    if (config.jitter) {
      // Add random jitter between 0% and 25%
      const jitterFactor = 1 + Math.random() * 0.25;
      return Math.floor(cappedDelay * jitterFactor);
    }

    return cappedDelay;
  }, []);

  // Execute with circuit breaker
  const executeWithCircuitBreaker = useCallback(
    async <T,>(
      service: string,
      operation: () => Promise<T>,
      config: CircuitBreakerConfig,
      onStateChange?: (state: CircuitState) => void,
    ): Promise<T> => {
      const circuit = getCircuitState(service);

      // Check if circuit is open
      if (circuit.state === 'OPEN') {
        const timeSinceOpen = Date.now() - new Date(circuit.lastStateChange).getTime();

        if (timeSinceOpen < config.recoveryTimeout) {
          throw new Error(
            `Circuit breaker open for ${service}. Recovery in ${Math.ceil((config.recoveryTimeout - timeSinceOpen) / 1000)}s`,
          );
        }

        // Transition to half-open
        updateCircuit(service, { state: 'HALF_OPEN', lastStateChange: new Date() });
        onStateChange?.('HALF_OPEN');
      }

      try {
        const result = await operation();

        // Success handling
        if (circuit.state === 'HALF_OPEN') {
          const newSuccesses = circuit.successes + 1;

          if (newSuccesses >= config.successThreshold) {
            // Close circuit
            updateCircuit(service, {
              state: 'CLOSED',
              successes: 0,
              failures: 0,
              lastSuccess: new Date(),
              lastStateChange: new Date(),
            });
            onStateChange?.('CLOSED');
            logRecovery({
              type: 'circuit_close',
              service,
              success: true,
              details: `Circuit closed after ${newSuccesses} successes`,
            });
          } else {
            updateCircuit(service, {
              successes: newSuccesses,
              lastSuccess: new Date(),
            });
          }
        } else {
          updateCircuit(service, { lastSuccess: new Date() });
        }

        return result;
      } catch (error) {
        // Failure handling
        const newFailures = circuit.failures + 1;

        // Check if failures are within window
        const failuresInWindow = circuit.lastFailure
          ? Date.now() - new Date(circuit.lastFailure).getTime() < config.failureWindow
          : true;

        if (
          circuit.state === 'HALF_OPEN' ||
          (failuresInWindow && newFailures >= config.failureThreshold)
        ) {
          // Open circuit
          updateCircuit(service, {
            state: 'OPEN',
            failures: newFailures,
            lastFailure: new Date(),
            lastStateChange: new Date(),
          });
          onStateChange?.('OPEN');
          logRecovery({
            type: 'circuit_open',
            service,
            success: false,
            details: `Circuit opened after ${newFailures} failures`,
          });
        } else {
          updateCircuit(service, {
            failures: failuresInWindow ? newFailures : 1,
            lastFailure: new Date(),
          });
        }

        throw error;
      }
    },
    [getCircuitState, updateCircuit, logRecovery],
  );

  // Execute with retry
  const executeWithRetry = useCallback(
    async <T,>(
      service: string,
      operation: () => Promise<T>,
      config: RetryConfig,
      onRetry?: (attempt: number, error: Error) => void,
    ): Promise<T> => {
      let lastError: Error = new Error('Unknown error');

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await operation();

          if (attempt > 0) {
            logRecovery({
              type: 'retry',
              service,
              success: true,
              details: `Succeeded after ${attempt} retries`,
            });
          }

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < config.maxRetries) {
            const delay = calculateDelay(attempt, config);
            onRetry?.(attempt + 1, lastError);

            logRecovery({
              type: 'retry',
              service,
              success: false,
              details: `Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms`,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    },
    [calculateDelay, logRecovery],
  );

  // Main resilient execution method
  const executeWithResilience = useCallback(
    async <T,>(
      service: string,
      operation: () => Promise<T>,
      options?: Partial<ResilienceOptions<T>>,
    ): Promise<T> => {
      if (!isEnabled) {
        return operation();
      }

      const opts: ResilienceOptions<T> = {
        retry: { ...retryConfig, ...options?.retry },
        circuitBreaker: { ...circuitBreakerConfig, ...options?.circuitBreaker },
        fallback: { ...fallbackConfig, ...options?.fallback },
        cacheKey: options?.cacheKey,
        defaultValue: options?.defaultValue,
        onRetry: options?.onRetry,
        onFallback: options?.onFallback,
        onCircuitStateChange: options?.onCircuitStateChange,
      };

      try {
        // Execute with circuit breaker and retry
        const result = await executeWithCircuitBreaker(
          service,
          () => executeWithRetry(service, operation, opts.retry, opts.onRetry),
          opts.circuitBreaker,
          opts.onCircuitStateChange,
        );

        // Cache successful result
        if (opts.cacheKey) {
          cacheData(opts.cacheKey, result);
        }

        return result;
      } catch (error) {
        // Fallback logic
        if (opts.fallback.useCachedData && opts.cacheKey) {
          // Try fresh cache
          if (isCacheFresh(opts.cacheKey)) {
            const cached = getCachedData<T>(opts.cacheKey);
            if (cached !== null) {
              opts.onFallback?.('Using cached data');
              logRecovery({
                type: 'cache_hit',
                service,
                success: true,
                details: 'Fallback to cached data',
              });
              return cached;
            }
          }

          // Try stale cache
          if (
            opts.fallback.allowStaleData &&
            isCacheWithinStaleLimit(opts.cacheKey, opts.fallback.maxStaleAge)
          ) {
            const stale = getCachedData<T>(opts.cacheKey);
            if (stale !== null) {
              opts.onFallback?.('Using stale cached data');
              logRecovery({
                type: 'cache_hit',
                service,
                success: true,
                details: 'Fallback to stale cached data',
              });
              return stale;
            }
          }

          logRecovery({
            type: 'cache_miss',
            service,
            success: false,
            details: 'No cached data available',
          });
        }

        // Default value fallback
        if (opts.fallback.useDefaultValue && opts.defaultValue !== undefined) {
          opts.onFallback?.('Using default value');
          logRecovery({
            type: 'fallback',
            service,
            success: true,
            details: 'Fallback to default value',
          });
          return opts.defaultValue;
        }

        throw error;
      }
    },
    [
      isEnabled,
      retryConfig,
      circuitBreakerConfig,
      fallbackConfig,
      executeWithCircuitBreaker,
      executeWithRetry,
      cacheData,
      getCachedData,
      isCacheFresh,
      isCacheWithinStaleLimit,
      logRecovery,
    ],
  );

  const value: SelfHealingContextValue = {
    circuits,
    recoveryLog,
    healthStatus,
    isEnabled,
    executeWithResilience,
    getCircuitState,
    resetCircuit,
    checkHealth,
    cacheData,
    getCachedData,
    clearCache,
    setEnabled,
  };

  return <SelfHealingContext.Provider value={value}>{children}</SelfHealingContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  statusPanel: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  toggleButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  enabledButton: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  disabledButton: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  circuitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  circuitItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid',
  },
  circuitClosed: {
    borderLeftColor: '#22c55e',
  },
  circuitOpen: {
    borderLeftColor: '#ef4444',
  },
  circuitHalfOpen: {
    borderLeftColor: '#f59e0b',
  },
  circuitName: {
    fontWeight: 500,
    color: '#333',
    fontSize: '14px',
  },
  circuitState: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  stateOpen: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  stateClosed: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  stateHalfOpen: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  resetButton: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  recoveryLog: {
    marginTop: '16px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  logTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    marginBottom: '8px',
  },
  logList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  logItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    fontSize: '12px',
    borderBottom: '1px solid #f0f0f0',
  },
  logIcon: {
    fontSize: '14px',
  },
  logMessage: {
    flex: 1,
    color: '#333',
  },
  logTime: {
    color: '#888',
    fontSize: '11px',
  },
  retryIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e',
  },
  retrySpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #fbbf24',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  healthList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  healthItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  healthyBadge: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  unhealthyBadge: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  latency: {
    fontSize: '11px',
    color: '#888',
  },
};

// ============================================================================
// UI Components
// ============================================================================

/**
 * Circuit Breaker Status Panel
 */
export const CircuitBreakerPanel: React.FC = () => {
  const { circuits, isEnabled, setEnabled, resetCircuit, recoveryLog } = useSelfHealing();

  const getStateStyle = (state: CircuitState) => {
    switch (state) {
      case 'CLOSED':
        return { ...styles.circuitState, ...styles.stateClosed };
      case 'OPEN':
        return { ...styles.circuitState, ...styles.stateOpen };
      case 'HALF_OPEN':
        return { ...styles.circuitState, ...styles.stateHalfOpen };
    }
  };

  const getCircuitStyle = (state: CircuitState) => {
    switch (state) {
      case 'CLOSED':
        return { ...styles.circuitItem, ...styles.circuitClosed };
      case 'OPEN':
        return { ...styles.circuitItem, ...styles.circuitOpen };
      case 'HALF_OPEN':
        return { ...styles.circuitItem, ...styles.circuitHalfOpen };
    }
  };

  const getLogIcon = (type: RecoveryAction['type'], success: boolean) => {
    if (success) {
      switch (type) {
        case 'retry':
          return '🔄';
        case 'fallback':
          return '📦';
        case 'circuit_close':
          return '✅';
        case 'cache_hit':
          return '💾';
        default:
          return '✓';
      }
    }
    switch (type) {
      case 'retry':
        return '⏳';
      case 'circuit_open':
        return '🔴';
      case 'cache_miss':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div style={styles.statusPanel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Self-Healing Status</h3>
        <button
          style={{
            ...styles.toggleButton,
            ...(isEnabled ? styles.enabledButton : styles.disabledButton),
          }}
          onClick={() => setEnabled(!isEnabled)}
        >
          {isEnabled ? '✓ Enabled' : '✗ Disabled'}
        </button>
      </div>

      {circuits.size > 0 && (
        <div style={styles.circuitList}>
          {Array.from(circuits.entries()).map(([service, circuit]) => (
            <div key={service} style={getCircuitStyle(circuit.state)}>
              <span style={styles.circuitName}>{service}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={getStateStyle(circuit.state)}>{circuit.state}</span>
                {circuit.state !== 'CLOSED' && (
                  <button style={styles.resetButton} onClick={() => resetCircuit(service)}>
                    Reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {recoveryLog.length > 0 && (
        <div style={styles.recoveryLog}>
          <div style={styles.logTitle}>Recent Recovery Actions</div>
          <div style={styles.logList}>
            {recoveryLog.slice(0, 10).map((action) => (
              <div key={action.id} style={styles.logItem}>
                <span style={styles.logIcon}>{getLogIcon(action.type, action.success)}</span>
                <span style={styles.logMessage}>
                  {action.service}: {action.details}
                </span>
                <span style={styles.logTime}>{formatTime(action.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Health Status Panel
 */
export const HealthStatusPanel: React.FC = () => {
  const { healthStatus } = useSelfHealing();

  if (healthStatus.size === 0) {
    return null;
  }

  return (
    <div style={styles.statusPanel}>
      <h3 style={styles.title}>Service Health</h3>
      <div style={styles.healthList}>
        {Array.from(healthStatus.entries()).map(([service, result]) => (
          <div key={service} style={styles.healthItem}>
            <span style={styles.circuitName}>{service}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={result.healthy ? styles.healthyBadge : styles.unhealthyBadge}>
                {result.healthy ? 'Healthy' : 'Unhealthy'}
              </span>
              <span style={styles.latency}>{result.latency}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Retry Indicator Component
 */
interface RetryIndicatorProps {
  isRetrying: boolean;
  attempt: number;
  maxRetries: number;
  nextRetryIn?: number;
}

export const RetryIndicator: React.FC<RetryIndicatorProps> = ({
  isRetrying,
  attempt,
  maxRetries,
  nextRetryIn,
}) => {
  if (!isRetrying) {
    return null;
  }

  return (
    <div style={styles.retryIndicator} role="status" aria-live="polite">
      <div style={styles.retrySpinner} />
      <span>
        Retrying... Attempt {attempt}/{maxRetries}
        {nextRetryIn && ` (next in ${Math.ceil(nextRetryIn / 1000)}s)`}
      </span>
    </div>
  );
};

// ============================================================================
// Hook: useResilientFetch
// ============================================================================

interface ResilientFetchOptions<T> extends Partial<ResilienceOptions<T>> {
  service?: string;
}

/**
 * Hook for making resilient API calls
 */
export function useResilientFetch<T>(url: string, options?: ResilientFetchOptions<T>) {
  const { executeWithResilience } = useSelfHealing();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryState, setRetryState] = useState<RetryState>({
    attempts: 0,
    nextDelay: 0,
    isRetrying: false,
    lastError: null,
  });

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRetryState((prev) => ({ ...prev, isRetrying: false, attempts: 0 }));

    try {
      const result = await executeWithResilience<T>(
        options?.service || new URL(url).hostname,
        async () => {
          const response = await window.fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        },
        {
          ...options,
          cacheKey: options?.cacheKey || url,
          onRetry: (attempt, err) => {
            setRetryState((prev) => ({
              ...prev,
              attempts: attempt,
              isRetrying: true,
              lastError: err,
            }));
            options?.onRetry?.(attempt, err);
          },
        },
      );

      setData(result);
      setRetryState((prev) => ({ ...prev, isRetrying: false }));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setRetryState((prev) => ({
        ...prev,
        isRetrying: false,
        lastError: err,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [url, executeWithResilience, options]);

  return {
    data,
    error,
    isLoading,
    retryState,
    fetch,
    refetch: fetch,
  };
}

// ============================================================================
// Hook: useResilientMutation
// ============================================================================

/**
 * Hook for making resilient mutations
 */
export function useResilientMutation<TInput, TOutput>(
  service: string,
  mutationFn: (input: TInput) => Promise<TOutput>,
  options?: Partial<ResilienceOptions<TOutput>>,
) {
  const { executeWithResilience } = useSelfHealing();
  const [data, setData] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (input: TInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await executeWithResilience<TOutput>(
          service,
          () => mutationFn(input),
          options,
        );
        setData(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [service, mutationFn, executeWithResilience, options],
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    reset: () => {
      setData(null);
      setError(null);
    },
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  SelfHealingProvider,
  useSelfHealing,
  CircuitBreakerPanel,
  HealthStatusPanel,
  RetryIndicator,
  useResilientFetch,
  useResilientMutation,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_FALLBACK_CONFIG,
};
