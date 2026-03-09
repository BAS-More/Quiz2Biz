/**
 * Tooltip.tsx
 * Accessible tooltip component for help text and contextual information
 * Uses CSS positioning and hover/focus states
 */

import React, { useState, useRef, useCallback } from 'react';
import { HelpCircle, Info, AlertCircle, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'default' | 'info' | 'help' | 'warning';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  delay?: number;
  maxWidth?: string | number;
  className?: string;
  disabled?: boolean;
}

const POSITION_CLASSES: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_CLASSES: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  variant: _variant = 'default',
  delay = 200,
  maxWidth = 250,
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const maxWidthStyle = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          className={clsx(
            'absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg pointer-events-none',
            'bg-surface-800 text-white',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            POSITION_CLASSES[position],
            className
          )}
          style={{ maxWidth: maxWidthStyle }}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <span
            className={clsx(
              'absolute w-0 h-0 border-[6px] border-surface-800',
              ARROW_CLASSES[position]
            )}
          />
        </div>
      )}
    </div>
  );
}

// Help icon with tooltip
interface HelpTooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  size?: 'sm' | 'md' | 'lg';
  variant?: TooltipVariant;
  className?: string;
}

const VARIANT_ICONS: Record<TooltipVariant, LucideIcon> = {
  default: Info,
  info: Info,
  help: HelpCircle,
  warning: AlertCircle,
};

const VARIANT_COLORS: Record<TooltipVariant, string> = {
  default: 'text-surface-400 hover:text-surface-600',
  info: 'text-blue-400 hover:text-blue-600',
  help: 'text-surface-400 hover:text-surface-600',
  warning: 'text-warning-400 hover:text-warning-600',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function HelpTooltip({
  content,
  position = 'top',
  size = 'md',
  variant = 'help',
  className,
}: HelpTooltipProps) {
  const Icon = VARIANT_ICONS[variant];

  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className={clsx(
          'inline-flex items-center justify-center transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-full',
          VARIANT_COLORS[variant],
          className
        )}
        aria-label="Help"
      >
        <Icon className={SIZE_CLASSES[size]} />
      </button>
    </Tooltip>
  );
}

// Field label with help tooltip
interface LabelWithHelpProps {
  label: string;
  helpText: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

export function LabelWithHelp({
  label,
  helpText,
  htmlFor,
  required,
  className,
}: LabelWithHelpProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx(
        'flex items-center gap-1.5 text-sm font-medium text-surface-700',
        className
      )}
    >
      {label}
      {required && <span className="text-danger-500">*</span>}
      <HelpTooltip content={helpText} size="sm" />
    </label>
  );
}

// Info banner with dismissible option
interface InfoBannerProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'help' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const BANNER_VARIANTS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    text: 'text-blue-700',
  },
  help: {
    bg: 'bg-surface-50',
    border: 'border-surface-200',
    icon: 'text-surface-500',
    text: 'text-surface-700',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    icon: 'text-warning-500',
    text: 'text-warning-700',
  },
};

export function InfoBanner({
  title,
  children,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className,
}: InfoBannerProps) {
  const Icon = VARIANT_ICONS[variant];
  const styles = BANNER_VARIANTS[variant];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.bg,
        styles.border,
        className
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1">
        {title && (
          <h4 className={clsx('font-medium mb-1', styles.text)}>{title}</h4>
        )}
        <div className={clsx('text-sm', styles.text)}>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={clsx(
            'flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors',
            styles.text
          )}
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Tooltip;
