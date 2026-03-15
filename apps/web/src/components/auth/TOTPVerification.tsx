/**
 * TOTP Verification Component
 * Displays code input for MFA verification
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Button, Card } from '../ui';
import clsx from 'clsx';

export interface TOTPVerificationProps {
  /** Called when code is submitted */
  onVerify: (code: string) => Promise<void>;
  /** Title to display */
  title?: string;
  /** Description text */
  description?: string;
  /** Show backup code option */
  showBackupCodeOption?: boolean;
  /** Called when backup code option is selected */
  onUseBackupCode?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Custom class name */
  className?: string;
}

export function TOTPVerification({
  onVerify,
  title = 'Two-Factor Authentication',
  description = 'Enter the 6-digit code from your authenticator app',
  showBackupCodeOption = true,
  onUseBackupCode,
  isLoading = false,
  error,
  className,
}: TOTPVerificationProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle digit input
  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, '').slice(-1);

      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits entered
      if (digit && index === 5 && newCode.every((d) => d)) {
        handleSubmit(newCode.join(''));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code],
  );

  // Handle key events
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code],
  );

  // Handle paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);

      // Focus appropriate input
      if (pasted.length < 6) {
        inputRefs.current[pasted.length]?.focus();
      } else {
        inputRefs.current[5]?.focus();
        handleSubmit(pasted);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code],
  );

  // Submit handler
  const handleSubmit = useCallback(
    async (codeStr: string) => {
      if (codeStr.length !== 6 || isSubmitting || isLoading) return;

      setIsSubmitting(true);
      try {
        await onVerify(codeStr);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onVerify, isSubmitting, isLoading],
  );

  // Manual submit button
  const handleButtonSubmit = useCallback(() => {
    const codeStr = code.join('');
    if (codeStr.length === 6) {
      handleSubmit(codeStr);
    }
  }, [code, handleSubmit]);

  const loading = isSubmitting || isLoading;

  return (
    <Card className={clsx('max-w-md mx-auto', className)}>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-semibold text-surface-900">{title}</h2>
        <p className="text-surface-500 mt-2 text-sm">{description}</p>
      </div>

      {/* Code Input */}
      <div className="flex justify-center gap-2 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={clsx(
              'w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
              'transition-colors',
              error
                ? 'border-danger-300 bg-danger-50'
                : 'border-surface-300 bg-white dark:bg-surface-800',
              loading && 'opacity-50 cursor-not-allowed',
            )}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-center gap-2 text-danger-600 text-sm mb-4">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleButtonSubmit}
        disabled={code.join('').length !== 6 || loading}
        loading={loading}
      >
        {loading ? 'Verifying...' : 'Verify Code'}
      </Button>

      {/* Backup Code Option */}
      {showBackupCodeOption && onUseBackupCode && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onUseBackupCode}
            className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
            disabled={loading}
          >
            Use a backup code instead
          </button>
        </div>
      )}
    </Card>
  );
}

export default TOTPVerification;
