/**
 * Navigation Guards Component
 *
 * Prevents users from accidentally losing unsaved changes.
 * Shows "Unsaved changes will be lost" prompt.
 *
 * Nielsen Heuristic #5: Error Prevention
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DirtyFormState {
  formId: string;
  isDirty: boolean;
  message?: string;
  timestamp: number;
}

export interface NavigationGuardConfig {
  /** Default warning message */
  defaultMessage?: string;
  /** Whether to show confirmation dialog */
  showDialog?: boolean;
  /** Whether to prevent browser close/refresh */
  preventBrowserClose?: boolean;
  /** Debounce time for dirty state changes (ms) */
  debounceMs?: number;
}

// ============================================================================
// Context
// ============================================================================

interface NavigationGuardContextValue {
  dirtyForms: DirtyFormState[];
  registerDirtyForm: (formId: string, message?: string) => void;
  unregisterDirtyForm: (formId: string) => void;
  markFormClean: (formId: string) => void;
  markFormDirty: (formId: string, message?: string) => void;
  isDirty: boolean;
  confirmNavigation: (callback: () => void) => void;
  bypassGuard: () => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface NavigationGuardProviderProps {
  children: React.ReactNode;
  config?: NavigationGuardConfig;
}

export const NavigationGuardProvider: React.FC<NavigationGuardProviderProps> = ({
  children,
  config = {},
}) => {
  const {
    defaultMessage = 'You have unsaved changes. Are you sure you want to leave?',
    showDialog = true,
    preventBrowserClose = true,
  } = config;

  const [dirtyForms, setDirtyForms] = useState<DirtyFormState[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const bypassRef = useRef(false);

  const isDirty = dirtyForms.some((form) => form.isDirty);

  // Register a dirty form
  const registerDirtyForm = useCallback((formId: string, message?: string) => {
    setDirtyForms((prev) => {
      if (prev.some((f) => f.formId === formId)) {
        return prev.map((f) =>
          f.formId === formId ? { ...f, isDirty: true, message, timestamp: Date.now() } : f,
        );
      }
      return [...prev, { formId, isDirty: true, message, timestamp: Date.now() }];
    });
  }, []);

  // Unregister a form (e.g., on unmount)
  const unregisterDirtyForm = useCallback((formId: string) => {
    setDirtyForms((prev) => prev.filter((f) => f.formId !== formId));
  }, []);

  // Mark form as clean (e.g., after save)
  const markFormClean = useCallback((formId: string) => {
    setDirtyForms((prev) => prev.map((f) => (f.formId === formId ? { ...f, isDirty: false } : f)));
  }, []);

  // Mark form as dirty
  const markFormDirty = useCallback((formId: string, message?: string) => {
    setDirtyForms((prev) =>
      prev.map((f) =>
        f.formId === formId ? { ...f, isDirty: true, message, timestamp: Date.now() } : f,
      ),
    );
  }, []);

  // Confirm navigation
  const confirmNavigation = useCallback(
    (callback: () => void) => {
      if (bypassRef.current) {
        bypassRef.current = false;
        callback();
        return;
      }

      if (!isDirty) {
        callback();
        return;
      }

      if (showDialog) {
        setPendingNavigation(() => callback);
        setDialogOpen(true);
      } else {
        // Use browser confirm
        const confirmed = window.confirm(defaultMessage);
        if (confirmed) {
          callback();
        }
      }
    },
    [isDirty, showDialog, defaultMessage],
  );

  // Bypass guard once
  const bypassGuard = useCallback(() => {
    bypassRef.current = true;
  }, []);

  // Handle dialog confirmation
  const handleConfirm = useCallback(() => {
    setDialogOpen(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPendingNavigation(null);
  }, []);

  // Prevent browser close/refresh
  useEffect(() => {
    if (!preventBrowserClose || !isDirty) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = defaultMessage;
      return defaultMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [preventBrowserClose, isDirty, defaultMessage]);

  // Get the most specific message from dirty forms
  const dirtyMessage = dirtyForms.find((f) => f.isDirty && f.message)?.message || defaultMessage;

  return (
    <NavigationGuardContext.Provider
      value={{
        dirtyForms,
        registerDirtyForm,
        unregisterDirtyForm,
        markFormClean,
        markFormDirty,
        isDirty,
        confirmNavigation,
        bypassGuard,
      }}
    >
      {children}
      {dialogOpen && (
        <UnsavedChangesDialog
          message={dirtyMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NavigationGuardContext.Provider>
  );
};

// ============================================================================
// Unsaved Changes Dialog
// ============================================================================

interface UnsavedChangesDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  message,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  confirmText = 'Leave Page',
  cancelText = 'Stay',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector('button');
    firstButton?.focus();
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="nav-guard-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nav-guard-title"
        aria-describedby="nav-guard-message"
        className="nav-guard-dialog"
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fef3c7',
              borderRadius: 12,
              fontSize: 24,
            }}
          >
            ⚠️
          </span>
          <div style={{ flex: 1 }}>
            <h2
              id="nav-guard-title"
              style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#1a202c' }}
            >
              {title}
            </h2>
            <p
              id="nav-guard-message"
              style={{ margin: 0, fontSize: 14, color: '#4a5568', lineHeight: 1.5 }}
            >
              {message}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            marginTop: 24,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Hook: useDirtyForm
// ============================================================================

interface UseDirtyFormOptions {
  formId: string;
  message?: string;
  watchFields?: any[];
  initialDirty?: boolean;
}

interface UseDirtyFormReturn {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  markClean: () => void;
  reset: () => void;
}

export function useDirtyForm(options: UseDirtyFormOptions): UseDirtyFormReturn {
  const { formId, message, watchFields = [], initialDirty = false } = options;
  const { registerDirtyForm, unregisterDirtyForm, markFormClean, markFormDirty } =
    useNavigationGuard();
  const [isDirty, setIsDirty] = useState(initialDirty);
  const initialValuesRef = useRef(watchFields);

  // Register on mount, unregister on unmount
  useEffect(() => {
    if (initialDirty) {
      registerDirtyForm(formId, message);
    }
    return () => unregisterDirtyForm(formId);
  }, [formId, message, initialDirty, registerDirtyForm, unregisterDirtyForm]);

  // Watch for field changes
  useEffect(() => {
    if (watchFields.length === 0) {
      return;
    }

    const hasChanged = JSON.stringify(watchFields) !== JSON.stringify(initialValuesRef.current);

    if (hasChanged && !isDirty) {
      setIsDirty(true);
      markFormDirty(formId, message);
    }
  }, [watchFields, isDirty, formId, message, markFormDirty]);

  const setDirty = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
      if (dirty) {
        markFormDirty(formId, message);
      } else {
        markFormClean(formId);
      }
    },
    [formId, message, markFormDirty, markFormClean],
  );

  const markClean = useCallback(() => {
    setIsDirty(false);
    markFormClean(formId);
  }, [formId, markFormClean]);

  const reset = useCallback(() => {
    setIsDirty(false);
    markFormClean(formId);
    initialValuesRef.current = watchFields;
  }, [formId, markFormClean, watchFields]);

  return { isDirty, setDirty, markClean, reset };
}

// ============================================================================
// Prompt Component (React Router style)
// ============================================================================

interface NavigationPromptProps {
  when: boolean;
  message?: string;
}

export const NavigationPrompt: React.FC<NavigationPromptProps> = ({
  when,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}) => {
  const { registerDirtyForm, unregisterDirtyForm } = useNavigationGuard();
  const formId = useRef(`prompt-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (when) {
      registerDirtyForm(formId.current, message);
    } else {
      unregisterDirtyForm(formId.current);
    }

    return () => unregisterDirtyForm(formId.current);
  }, [when, message, registerDirtyForm, unregisterDirtyForm]);

  return null;
};

// ============================================================================
// Link with Navigation Guard
// ============================================================================

interface GuardedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: React.ReactNode;
}

export const GuardedLink: React.FC<GuardedLinkProps> = ({ to, children, onClick, ...props }) => {
  const { confirmNavigation, isDirty } = useNavigationGuard();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isDirty) {
        e.preventDefault();
        confirmNavigation(() => {
          window.location.href = to;
        });
      } else if (onClick) {
        onClick(e);
      }
    },
    [isDirty, to, confirmNavigation, onClick],
  );

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

// ============================================================================
// Form Wrapper with Auto-Dirty Detection
// ============================================================================

interface GuardedFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  formId: string;
  children: React.ReactNode;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const GuardedForm: React.FC<GuardedFormProps> = ({
  formId,
  children,
  onDirtyChange,
  onChange,
  onSubmit,
  ...props
}) => {
  const { registerDirtyForm, unregisterDirtyForm, markFormClean, markFormDirty: _markFormDirty } =
    useNavigationGuard();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    return () => unregisterDirtyForm(formId);
  }, [formId, unregisterDirtyForm]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      if (!isDirty) {
        setIsDirty(true);
        registerDirtyForm(formId);
        onDirtyChange?.(true);
      }
      onChange?.(e);
    },
    [isDirty, formId, registerDirtyForm, onDirtyChange, onChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      markFormClean(formId);
      setIsDirty(false);
      onDirtyChange?.(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSubmit?.(e as any);
    },
    [formId, markFormClean, onDirtyChange, onSubmit],
  );

  return (
    <form onChange={handleChange as any} onSubmit={handleSubmit as any} {...props}>
      {children}
    </form>
  );
};

// ============================================================================
// Dirty Indicator Badge
// ============================================================================

interface DirtyIndicatorProps {
  isDirty: boolean;
  message?: string;
  position?: 'top-right' | 'top-left' | 'inline';
  className?: string;
}

export const DirtyIndicator: React.FC<DirtyIndicatorProps> = ({
  isDirty,
  message = 'Unsaved changes',
  position = 'top-right',
  className = '',
}) => {
  if (!isDirty) {
    return null;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { position: 'absolute', top: -8, right: -8 },
    'top-left': { position: 'absolute', top: -8, left: -8 },
    inline: { position: 'relative' },
  };

  return (
    <span
      className={`dirty-indicator ${className}`}
      style={{
        ...positionStyles[position],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: '#fef3c7',
        color: '#92400e',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
      title={message}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#f59e0b',
          animation: 'pulse 1.5s infinite',
        }}
      />
      {message}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
};

export default NavigationGuardProvider;
