/**
 * Blur Validation Component
 *
 * Provides onBlur validation for form fields.
 * Shows errors immediately when user leaves field.
 * Prevents submit surprise.
 *
 * Nielsen Heuristic #9: Help Users Recognize, Diagnose, and Recover from Errors
 */

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ValidationRule<T = string> = {
  /** Validation function */
  validate: (value: T) => boolean;
  /** Error message if validation fails */
  message: string;
  /** When to run validation */
  when?: 'blur' | 'change' | 'submit' | 'always';
};

export interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  valid: boolean;
}

export interface FormFieldConfig {
  /** Field name/key */
  name: string;
  /** Initial value */
  initialValue?: string;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Whether field is required */
  required?: boolean;
  /** Required error message */
  requiredMessage?: string;
  /** Custom async validator */
  asyncValidator?: (value: string) => Promise<string | null>;
  /** Debounce time for async validation (ms) */
  asyncDebounce?: number;
}

// ============================================================================
// Common Validation Rules
// ============================================================================

export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
    when: 'always',
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`,
    when: 'blur',
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max,
    message: message || `Must be no more than ${max} characters`,
    when: 'change',
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      } // Let required rule handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
    when: 'blur',
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      return regex.test(value);
    },
    message,
    when: 'blur',
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
    when: 'blur',
  }),

  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      return !isNaN(Number(value));
    },
    message,
    when: 'blur',
  }),

  integer: (message = 'Please enter a whole number'): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      return Number.isInteger(Number(value));
    },
    message,
    when: 'blur',
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`,
    when: 'blur',
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      return Number(value) <= max;
    },
    message: message || `Must be no more than ${max}`,
    when: 'blur',
  }),

  password: (
    message = 'Password must contain uppercase, lowercase, number, and special character',
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) {
        return true;
      }
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      return hasUpper && hasLower && hasNumber && hasSpecial;
    },
    message,
    when: 'blur',
  }),

  match: (fieldName: string, getValue: () => string, message?: string): ValidationRule => ({
    validate: (value) => value === getValue(),
    message: message || `Must match ${fieldName}`,
    when: 'blur',
  }),

  custom: (validateFn: (value: string) => boolean, message: string): ValidationRule => ({
    validate: validateFn,
    message,
    when: 'blur',
  }),
};

// ============================================================================
// Validation Functions
// ============================================================================

export function validateField(
  value: string,
  rules: ValidationRule[],
  when: 'blur' | 'change' | 'submit' = 'blur',
): string | null {
  for (const rule of rules) {
    const shouldValidate = rule.when === 'always' || rule.when === when || when === 'submit';

    if (shouldValidate && !rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

// ============================================================================
// Hook: useBlurValidation
// ============================================================================

interface UseBlurValidationOptions {
  initialValue?: string;
  rules?: ValidationRule[];
  required?: boolean;
  requiredMessage?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  asyncValidator?: (value: string) => Promise<string | null>;
  asyncDebounce?: number;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
}

interface UseBlurValidationReturn {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  validating: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setValue: (value: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  validate: () => boolean;
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<any>) => void;
    onBlur: (e: React.FocusEvent<any>) => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
}

export function useBlurValidation(options: UseBlurValidationOptions = {}): UseBlurValidationReturn {
  const {
    initialValue = '',
    rules = [],
    required = false,
    requiredMessage = 'This field is required',
    validateOnChange = false,
    validateOnBlur = true,
    asyncValidator,
    asyncDebounce = 300,
    onValidationChange,
  } = options;

  const [value, setValueState] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [validating, setValidating] = useState(false);
  const asyncTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const errorIdRef = useRef(`error-${Math.random().toString(36).substr(2, 9)}`);

  // Build full rules array
  const allRules = React.useMemo(() => {
    const result: ValidationRule[] = [];
    if (required) {
      result.push(validationRules.required(requiredMessage));
    }
    result.push(...rules);
    return result;
  }, [required, requiredMessage, rules]);

  // Synchronous validation
  const runSyncValidation = useCallback(
    (val: string, when: 'blur' | 'change' | 'submit'): string | null => {
      return validateField(val, allRules, when);
    },
    [allRules],
  );

  // Async validation with debounce
  const runAsyncValidation = useCallback(
    async (val: string) => {
      if (!asyncValidator) {
        return;
      }

      clearTimeout(asyncTimeoutRef.current);
      setValidating(true);

      asyncTimeoutRef.current = setTimeout(async () => {
        try {
          const asyncError = await asyncValidator(val);
          setError(asyncError);
          onValidationChange?.(!asyncError, asyncError);
        } catch (err) {
          setError('Validation failed');
        } finally {
          setValidating(false);
        }
      }, asyncDebounce);
    },
    [asyncValidator, asyncDebounce, onValidationChange],
  );

  // Handle value change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const newValue = e.target.value;
      setValueState(newValue);
      setDirty(true);

      if (validateOnChange) {
        const syncError = runSyncValidation(newValue, 'change');
        setError(syncError);
        onValidationChange?.(!syncError, syncError);
      }

      // Clear error on typing if there was one
      if (error && !validateOnChange) {
        const syncError = runSyncValidation(newValue, 'change');
        if (!syncError) {
          setError(null);
        }
      }
    },
    [validateOnChange, runSyncValidation, error, onValidationChange],
  );

  // Handle blur
  const handleBlur = useCallback(
    (_e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setTouched(true);

      if (validateOnBlur) {
        const syncError = runSyncValidation(value, 'blur');
        setError(syncError);
        onValidationChange?.(!syncError, syncError);

        // Run async validation if sync passes
        if (!syncError && asyncValidator) {
          runAsyncValidation(value);
        }
      }
    },
    [
      validateOnBlur,
      runSyncValidation,
      value,
      asyncValidator,
      runAsyncValidation,
      onValidationChange,
    ],
  );

  // Manual set value
  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    setDirty(true);
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setValueState(initialValue);
    setError(null);
    setTouched(false);
    setDirty(false);
    setValidating(false);
  }, [initialValue]);

  // Manual validation trigger
  const validate = useCallback((): boolean => {
    const syncError = runSyncValidation(value, 'submit');
    setError(syncError);
    setTouched(true);
    onValidationChange?.(!syncError, syncError);
    return !syncError;
  }, [runSyncValidation, value, onValidationChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimeout(asyncTimeoutRef.current);
    };
  }, []);

  const valid = !error && touched && !validating;

  return {
    value,
    error,
    touched,
    dirty,
    valid,
    validating,
    onChange: handleChange,
    onBlur: handleBlur,
    setValue,
    setError,
    reset,
    validate,
    inputProps: {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      'aria-invalid': !!error,
      'aria-describedby': error ? errorIdRef.current : undefined,
    },
  };
}

