/**
 * Document Review Page
 * Shows document preview with approve/reject actions for admin review
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  User,
  Clock,
  Building,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { PDFViewer } from '../../components/documents/PDFViewer';
import { ReviewActions } from '../../components/admin/ReviewActions';
import {
  getDocumentForReview,
  approveDocument,
  rejectDocument,
  getDocumentPreviewUrl,
  downloadDocumentForReview,
  type PendingReviewDocument,
} from '../../api/admin';
import clsx from 'clsx';

export function DocumentReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reviewComplete, setReviewComplete] = useState<'approved' | 'rejected' | null>(null);

  // Fetch document details
  const {
    data: document,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin', 'document', documentId],
    queryFn: () => getDocumentForReview(documentId!),
    enabled: !!documentId,
  });

  // Fetch preview URL when document is loaded
  useEffect(() => {
    if (document && document.format === 'pdf') {
      getDocumentPreviewUrl(document.id)
        .then(setPreviewUrl)
        .catch((err) => {
          console.error('Failed to fetch preview URL:', err);
        });
    }
  }, [document]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveDocument(id, notes ? { notes } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
      setReviewComplete('approved');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectDocument(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
      setReviewComplete('rejected');
    },
  });

  const handleApprove = useCallback(
    async (docId: string, notes?: string) => {
      await approveMutation.mutateAsync({ id: docId, notes });
    },
    [approveMutation]
  );

  const handleReject = useCallback(
    async (docId: string, reason: string) => {
      await rejectMutation.mutateAsync({ id: docId, reason });
    },
    [rejectMutation]
  );

  const handleDownload = useCallback(async () => {
    if (!document) return;

    setIsDownloading(true);
    try {
      const blob = await downloadDocumentForReview(document.id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [document]);

  const handleBackToQueue = useCallback(() => {
    navigate('/admin/review');
  }, [navigate]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-surface-500">Loading document...</p>
      </div>
    );
  }

  // Error state
  if (isError || !document) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-danger-500" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-surface-900">
            Document Not Found
          </h2>
          <p className="text-surface-500 mt-1">
            This document may have already been reviewed or doesn't exist.
          </p>
        </div>
        <Button variant="secondary" onClick={handleBackToQueue}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Queue
        </Button>
      </div>
    );
  }

  // Review complete state
  if (reviewComplete) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        {reviewComplete === 'approved' ? (
          <div className="p-4 rounded-full bg-success-100">
            <CheckCircle className="h-16 w-16 text-success-600" />
          </div>
        ) : (
          <div className="p-4 rounded-full bg-danger-100">
            <XCircle className="h-16 w-16 text-danger-600" />
          </div>
        )}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-surface-900">
            Document {reviewComplete === 'approved' ? 'Approved' : 'Rejected'}
          </h2>
          <p className="text-surface-500 mt-2">
            The client has been notified about this decision.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleBackToQueue}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToQueue}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
              <FileText className="h-6 w-6 text-brand-600" />
              Document Review
            </h1>
            <p className="text-surface-500 mt-1">{document.fileName}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleDownload}
          loading={isDownloading}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Preview (Left 2/3) */}
        <div className="lg:col-span-2">
          {document.format === 'pdf' && previewUrl ? (
            <PDFViewer
              src={previewUrl}
              title={document.fileName}
              onDownload={handleDownload}
              showDownload={false}
              height={700}
              enableFullscreen={true}
            />
          ) : document.format === 'docx' ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <FileText className="h-16 w-16 text-brand-400" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-surface-900">
                    DOCX Document
                  </h3>
                  <p className="text-surface-500 mt-1">
                    Preview is not available for DOCX files.
                    Download to view in Microsoft Word.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  loading={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download to Review
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <p className="text-surface-500">Loading preview...</p>
              </div>
            </Card>
          )}
        </div>

        {/* Document Details & Actions (Right 1/3) */}
        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">
              Document Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">Type</dt>
                <dd className="font-medium text-surface-900 text-right">
                  {document.documentType.name}
                </dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">Category</dt>
                <dd>
                  <Badge variant="secondary">
                    {document.documentType.category}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">Format</dt>
                <dd className="font-medium text-surface-900 uppercase">
                  {document.format}
                </dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">File Size</dt>
                <dd className="font-medium text-surface-900">
                  {formatFileSize(document.fileSize)}
                </dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">Version</dt>
                <dd className="font-medium text-surface-900">
                  v{document.version}
                </dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-surface-500">Submitted</dt>
                <dd className="font-medium text-surface-900">
                  {formatDate(document.createdAt)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Client Info */}
          {document.session?.user && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Client Information
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <dt className="text-surface-500">Name</dt>
                  <dd className="font-medium text-surface-900">
                    {document.session.user.name}
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-surface-500">Email</dt>
                  <dd className="font-medium text-surface-900">
                    {document.session.user.email}
                  </dd>
                </div>
                {document.session.projectName && (
                  <div className="flex items-start justify-between">
                    <dt className="text-surface-500">Project</dt>
                    <dd className="font-medium text-surface-900">
                      {document.session.projectName}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          {/* Review Actions */}
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">
              Review Actions
            </h3>
            <ReviewActions
              documentId={document.id}
              documentName={document.fileName}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DocumentReviewPage;
