/**
 * Confirmation Dialog Component
 *
 * Provides "Are you sure?" modals for destructive actions.
 * Nielsen Heuristic: Error Prevention - Confirm before irreversible actions.
 */

import React, { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  /** Additional detail explaining consequences */
  detail?: string;
  /** Don't show again checkbox */
  showDontAskAgain?: boolean;
  onDontAskAgainChange?: (checked: boolean) => void;
  /** Require typing confirmation text */
  requireTypedConfirmation?: string;
}

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<ConfirmationVariant, { icon: string; button: string; iconBg: string }> =
  {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      iconBg: 'bg-red-100',
    },
    warning: {
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      iconBg: 'bg-yellow-100',
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      iconBg: 'bg-blue-100',
    },
  };

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  Warning: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ============================================================================
// Component
// ============================================================================

export function ConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  detail,
  showDontAskAgain = false,
  onDontAskAgainChange,
  requireTypedConfirmation,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [typedValue, setTypedValue] = React.useState('');
  const [dontAskAgain, setDontAskAgain] = React.useState(false);

  const styles = variantStyles[variant];
  const canConfirm = requireTypedConfirmation ? typedValue === requireTypedConfirmation : true;

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) {
      setTypedValue('');
      return;
    }

    // Focus the cancel button on open (safer default)
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  const handleDontAskAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDontAskAgain(checked);
    onDontAskAgainChange?.(checked);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="dialog-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          ref={dialogRef}
          className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-in zoom-in-95 duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-md"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <Icons.X className="h-6 w-6" />
          </button>

          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              <div
                className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}
              >
                <Icons.Warning className={`h-6 w-6 ${styles.icon}`} />
              </div>

              {/* Content */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className="text-lg font-semibold leading-6 text-gray-900" id="dialog-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                  {detail && <p className="mt-2 text-sm text-gray-400 italic">{detail}</p>}
                </div>

                {/* Typed confirmation */}
                {requireTypedConfirmation && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type{' '}
                      <span className="font-bold text-red-600">{requireTypedConfirmation}</span> to
                      confirm:
                    </label>
                    <input
                      type="text"
                      value={typedValue}
                      onChange={(e) => setTypedValue(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                      placeholder={requireTypedConfirmation}
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Don't ask again */}
                {showDontAskAgain && (
                  <div className="mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dontAskAgain}
                        onChange={handleDontAskAgainChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Don't ask me again</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
            <button
              ref={confirmButtonRef}
              type="button"
              disabled={!canConfirm}
              className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              onClick={() => {
                onConfirm();
                if (dontAskAgain && onDontAskAgainChange) {
                  onDontAskAgainChange(true);
                }
              }}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Hook for managing confirmation state
// ============================================================================

export interface UseConfirmationOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  detail?: string;
  onConfirm: () => void | Promise<void>;
  /** Key for localStorage to persist "don't ask again" */
  storageKey?: string;
}

export function useConfirmation(options: UseConfirmationOptions) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const checkDontAskAgain = () => {
    if (!options.storageKey) {
      return false;
    }
    try {
      return localStorage.getItem(`confirm_skip_${options.storageKey}`) === 'true';
    } catch {
      return false;
    }
  };

  const show = () => {
    if (checkDontAskAgain()) {
      // Skip confirmation, execute directly
      handleConfirm();
    } else {
      setIsOpen(true);
    }
  };

  const hide = () => setIsOpen(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await options.onConfirm();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleDontAskAgainChange = (checked: boolean) => {
    if (options.storageKey) {
      try {
        if (checked) {
          localStorage.setItem(`confirm_skip_${options.storageKey}`, 'true');
        } else {
          localStorage.removeItem(`confirm_skip_${options.storageKey}`);
        }
      } catch {
        // Ignore storage errors
      }
    }
  };

  const dialogProps: ConfirmationDialogProps = {
    isOpen,
    onConfirm: handleConfirm,
    onCancel: hide,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    variant: options.variant,
    detail: options.detail,
    showDontAskAgain: !!options.storageKey,
    onDontAskAgainChange: handleDontAskAgainChange,
  };

  return {
    show,
    hide,
    isOpen,
    isLoading,
    dialogProps,
    Dialog: () => <ConfirmationDialog {...dialogProps} />,
  };
}

// ============================================================================
// Pre-configured confirmation dialogs
// ============================================================================

export const confirmationPresets = {
  logout: {
    title: 'Sign out?',
    message: 'You will need to sign in again to access your questionnaires.',
    confirmText: 'Sign Out',
    cancelText: 'Stay Signed In',
    variant: 'warning' as const,
  },
  deleteSession: {
    title: 'Delete session?',
    message:
      'This will permanently delete this assessment session and all responses. This action cannot be undone.',
    confirmText: 'Delete Session',
    cancelText: 'Keep Session',
    variant: 'danger' as const,
    detail: 'All answers and evidence attachments will be permanently lost.',
  },
  discardChanges: {
    title: 'Discard changes?',
    message: 'You have unsaved changes that will be lost if you leave this page.',
    confirmText: 'Discard Changes',
    cancelText: 'Keep Editing',
    variant: 'warning' as const,
  },
  resetForm: {
    title: 'Start over?',
    message: 'This will clear all your answers and reset the questionnaire to question 1.',
    confirmText: 'Clear All',
    cancelText: 'Keep Answers',
    variant: 'danger' as const,
    detail: 'You can save your current progress before clearing if needed.',
  },
  deleteFile: {
    title: 'Delete file?',
    message: 'This file will be permanently deleted from the evidence attachments.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger' as const,
  },
  cancelSubscription: {
    title: 'Cancel subscription?',
    message: 'Your subscription will remain active until the end of the billing period.',
    confirmText: 'Cancel Subscription',
    cancelText: 'Keep Subscription',
    variant: 'warning' as const,
    detail: 'You can resubscribe at any time.',
  },
};

export default ConfirmationDialog;
