/**
 * Contextual Tooltips Component
 *
 * Wrapper around Tippy.js for consistent tooltip styling.
 * Provides tooltips for complex UI elements:
 * - Dimension names
 * - Residual risk
 * - Coverage levels
 * - Score indicators
 *
 * Nielsen Heuristic #10: Help and Documentation
 */

import React, { useCallback, useState, useEffect, createContext, useContext } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export type TooltipTheme = 'light' | 'dark' | 'info' | 'warning' | 'error' | 'success';

export interface TooltipProps {
  /** Content to display in tooltip */
  content: React.ReactNode;
  /** Tooltip placement relative to trigger */
  placement?: TooltipPlacement;
  /** Visual theme */
  theme?: TooltipTheme;
  /** Delay before showing (ms) */
  delay?: number | [number, number];
  /** Whether tooltip is enabled */
  disabled?: boolean;
  /** Whether tooltip is interactive (hoverable) */
  interactive?: boolean;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Custom class name */
  className?: string;
  /** Children (trigger element) */
  children: React.ReactElement;
  /** Show arrow */
  arrow?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Custom offset [skidding, distance] */
  offset?: [number, number];
  /** Trigger events */
  trigger?: 'mouseenter' | 'click' | 'focus' | 'manual';
  /** Controlled visibility */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibleChange?: (visible: boolean) => void;
}

// ============================================================================
// Context for global tooltip settings
// ============================================================================

interface TooltipContextValue {
  defaultDelay: number | [number, number];
  defaultTheme: TooltipTheme;
  tooltipsEnabled: boolean;
  setTooltipsEnabled: (enabled: boolean) => void;
}

const TooltipContext = createContext<TooltipContextValue>({
  defaultDelay: 200,
  defaultTheme: 'dark',
  tooltipsEnabled: true,
  setTooltipsEnabled: () => {},
});

