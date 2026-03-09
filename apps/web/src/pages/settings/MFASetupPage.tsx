/**
 * MFA Setup Page
 * Allows users to set up TOTP-based multi-factor authentication
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ShieldCheck,
  Shield,
  QrCode,
  Key,
  Copy,
  Check,
  Download,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  ChevronRight,
  LockKeyhole,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { TOTPVerification } from '../../components/auth/TOTPVerification';
import {
  getMfaStatus,
  initiateMfaSetup,
  verifyMfaSetup,
  disableMfa,
  regenerateBackupCodes,
  type MfaSetupResponse,
} from '../../api/mfa';
import clsx from 'clsx';

type SetupStep = 'status' | 'scan' | 'verify' | 'backup' | 'disable' | 'regenerate';

export function MFASetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>('status');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showManualKey, setShowManualKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch MFA status
  const {
    data: mfaStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: getMfaStatus,
  });

  // Setup mutation
  const setupMutation = useMutation({
    mutationFn: initiateMfaSetup,
    onSuccess: (data) => {
      setSetupData(data);
      setStep('scan');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to initiate MFA setup');
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: verifyMfaSetup,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backup');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Invalid verification code');
    },
  });

  // Disable mutation
  const disableMutation = useMutation({
    mutationFn: disableMfa,
    onSuccess: () => {
      refetchStatus();
      setStep('status');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Invalid verification code');
    },
  });

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: regenerateBackupCodes,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backup');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Invalid verification code');
    },
  });

  const handleStartSetup = useCallback(() => {
    setupMutation.mutate();
  }, [setupMutation]);

  const handleVerify = useCallback(
    async (code: string) => {
      verifyMutation.mutate(code);
    },
    [verifyMutation]
  );

  const handleDisable = useCallback(
    async (code: string) => {
      disableMutation.mutate(code);
    },
    [disableMutation]
  );

  const handleRegenerate = useCallback(
    async (code: string) => {
      regenerateMutation.mutate(code);
    },
    [regenerateMutation]
  );

  const handleCopyBackupCodes = useCallback(() => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  }, [backupCodes]);

  const handleDownloadBackupCodes = useCallback(() => {
    const text = `Quiz2Biz MFA Backup Codes\n${'='.repeat(30)}\n\nKeep these codes in a safe place.\nEach code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz2biz-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  const handleFinish = useCallback(() => {
    refetchStatus();
    setStep('status');
    setBackupCodes([]);
    setSetupData(null);
  }, [refetchStatus]);

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-surface-500">Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Two-Factor Authentication
          </h1>
          <p className="text-surface-500 mt-1">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {/* Status View */}
      {step === 'status' && (
        <Card>
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'p-3 rounded-lg',
                mfaStatus?.enabled
                  ? 'bg-success-100 text-success-600'
                  : 'bg-surface-100 text-surface-400'
              )}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-surface-900">
                  Authenticator App
                </h3>
                <Badge variant={mfaStatus?.enabled ? 'success' : 'secondary'}>
                  {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-sm text-surface-500 mt-1">
                Use an authenticator app like Google Authenticator, Authy, or
                1Password to generate verification codes.
              </p>

              {mfaStatus?.enabled && (
                <p className="text-sm text-surface-500 mt-2">
                  <Key className="h-3.5 w-3.5 inline mr-1" />
                  {mfaStatus.backupCodesCount} backup codes remaining
                </p>
              )}

              <div className="flex items-center gap-3 mt-4">
                {mfaStatus?.enabled ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setStep('regenerate')}
                    >
                      Regenerate Backup Codes
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setStep('disable')}
                    >
                      Disable MFA
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={handleStartSetup}>
                    <LockKeyhole className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Scan QR Code Step */}
      {step === 'scan' && setupData && (
        <Card>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-surface-900">
              Scan QR Code
            </h2>
            <p className="text-surface-500 mt-2">
              Scan this QR code with your authenticator app
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* QR Code */}
            <div className="p-4 bg-white border border-surface-200 rounded-xl">
              <img
                src={setupData.qrCodeDataUrl}
                alt="MFA QR Code"
                className="w-48 h-48"
              />
            </div>

            {/* Manual Entry */}
            <div className="text-center">
              <button
                onClick={() => setShowManualKey(!showManualKey)}
                className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 mx-auto"
              >
                <QrCode className="h-4 w-4" />
                Can't scan? Enter key manually
              </button>

              {showManualKey && (
                <div className="mt-3 p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs text-surface-500 mb-1">Secret Key</p>
                  <code className="text-sm font-mono text-surface-900 select-all">
                    {setupData.manualEntryKey}
                  </code>
                </div>
              )}
            </div>

            {/* Continue Button */}
            <Button
              variant="primary"
              onClick={() => setStep('verify')}
              className="w-full max-w-xs"
            >
              I've scanned the code
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="ghost"
              onClick={() => setStep('status')}
              className="text-surface-500"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Verify Code Step */}
      {step === 'verify' && (
        <TOTPVerification
          onVerify={handleVerify}
          title="Verify Setup"
          description="Enter the 6-digit code from your authenticator app to complete setup"
          showBackupCodeOption={false}
          isLoading={verifyMutation.isPending}
          error={error}
        />
      )}

      {/* Backup Codes Step */}
      {step === 'backup' && backupCodes.length > 0 && (
        <Card>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-4">
              <Check className="h-8 w-8 text-success-600" />
            </div>
            <h2 className="text-xl font-semibold text-surface-900">
              Save Your Backup Codes
            </h2>
            <p className="text-surface-500 mt-2">
              Store these codes somewhere safe. Each code can only be used once.
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-warning-50 border border-warning-200 rounded-lg mb-6">
            <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning-800">
                These codes won't be shown again
              </p>
              <p className="text-warning-700 mt-1">
                If you lose your phone and don't have these codes, you'll be
                locked out of your account.
              </p>
            </div>
          </div>

          {/* Backup Codes Grid */}
          <div className="grid grid-cols-2 gap-2 p-4 bg-surface-50 rounded-lg mb-6">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="font-mono text-sm text-surface-700 bg-white px-3 py-2 rounded border border-surface-200"
              >
                {code}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleCopyBackupCodes}
            >
              {copiedCodes ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleDownloadBackupCodes}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <Button variant="primary" className="w-full" onClick={handleFinish}>
            I've saved these codes
          </Button>
        </Card>
      )}

      {/* Disable MFA Step */}
      {step === 'disable' && (
        <TOTPVerification
          onVerify={handleDisable}
          title="Disable Two-Factor Authentication"
          description="Enter a verification code to disable MFA. This will reduce your account security."
          showBackupCodeOption={true}
          onUseBackupCode={() => {}}
          isLoading={disableMutation.isPending}
          error={error}
        />
      )}

      {/* Regenerate Backup Codes Step */}
      {step === 'regenerate' && (
        <TOTPVerification
          onVerify={handleRegenerate}
          title="Regenerate Backup Codes"
          description="Enter a verification code to generate new backup codes. Old codes will be invalidated."
          showBackupCodeOption={true}
          onUseBackupCode={() => {}}
          isLoading={regenerateMutation.isPending}
          error={error}
        />
      )}
    </div>
  );
}

export default MFASetupPage;