// ============================================================================
// Context for Form-Level Validation
// ============================================================================

interface FormValidationContextValue {
  fields: Record<string, FieldState>;
  registerField: (name: string, state: FieldState) => void;
  unregisterField: (name: string) => void;
  updateField: (name: string, state: Partial<FieldState>) => void;
  validateAll: () => boolean;
  resetAll: () => void;
  isValid: boolean;
  isDirty: boolean;
}

const FormValidationContext = createContext<FormValidationContextValue | null>(null);

export const useFormValidation = () => {
  const context = useContext(FormValidationContext);
  if (!context) {
    throw new Error('useFormValidation must be used within FormValidationProvider');
  }
  return context;
};

// ============================================================================
// Form Validation Provider
// ============================================================================

interface FormValidationProviderProps {
  children: React.ReactNode;
  onValidChange?: (isValid: boolean) => void;
}

export const FormValidationProvider: React.FC<FormValidationProviderProps> = ({
  children,
  onValidChange,
}) => {
  const [fields, setFields] = useState<Record<string, FieldState>>({});

  const registerField = useCallback((name: string, state: FieldState) => {
    setFields((prev) => ({ ...prev, [name]: state }));
  }, []);

  const unregisterField = useCallback((name: string) => {
    setFields((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const updateField = useCallback((name: string, state: Partial<FieldState>) => {
    setFields((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...state },
    }));
  }, []);

  const validateAll = useCallback(() => {
    const allValid = Object.values(fields).every((f) => f.valid);
    return allValid;
  }, [fields]);

  const resetAll = useCallback(() => {
    setFields({});
  }, []);

  const isValid = Object.values(fields).every((f) => !f.error);
  const isDirty = Object.values(fields).some((f) => f.dirty);

  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  return (
    <FormValidationContext.Provider
      value={{
        fields,
        registerField,
        unregisterField,
        updateField,
        validateAll,
        resetAll,
        isValid,
        isDirty,
      }}
    >
      {children}
    </FormValidationContext.Provider>
  );
};

// ============================================================================
// Validated Input Component
// ============================================================================

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  rules?: ValidationRule[];
  required?: boolean;
  requiredMessage?: string;
  helperText?: string;
  showSuccessIcon?: boolean;
  validateOnChange?: boolean;
  asyncValidator?: (value: string) => Promise<string | null>;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  label,
  rules = [],
  required = false,
  requiredMessage,
  helperText,
  showSuccessIcon = true,
  validateOnChange = false,
  asyncValidator,
  className = '',
  ...inputProps
}) => {
  const {
    error,
    touched,
    valid,
    validating,
    inputProps: validationInputProps,
  } = useBlurValidation({
    initialValue: inputProps.defaultValue?.toString() || '',
    rules,
    required,
    requiredMessage,
    validateOnChange,
    asyncValidator,
  });

  const errorId = `${name}-error`;
  const helperId = `${name}-helper`;

  return (
    <div className={`validated-field ${className}`} style={{ marginBottom: 16 }}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 500,
            color: '#2d3748',
          }}
        >
          {label}
          {required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          id={name}
          name={name}
          {...inputProps}
          {...validationInputProps}
          aria-describedby={`${errorId} ${helperId}`}
          style={{
            width: '100%',
            padding: '10px 12px',
            paddingRight: showSuccessIcon && touched ? 36 : 12,
            border: `1px solid ${error ? '#e53e3e' : touched && valid ? '#48bb78' : '#e2e8f0'}`,
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...inputProps.style,
          }}
        />

        {/* Status icon */}
        {showSuccessIcon && touched && !validating && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16,
            }}
          >
            {error ? '❌' : valid ? '✓' : null}
          </span>
        )}

        {/* Loading indicator */}
        {validating && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
            }}
          >
            ⏳
          </span>
        )}
      </div>

      {/* Error message */}
      {error && touched && (
        <p
          id={errorId}
          role="alert"
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: '#e53e3e',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p
          id={helperId}
          style={{
            margin: '6px 0 0',
            fontSize: 12,
            color: '#718096',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Validated Textarea Component
// ============================================================================

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  rules?: ValidationRule[];
  required?: boolean;
  requiredMessage?: string;
  helperText?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  name,
  label,
  rules = [],
  required = false,
  requiredMessage,
  helperText,
  showCharCount = false,
  maxLength,
  className = '',
  ...textareaProps
}) => {
  const {
    value,
    error,
    touched,
    valid,
    inputProps: validationInputProps,
  } = useBlurValidation({
    initialValue: textareaProps.defaultValue?.toString() || '',
    rules: maxLength ? [...rules, validationRules.maxLength(maxLength)] : rules,
    required,
    requiredMessage,
  });

  const errorId = `${name}-error`;
  const charCount = value.length;
  const charCountDisplay = maxLength ? `${charCount}/${maxLength}` : charCount.toString();

  return (
    <div className={`validated-field ${className}`} style={{ marginBottom: 16 }}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 500,
            color: '#2d3748',
          }}
        >
          {label}
          {required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        {...textareaProps}
        {...validationInputProps}
        aria-describedby={error ? errorId : undefined}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${error ? '#e53e3e' : touched && valid ? '#48bb78' : '#e2e8f0'}`,
          borderRadius: 6,
          fontSize: 14,
          outline: 'none',
          resize: 'vertical',
          minHeight: 100,
          transition: 'border-color 0.15s',
          ...textareaProps.style,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {/* Error or helper */}
        <div>
          {error && touched ? (
            <p
              id={errorId}
              role="alert"
              style={{
                margin: 0,
                fontSize: 13,
                color: '#e53e3e',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span aria-hidden="true">⚠️</span>
              {error}
            </p>
          ) : helperText ? (
            <p style={{ margin: 0, fontSize: 12, color: '#718096' }}>{helperText}</p>
          ) : null}
        </div>

        {/* Character count */}
        {showCharCount && (
          <span
            style={{
              fontSize: 12,
              color: maxLength && charCount > maxLength ? '#e53e3e' : '#718096',
            }}
          >
            {charCountDisplay}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Form Error Summary Component
// ============================================================================

interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({ errors, className = '' }) => {
  const errorList = Object.entries(errors).filter(([_, error]) => error);

  if (errorList.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-labelledby="error-summary-title"
      className={`form-error-summary ${className}`}
      style={{
        padding: 16,
        background: '#fff5f5',
        border: '1px solid #feb2b2',
        borderRadius: 8,
        marginBottom: 20,
      }}
    >
      <h3
        id="error-summary-title"
        style={{
          margin: '0 0 12px',
          fontSize: 14,
          fontWeight: 600,
          color: '#c53030',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span aria-hidden="true">⚠️</span>
        Please fix the following errors:
      </h3>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {errorList.map(([field, error]) => (
          <li key={field} style={{ fontSize: 13, color: '#c53030', marginBottom: 4 }}>
            <a
              href={`#${field}`}
              style={{ color: 'inherit', textDecoration: 'underline' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(field)?.focus();
              }}
            >
              {error}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default useBlurValidation;