export const TooltipProvider: React.FC<{
  children: React.ReactNode;
  defaultDelay?: number | [number, number];
  defaultTheme?: TooltipTheme;
  initialEnabled?: boolean;
}> = ({ children, defaultDelay = 200, defaultTheme = 'dark', initialEnabled = true }) => {
  // Initialize from localStorage
  const [tooltipsEnabled, setTooltipsEnabled] = useState(() => {
    const stored = localStorage.getItem('tooltipsEnabled');
    return stored !== null ? stored === 'true' : initialEnabled;
  });

  const handleSetEnabled = useCallback((enabled: boolean) => {
    setTooltipsEnabled(enabled);
    localStorage.setItem('tooltipsEnabled', String(enabled));
  }, []);

  return (
    <TooltipContext.Provider
      value={{
        defaultDelay,
        defaultTheme,
        tooltipsEnabled,
        setTooltipsEnabled: handleSetEnabled,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltipSettings = () => useContext(TooltipContext);

// ============================================================================
// CSS-only Tooltip Implementation
// (For environments where Tippy.js is not installed)
// ============================================================================

const tooltipStyles = `
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip-trigger {
  display: inline-flex;
  cursor: help;
}

.tooltip-content {
  position: absolute;
  z-index: 9999;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.tooltip-content--interactive {
  pointer-events: auto;
}

.tooltip-content--visible {
  opacity: 1;
  visibility: visible;
}

/* Placements */
.tooltip-content--top {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  margin-bottom: 8px;
}

.tooltip-content--top-start {
  bottom: 100%;
  left: 0;
  transform: translateY(-8px);
  margin-bottom: 8px;
}

.tooltip-content--top-end {
  bottom: 100%;
  right: 0;
  transform: translateY(-8px);
  margin-bottom: 8px;
}

.tooltip-content--bottom {
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  margin-top: 8px;
}

.tooltip-content--bottom-start {
  top: 100%;
  left: 0;
  transform: translateY(8px);
  margin-top: 8px;
}

.tooltip-content--bottom-end {
  top: 100%;
  right: 0;
  transform: translateY(8px);
  margin-top: 8px;
}

.tooltip-content--left {
  right: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(-8px);
  margin-right: 8px;
}

.tooltip-content--right {
  left: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  margin-left: 8px;
}

/* Themes */
.tooltip-content--dark {
  background: #1a1a2e;
  color: #ffffff;
}

.tooltip-content--light {
  background: #ffffff;
  color: #1a1a2e;
  border: 1px solid #e2e8f0;
}

.tooltip-content--info {
  background: #3182ce;
  color: #ffffff;
}

.tooltip-content--warning {
  background: #dd6b20;
  color: #ffffff;
}

.tooltip-content--error {
  background: #e53e3e;
  color: #ffffff;
}

.tooltip-content--success {
  background: #38a169;
  color: #ffffff;
}

/* Arrow */
.tooltip-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: rotate(45deg);
}

.tooltip-content--top .tooltip-arrow,
.tooltip-content--top-start .tooltip-arrow,
.tooltip-content--top-end .tooltip-arrow {
  bottom: -5px;
  left: 50%;
  margin-left: -5px;
}

.tooltip-content--bottom .tooltip-arrow,
.tooltip-content--bottom-start .tooltip-arrow,
.tooltip-content--bottom-end .tooltip-arrow {
  top: -5px;
  left: 50%;
  margin-left: -5px;
}

.tooltip-content--left .tooltip-arrow {
  right: -5px;
  top: 50%;
  margin-top: -5px;
}

.tooltip-content--right .tooltip-arrow {
  left: -5px;
  top: 50%;
  margin-top: -5px;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'quiz2biz-tooltip-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = tooltipStyles;
    document.head.appendChild(styleEl);
  }
}

// ============================================================================
// Main Tooltip Component
// ============================================================================

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  theme,
  delay = 200,
  disabled = false,
  interactive = false,
  maxWidth = 300,
  className = '',
  children,
  arrow = true,
  trigger = 'mouseenter',
  visible: controlledVisible,
  onVisibleChange,
}) => {
  const { defaultTheme, tooltipsEnabled } = useTooltipSettings();
  const [internalVisible, setInternalVisible] = useState(false);
  const [delayTimeout, setDelayTimeout] = useState<NodeJS.Timeout | null>(null);

  const effectiveTheme = theme || defaultTheme;
  const isControlled = controlledVisible !== undefined;
  const isVisible = isControlled ? controlledVisible : internalVisible;

  // Determine show/hide delays
  const showDelay = Array.isArray(delay) ? delay[0] : delay;
  const hideDelay = Array.isArray(delay) ? delay[1] : 0;

  const show = useCallback(() => {
    if (disabled || !tooltipsEnabled) {
      return;
    }

    if (delayTimeout) {
      clearTimeout(delayTimeout);
    }

    const timeout = setTimeout(() => {
      if (isControlled) {
        onVisibleChange?.(true);
      } else {
        setInternalVisible(true);
      }
    }, showDelay);

    setDelayTimeout(timeout);
  }, [disabled, tooltipsEnabled, showDelay, isControlled, onVisibleChange, delayTimeout]);

  const hide = useCallback(() => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
    }

    const timeout = setTimeout(() => {
      if (isControlled) {
        onVisibleChange?.(false);
      } else {
        setInternalVisible(false);
      }
    }, hideDelay);

    setDelayTimeout(timeout);
  }, [hideDelay, isControlled, onVisibleChange, delayTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (delayTimeout) {
        clearTimeout(delayTimeout);
      }
    };
  }, [delayTimeout]);

  // Event handlers based on trigger type
  const triggerProps: React.HTMLAttributes<HTMLElement> = {};

  if (trigger === 'mouseenter') {
    triggerProps.onMouseEnter = show;
    triggerProps.onMouseLeave = hide;
    triggerProps.onFocus = show;
    triggerProps.onBlur = hide;
  } else if (trigger === 'click') {
    triggerProps.onClick = () => (isVisible ? hide() : show());
  } else if (trigger === 'focus') {
    triggerProps.onFocus = show;
    triggerProps.onBlur = hide;
  }

  if (disabled || !tooltipsEnabled) {
    return children;
  }

  return (
    <div className={`tooltip-wrapper ${className}`}>
      <div
        className="tooltip-trigger"
        {...triggerProps}
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        {children}
      </div>
      <div
        id="tooltip-content"
        role="tooltip"
        className={`
          tooltip-content 
          tooltip-content--${placement} 
          tooltip-content--${effectiveTheme}
          ${interactive ? 'tooltip-content--interactive' : ''}
          ${isVisible ? 'tooltip-content--visible' : ''}
        `}
        style={{ maxWidth }}
        onMouseEnter={interactive ? show : undefined}
        onMouseLeave={interactive ? hide : undefined}
      >
        {arrow && <div className="tooltip-arrow" />}
        {content}
      </div>
    </div>
  );
};

// ============================================================================
// Predefined Tooltip Content
// ============================================================================

export const TOOLTIP_CONTENT = {
  // Dimensions
  dimensions: {
    TECHNICAL_ARCHITECTURE: {
      title: 'Technical Architecture',
      description:
        'Evaluates system design, scalability, modularity, and technical debt management.',
    },
    SECURITY_POSTURE: {
      title: 'Security Posture',
      description:
        'Measures protection mechanisms including authentication, encryption, and vulnerability management.',
    },
    COMPLIANCE: {
      title: 'Compliance',
      description:
        'Assesses adherence to regulatory standards like ISO 27001, NIST CSF, GDPR, and SOC 2.',
    },
    OPERATIONS: {
      title: 'Operations',
      description:
        'Evaluates monitoring, incident response, backup procedures, and disaster recovery capabilities.',
    },
    DOCUMENTATION: {
      title: 'Documentation',
      description:
        'Measures completeness and quality of technical docs, runbooks, and architectural decision records.',
    },
    DATA_MANAGEMENT: {
      title: 'Data Management',
      description: 'Assesses data governance, quality, lineage tracking, and privacy controls.',
    },
    TEAM_CAPABILITY: {
      title: 'Team Capability',
      description:
        'Evaluates team skills, knowledge sharing, training programs, and succession planning.',
    },
    PROCESS_MATURITY: {
      title: 'Process Maturity',
      description: 'Measures SDLC practices, code review processes, and deployment automation.',
    },
    VENDOR_MANAGEMENT: {
      title: 'Vendor Management',
      description:
        'Assesses third-party risk, vendor security assessments, and contract management.',
    },
    BUSINESS_CONTINUITY: {
      title: 'Business Continuity',
      description: 'Evaluates disaster recovery plans, RTO/RPO targets, and failover capabilities.',
    },
    FINANCIAL_CONTROLS: {
      title: 'Financial Controls',
      description: 'Measures budget management, cost optimization, and financial governance.',
    },
  },

  // Metrics
  metrics: {
    COVERAGE: {
      title: 'Coverage Level',
      description: `Indicates implementation completeness:
• 0% - Not implemented
• 25% - Partially planned
• 50% - In progress
• 75% - Mostly complete
• 100% - Fully implemented`,
    },
    RESIDUAL_RISK: {
      title: 'Residual Risk',
      description: `Risk remaining after controls:
• < 0.05 - Negligible (green)
• 0.05-0.10 - Low (yellow)
• 0.10-0.15 - Medium (orange)
• > 0.15 - High (red)

Formula: Severity × (1 - Coverage)`,
    },
    READINESS_SCORE: {
      title: 'Readiness Score',
      description: `Overall production readiness:
• 0-50% - Critical gaps
• 50-75% - Significant work needed
• 75-90% - Good progress
• 90-95% - Near ready
• 95-100% - Production ready`,
    },
    CONFIDENCE: {
      title: 'Confidence Level',
      description:
        'How certain we are about this score based on evidence quality and verification status.',
    },
  },

  // UI Elements
  ui: {
    AUTOSAVE: {
      title: 'Auto-save Active',
      description:
        'Your answers are automatically saved every 30 seconds. Look for the green checkmark to confirm.',
    },
    DRAFT_RECOVERY: {
      title: 'Draft Recovery',
      description:
        'We found unsaved work from your last session. Click "Resume" to continue where you left off.',
    },
    PROGRESS_BAR: {
      title: 'Section Progress',
      description:
        'Shows your completion progress for the current section. Questions with ✓ have been answered.',
    },
    EVIDENCE_REQUIRED: {
      title: 'Evidence Recommended',
      description:
        'Attaching supporting documents (screenshots, policies, configs) increases your confidence score.',
    },
    SKIP_BUTTON: {
      title: 'Skip Question',
      description:
        'Skip this question for now. You can return to it anytime using the sidebar navigation.',
    },
  },
};

// ============================================================================
// Specialized Tooltip Components
// ============================================================================

interface InfoTooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  size?: 'sm' | 'md' | 'lg';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  placement = 'top',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'info-tooltip--sm',
    md: 'info-tooltip--md',
    lg: 'info-tooltip--lg',
  };

  return (
    <Tooltip content={content} placement={placement} theme="info">
      <button
        type="button"
        className={`info-tooltip ${sizeClasses[size]}`}
        aria-label="More information"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'sm' ? 16 : size === 'lg' ? 24 : 20,
          height: size === 'sm' ? 16 : size === 'lg' ? 24 : 20,
          borderRadius: '50%',
          backgroundColor: '#3182ce',
          color: 'white',
          fontSize: size === 'sm' ? 10 : size === 'lg' ? 14 : 12,
          fontWeight: 'bold',
          border: 'none',
          cursor: 'help',
          padding: 0,
        }}
      >
        ?
      </button>
    </Tooltip>
  );
};

interface DimensionTooltipProps {
  dimensionKey: keyof typeof TOOLTIP_CONTENT.dimensions;
  children: React.ReactElement;
}

export const DimensionTooltip: React.FC<DimensionTooltipProps> = ({ dimensionKey, children }) => {
  const content = TOOLTIP_CONTENT.dimensions[dimensionKey];
  if (!content) {
    return children;
  }

  return (
    <Tooltip
      content={
        <div style={{ padding: 4 }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{content.title}</strong>
          <span style={{ opacity: 0.9 }}>{content.description}</span>
        </div>
      }
      placement="top"
      theme="dark"
      maxWidth={280}
      interactive
    >
      {children}
    </Tooltip>
  );
};

interface MetricTooltipProps {
  metricKey: keyof typeof TOOLTIP_CONTENT.metrics;
  children: React.ReactElement;
  currentValue?: number;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  metricKey,
  children,
  currentValue,
}) => {
  const content = TOOLTIP_CONTENT.metrics[metricKey];
  if (!content) {
    return children;
  }

  return (
    <Tooltip
      content={
        <div style={{ padding: 4 }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>
            {content.title}
            {currentValue !== undefined && (
              <span style={{ marginLeft: 8, fontWeight: 'normal' }}>
                ({(currentValue * 100).toFixed(0)}%)
              </span>
            )}
          </strong>
          <span style={{ whiteSpace: 'pre-line', opacity: 0.9 }}>{content.description}</span>
        </div>
      }
      placement="top"
      theme="dark"
      maxWidth={320}
      interactive
    >
      {children}
    </Tooltip>
  );
};

// ============================================================================
// Hook for tooltip accessibility
// ============================================================================

export function useTooltipAccessibility() {
  useEffect(() => {
    // Ensure tooltips work with keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close any open tooltips
        document.querySelectorAll('.tooltip-content--visible').forEach((el) => {
          el.classList.remove('tooltip-content--visible');
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

export default Tooltip;
