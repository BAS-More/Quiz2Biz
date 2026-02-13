/**
 * Network Status Indicator Component
 *
 * Shows global network status:
 * - Offline/Slow/Online indicators
 * - Pending API calls count
 * - Connection quality visualization
 *
 * Nielsen Heuristic #1: Visibility of System Status
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type NetworkStatus = 'online' | 'offline' | 'slow' | 'reconnecting';

export interface NetworkInfo {
  status: NetworkStatus;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
  lastOnline?: Date;
  reconnectAttempts?: number;
}

export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  startTime: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
}

// ============================================================================
// Context
// ============================================================================

interface NetworkContextValue {
  networkInfo: NetworkInfo;
  pendingRequests: PendingRequest[];
  addPendingRequest: (id: string, url: string, method: string) => void;
  removePendingRequest: (id: string, status: 'success' | 'error' | 'timeout') => void;
  retryFailedRequests: () => void;
  isOffline: boolean;
  isSlow: boolean;
  pendingCount: number;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export const useNetworkStatus = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  }
  return context;
};

// ============================================================================
// Network Detection Utilities
// ============================================================================

function getNetworkInfo(): Partial<NetworkInfo> {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  return {};
}

function determineStatus(online: boolean, networkInfo: Partial<NetworkInfo>): NetworkStatus {
  if (!online) {
    return 'offline';
  }

  // Check for slow connection
  if (networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g') {
    return 'slow';
  }
  if (networkInfo.rtt && networkInfo.rtt > 500) {
    return 'slow';
  }
  if (networkInfo.downlink && networkInfo.downlink < 0.5) {
    return 'slow';
  }

  return 'online';
}

// ============================================================================
// Provider
// ============================================================================

interface NetworkStatusProviderProps {
  children: React.ReactNode;
  pingEndpoint?: string;
  pingInterval?: number;
  slowThresholdMs?: number;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({
  children,
  pingEndpoint = '/api/health',
  pingInterval = 30000, // 30 seconds
  slowThresholdMs = 3000,
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => ({
    status: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online',
    ...getNetworkInfo(),
  }));

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const lastOnlineRef = useRef<Date>(new Date());

  // Monitor online/offline events
  useEffect(() => {
    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      lastOnlineRef.current = new Date();
      const info = getNetworkInfo();
      setNetworkInfo((prev) => ({
        ...prev,
        ...info,
        status: determineStatus(true, info),
        lastOnline: lastOnlineRef.current,
        reconnectAttempts: 0,
      }));
    };

    const handleOffline = () => {
      setNetworkInfo((prev) => ({
        ...prev,
        status: 'offline',
        lastOnline: lastOnlineRef.current,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        const info = getNetworkInfo();
        setNetworkInfo((prev) => ({
          ...prev,
          ...info,
          status: determineStatus(navigator.onLine, info),
        }));
      };
      connection.addEventListener('change', handleConnectionChange);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic ping to verify actual connectivity
  useEffect(() => {
    const pingServer = async () => {
      if (!navigator.onLine) {
        return;
      }

      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), slowThresholdMs);

        await fetch(pingEndpoint, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);
        const rtt = Date.now() - startTime;

        setNetworkInfo((prev) => ({
          ...prev,
          status: rtt > slowThresholdMs ? 'slow' : 'online',
          rtt,
        }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setNetworkInfo((prev) => ({ ...prev, status: 'slow' }));
        } else {
          reconnectAttemptsRef.current++;
          setNetworkInfo((prev) => ({
            ...prev,
            status: 'reconnecting',
            reconnectAttempts: reconnectAttemptsRef.current,
          }));
        }
      }
    };

    const interval = setInterval(pingServer, pingInterval);
    pingServer(); // Initial ping

    return () => clearInterval(interval);
  }, [pingEndpoint, pingInterval, slowThresholdMs]);

  // Request tracking
  const addPendingRequest = useCallback((id: string, url: string, method: string) => {
    setPendingRequests((prev) => [
      ...prev,
      { id, url, method, startTime: Date.now(), status: 'pending' },
    ]);
  }, []);

  const removePendingRequest = useCallback(
    (id: string, status: 'success' | 'error' | 'timeout') => {
      setPendingRequests((prev) => prev.map((req) => (req.id === id ? { ...req, status } : req)));
      // Remove after animation
      setTimeout(() => {
        setPendingRequests((prev) => prev.filter((req) => req.id !== id));
      }, 2000);
    },
    [],
  );

  const retryFailedRequests = useCallback(() => {
    // This would be implemented based on your API client's retry mechanism
    console.log('Retrying failed requests...');
  }, []);

  const pendingCount = pendingRequests.filter((r) => r.status === 'pending').length;

  return (
    <NetworkContext.Provider
      value={{
        networkInfo,
        pendingRequests,
        addPendingRequest,
        removePendingRequest,
        retryFailedRequests,
        isOffline: networkInfo.status === 'offline',
        isSlow: networkInfo.status === 'slow',
        pendingCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// ============================================================================
// Network Status Banner Component
// ============================================================================

interface NetworkBannerProps {
  position?: 'top' | 'bottom';
  showPendingCount?: boolean;
  className?: string;
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({
  position = 'top',
  showPendingCount = true,
  className = '',
}) => {
  const { networkInfo, pendingCount, retryFailedRequests } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show banner when offline or slow
  useEffect(() => {
    const shouldShow =
      networkInfo.status === 'offline' ||
      networkInfo.status === 'slow' ||
      networkInfo.status === 'reconnecting';

    if (shouldShow) {
      setDismissed(false);
      setVisible(true);
    } else {
      // Delay hiding for animation
      setTimeout(() => setVisible(false), 300);
    }
  }, [networkInfo.status]);

  if (!visible && networkInfo.status === 'online') {
    return null;
  }
  if (dismissed) {
    return null;
  }

  const statusConfig = {
    offline: {
      icon: '📡',
      message: 'You are currently offline',
      description: 'Changes will be saved when you reconnect',
      color: '#e53e3e',
      bg: '#fff5f5',
      border: '#feb2b2',
    },
    slow: {
      icon: '🐢',
      message: 'Slow network detected',
      description: 'Some features may be delayed',
      color: '#dd6b20',
      bg: '#fffaf0',
      border: '#fbd38d',
    },
    reconnecting: {
      icon: '🔄',
      message: `Reconnecting... (attempt ${networkInfo.reconnectAttempts})`,
      description: 'Trying to restore connection',
      color: '#3182ce',
      bg: '#ebf8ff',
      border: '#90cdf4',
    },
    online: {
      icon: '✅',
      message: 'Back online',
      description: '',
      color: '#38a169',
      bg: '#f0fff4',
      border: '#9ae6b4',
    },
  };

  const config = statusConfig[networkInfo.status];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`network-banner network-banner--${position} ${className}`}
      style={{
        position: 'fixed',
        [position]: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        background: config.bg,
        borderBottom: position === 'top' ? `2px solid ${config.border}` : 'none',
        borderTop: position === 'bottom' ? `2px solid ${config.border}` : 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        animation: visible ? 'slideIn 0.3s ease' : 'slideOut 0.3s ease',
      }}
    >
      <span style={{ fontSize: 20 }}>{config.icon}</span>

      <div>
        <strong style={{ color: config.color, fontSize: 14 }}>{config.message}</strong>
        {config.description && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4a5568' }}>{config.description}</p>
        )}
      </div>

      {showPendingCount && pendingCount > 0 && (
        <span
          style={{
            padding: '4px 8px',
            background: config.color,
            color: 'white',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {pendingCount} pending
        </span>
      )}

      {networkInfo.status === 'offline' && (
        <button
          onClick={retryFailedRequests}
          style={{
            padding: '6px 12px',
            background: config.color,
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}

      <button
        onClick={() => setDismissed(true)}
        style={{
          padding: 4,
          background: 'transparent',
          border: 'none',
          fontSize: 16,
          cursor: 'pointer',
          color: '#718096',
        }}
        aria-label="Dismiss network status banner"
      >
        ✕
      </button>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(${position === 'top' ? '-100%' : '100%'}); }
          to { transform: translateY(0); }
        }
        @keyframes slideOut {
          from { transform: translateY(0); }
          to { transform: translateY(${position === 'top' ? '-100%' : '100%'}); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Network Status Indicator Component (Header)
// ============================================================================

interface NetworkIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const { networkInfo, pendingCount } = useNetworkStatus();

  const sizes = {
    sm: { dot: 8, font: 11, padding: '4px 8px' },
    md: { dot: 10, font: 12, padding: '6px 10px' },
    lg: { dot: 12, font: 14, padding: '8px 12px' },
  };

  const statusConfig = {
    online: { color: '#48bb78', label: 'Online', pulse: false },
    offline: { color: '#e53e3e', label: 'Offline', pulse: true },
    slow: { color: '#ecc94b', label: 'Slow', pulse: true },
    reconnecting: { color: '#3182ce', label: 'Reconnecting', pulse: true },
  };

  const config = statusConfig[networkInfo.status];
  const sizeConfig = sizes[size];

  return (
    <div
      className={`network-indicator ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: sizeConfig.padding,
        background: `${config.color}15`,
        borderRadius: 20,
      }}
      title={`Network: ${config.label}${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
    >
      <span
        style={{
          width: sizeConfig.dot,
          height: sizeConfig.dot,
          borderRadius: '50%',
          background: config.color,
          animation: config.pulse ? 'pulse 1.5s infinite' : 'none',
        }}
      />

      {showLabel && (
        <span style={{ fontSize: sizeConfig.font, color: config.color, fontWeight: 500 }}>
          {config.label}
        </span>
      )}

      {pendingCount > 0 && (
        <span
          style={{
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: config.color,
            color: 'white',
            borderRadius: 9,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {pendingCount}
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Pending Requests Dropdown
// ============================================================================

interface PendingRequestsDropdownProps {
  maxVisible?: number;
  className?: string;
}

export const PendingRequestsDropdown: React.FC<PendingRequestsDropdownProps> = ({
  maxVisible = 5,
  className = '',
}) => {
  const { pendingRequests } = useNetworkStatus();
  const [isOpen, setIsOpen] = useState(false);

  const pendingItems = pendingRequests.filter((r) => r.status === 'pending');

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <div className={`pending-requests ${className}`} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: '#ebf8ff',
          border: '1px solid #90cdf4',
          borderRadius: 6,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
        {pendingItems.length} loading
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 280,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
          }}
        >
          <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: 0, fontSize: 13, color: '#2d3748' }}>Active Requests</h4>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 8 }}>
            {pendingItems.slice(0, maxVisible).map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  borderRadius: 4,
                  background: '#f7fafc',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#3182ce',
                    animation: 'pulse 1s infinite',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{req.method}</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: '#718096',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {req.url}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Hook for wrapping fetch with network tracking
// ============================================================================

export function useTrackedFetch() {
  const { addPendingRequest, removePendingRequest, isOffline } = useNetworkStatus();

  const trackedFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      if (isOffline) {
        throw new Error('Network is offline');
      }

      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const method = options?.method || 'GET';

      addPendingRequest(requestId, url, method);

      try {
        const response = await fetch(url, options);
        removePendingRequest(requestId, 'success');
        return response;
      } catch (error) {
        removePendingRequest(requestId, 'error');
        throw error;
      }
    },
    [addPendingRequest, removePendingRequest, isOffline],
  );

  return trackedFetch;
}

export default NetworkStatusProvider;
