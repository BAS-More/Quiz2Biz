/**
 * Review Actions Component
 * Provides approve/reject buttons with confirmation dialogs
 */

import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button, Card } from '../ui';
import clsx from 'clsx';

export interface ReviewActionsProps {
  /** Document ID being reviewed */
  documentId: string;
  /** Document name for display */
  documentName: string;
  /** Callback when document is approved */
  onApprove: (documentId: string, notes?: string) => Promise<void>;
  /** Callback when document is rejected */
  onReject: (documentId: string, reason: string) => Promise<void>;
  /** Whether actions are disabled (loading, already reviewed, etc.) */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Compact mode (inline buttons) */
  compact?: boolean;
}

type ActionMode = 'idle' | 'approve' | 'reject';

export function ReviewActions({
  documentId,
  documentName,
  onApprove,
  onReject,
  disabled = false,
  className,
  compact = false,
}: ReviewActionsProps) {
  const [mode, setMode] = useState<ActionMode>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    if (mode !== 'approve') {
      setMode('approve');
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove(documentId, notes || undefined);
      setMode('idle');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve document');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, documentId, notes, onApprove]);

  const handleReject = useCallback(async () => {
    if (mode !== 'reject') {
      setMode('reject');
      setError(null);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(documentId, reason);
      setMode('idle');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, documentId, reason, onReject]);

  const handleCancel = useCallback(() => {
    setMode('idle');
    setNotes('');
    setReason('');
    setError(null);
  }, []);

  // Compact mode - just buttons
  if (compact && mode === 'idle') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <Button
          variant="primary"
          size="sm"
          onClick={handleApprove}
          disabled={disabled}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleReject}
          disabled={disabled}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>
    );
  }

  // Confirmation mode
  if (mode === 'approve') {
    return (
      <Card className={clsx('border-success-200 bg-success-50', className)}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-success-800">
                Approve Document
              </h4>
              <p className="text-sm text-success-700 mt-1">
                Are you sure you want to approve "{documentName}"?
                The client will be notified.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="approve-notes"
              className="block text-sm font-medium text-surface-700 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="approve-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-transparent"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={isSubmitting}
              className="bg-success-600 hover:bg-success-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm Approval
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (mode === 'reject') {
    return (
      <Card className={clsx('border-danger-200 bg-danger-50', className)}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-danger-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-danger-800">
                Reject Document
              </h4>
              <p className="text-sm text-danger-700 mt-1">
                Please provide a reason for rejecting "{documentName}".
                This feedback will be sent to the client.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-surface-700 mb-1"
            >
              Rejection Reason <span className="text-danger-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this document is being rejected..."
              className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-danger-500 focus:border-transparent"
              rows={3}
              disabled={isSubmitting}
              maxLength={1000}
              required
            />
            <p className="text-xs text-surface-400 mt-1">
              {reason.length}/1000 characters
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              loading={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Idle mode - full buttons
  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleApprove}
          disabled={disabled}
          className="flex-1 bg-success-600 hover:bg-success-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Document
        </Button>
        <Button
          variant="danger"
          onClick={handleReject}
          disabled={disabled}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject Document
        </Button>
      </div>
    </div>
  );
}

export default ReviewActions;
