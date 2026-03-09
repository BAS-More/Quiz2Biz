/**
 * Document Preview Page
 * Displays PDF document preview with download options
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { PDFViewer } from '../../components/documents/PDFViewer';
import { downloadDocument } from '../../api/documents';
import apiClient from '../../api/client';

interface DocumentDetails {
  id: string;
  name: string;
  description?: string;
  format: 'pdf' | 'docx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  pageCount?: number;
  downloadUrl?: string;
  previewUrl?: string;
  projectId: string;
  documentTypeSlug: string;
}

// Fetch document details
async function fetchDocumentDetails(documentId: string): Promise<DocumentDetails> {
  const response = await apiClient.get<DocumentDetails>(`/documents/${documentId}`);
  return response.data;
}

// Fetch document preview URL
async function fetchDocumentPreviewUrl(documentId: string): Promise<string> {
  const response = await apiClient.get<{ url: string }>(`/documents/${documentId}/preview`);
  return response.data.url;
}

export function DocumentPreviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Get return path from search params or default to documents
  const returnPath = searchParams.get('return') || '/documents';

  // Fetch document details
  const {
    data: document,
    isLoading: isLoadingDocument,
    error: documentError,
    refetch: refetchDocument,
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => fetchDocumentDetails(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      // Poll while processing
      const data = query.state.data;
      return data?.status === 'processing' ? 3000 : false;
    },
  });

  // Fetch preview URL when document is ready
  useEffect(() => {
    if (document?.status === 'completed' && document.format === 'pdf') {
      fetchDocumentPreviewUrl(document.id)
        .then(setPreviewUrl)
        .catch((err) => {
          console.error('Failed to fetch preview URL:', err);
          // Fallback to download URL if preview fails
          if (document.downloadUrl) {
            setPreviewUrl(document.downloadUrl);
          }
        });
    }
  }, [document]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!document) return;

    setIsDownloading(true);
    try {
      const blob = await downloadDocument(document.id);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name || `document.${document.format}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Show toast error
    } finally {
      setIsDownloading(false);
    }
  }, [document]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(returnPath);
  }, [navigate, returnPath]);

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge config
  const getStatusBadge = (status: DocumentDetails['status']) => {
    switch (status) {
      case 'completed':
        return {
          variant: 'success' as const,
          icon: CheckCircle,
          label: 'Ready',
        };
      case 'processing':
        return {
          variant: 'warning' as const,
          icon: Clock,
          label: 'Processing',
        };
      case 'pending':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Pending',
        };
      case 'failed':
        return {
          variant: 'danger' as const,
          icon: AlertCircle,
          label: 'Failed',
        };
    }
  };

  // Loading state
  if (isLoadingDocument) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-surface-500">Loading document...</p>
      </div>
    );
  }

  // Error state
  if (documentError || !document) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-danger-500" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-surface-900">
            Document Not Found
          </h2>
          <p className="text-surface-500 mt-1">
            The document you're looking for doesn't exist or you don't have access.
          </p>
        </div>
        <Button variant="secondary" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(document.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
              <FileText className="h-6 w-6 text-brand-600" />
              {document.name}
            </h1>
            {document.description && (
              <p className="text-surface-500 mt-1">{document.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={statusBadge.variant}>
            <StatusIcon className="h-3.5 w-3.5 mr-1" />
            {statusBadge.label}
          </Badge>
          {document.status === 'completed' && (
            <Button
              variant="primary"
              onClick={handleDownload}
              loading={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Document Info Bar */}
      <Card padding="sm">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6 text-surface-500">
            <span>
              <strong className="text-surface-700">Format:</strong>{' '}
              {document.format.toUpperCase()}
            </span>
            {document.pageCount && (
              <span>
                <strong className="text-surface-700">Pages:</strong>{' '}
                {document.pageCount}
              </span>
            )}
            <span>
              <strong className="text-surface-700">Size:</strong>{' '}
              {formatFileSize(document.fileSize)}
            </span>
            <span>
              <strong className="text-surface-700">Created:</strong>{' '}
              {formatDate(document.createdAt)}
            </span>
          </div>
          {document.status === 'processing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchDocument()}
              className="text-surface-500"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </Card>

      {/* Content Area */}
      {document.status === 'processing' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-brand-200" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-surface-900">
                Generating Document
              </h3>
              <p className="text-surface-500 mt-1">
                Your document is being generated. This may take a few moments...
              </p>
            </div>
          </div>
        </Card>
      )}

      {document.status === 'pending' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Clock className="h-16 w-16 text-surface-300" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-surface-900">
                Document Queued
              </h3>
              <p className="text-surface-500 mt-1">
                Your document is in the queue and will be generated shortly.
              </p>
            </div>
          </div>
        </Card>
      )}

      {document.status === 'failed' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-16 w-16 text-danger-500" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-surface-900">
                Generation Failed
              </h3>
              <p className="text-surface-500 mt-1">
                There was an error generating your document. Please try again.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                // Trigger regeneration
                navigate(`/project/${document.projectId}/documents`);
              }}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {document.status === 'completed' && (
        <>
          {document.format === 'pdf' && previewUrl ? (
            <PDFViewer
              src={previewUrl}
              title={document.name}
              onDownload={handleDownload}
              showDownload={true}
              height={700}
              enableFullscreen={true}
            />
          ) : document.format === 'docx' ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <FileText className="h-16 w-16 text-brand-400" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-surface-900">
                    DOCX Document Ready
                  </h3>
                  <p className="text-surface-500 mt-1">
                    Preview is not available for DOCX files. Click download to
                    view in Microsoft Word.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  loading={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download DOCX
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
        </>
      )}
    </div>
  );
}

export default DocumentPreviewPage;
