/**
 * Admin Review Queue Page
 * Shows all documents pending review with filtering, sorting, and batch operations
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Inbox,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { ReviewActions } from '../../components/admin/ReviewActions';
import { useAuthStore } from '../../stores/auth';
import {
  getPendingReviewDocuments,
  approveDocument,
  rejectDocument,
  batchApproveDocuments,
  batchRejectDocuments,
} from '../../api/admin';
import clsx from 'clsx';

// Document category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BA: <FileText className="h-4 w-4" />,
  PM: <FileText className="h-4 w-4" />,
  TECH: <FileText className="h-4 w-4" />,
  LEGAL: <FileText className="h-4 w-4" />,
};

// Document category colors
const CATEGORY_COLORS: Record<string, string> = {
  BA: 'bg-blue-100 text-blue-700',
  PM: 'bg-purple-100 text-purple-700',
  TECH: 'bg-green-100 text-green-700',
  LEGAL: 'bg-orange-100 text-orange-700',
};

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Frontend role guard
  if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-danger-500" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-surface-900">Access Denied</h2>
          <p className="text-surface-500 mt-1">You do not have permission to access the review queue.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState('');
  const perPage = 10;

  // Fetch pending review documents
  const {
    data: reviewQueue,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin', 'pending-review', page, perPage],
    queryFn: () => getPendingReviewDocuments(page, perPage),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Optimistic helper: remove document(s) from cache and return previous snapshot
  const optimisticRemove = async (idsToRemove: string[]) => {
    await queryClient.cancelQueries({ queryKey: ['admin', 'pending-review'] });
    const previous = queryClient.getQueryData(['admin', 'pending-review', page, perPage]);
    queryClient.setQueryData(['admin', 'pending-review', page, perPage], (old: any) => {
      if (!old) return old;
      const idSet = new Set(idsToRemove);
      return {
        ...old,
        data: old.data.filter((doc: any) => !idSet.has(doc.id)),
        meta: { ...old.meta, total: Math.max(0, old.meta.total - idsToRemove.length) },
      };
    });
    return { previous };
  };

  // Approve mutation (optimistic)
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveDocument(id, notes ? { notes } : undefined),
    onMutate: ({ id }) => optimisticRemove([id]),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'pending-review', page, perPage], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
    },
  });

  // Reject mutation (optimistic)
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDocument(id, { reason }),
    onMutate: ({ id }) => optimisticRemove([id]),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'pending-review', page, perPage], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
    },
  });

  // Batch approve mutation (optimistic)
  const batchApproveMutation = useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      batchApproveDocuments(ids, notes),
    onMutate: ({ ids }) => optimisticRemove(ids),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'pending-review', page, perPage], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
      setSelectedIds(new Set());
    },
  });

  // Batch reject mutation (optimistic)
  const batchRejectMutation = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) =>
      batchRejectDocuments(ids, reason),
    onMutate: ({ ids }) => optimisticRemove(ids),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['admin', 'pending-review', page, perPage], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
      setSelectedIds(new Set());
      setShowBatchRejectModal(false);
      setBatchRejectReason('');
    },
  });

  const handleApprove = useCallback(
    async (documentId: string, notes?: string) => {
      await approveMutation.mutateAsync({ id: documentId, notes });
    },
    [approveMutation],
  );

  const handleReject = useCallback(
    async (documentId: string, reason: string) => {
      await rejectMutation.mutateAsync({ id: documentId, reason });
    },
    [rejectMutation],
  );

  const handleViewDocument = useCallback(
    (documentId: string) => {
      navigate(`/admin/review/${documentId}`);
    },
    [navigate],
  );

  // Selection handlers
  const handleSelectOne = useCallback((docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  // Filter documents by search and category
  const filteredDocuments = reviewQueue?.data?.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.session?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !categoryFilter || doc.documentType.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleSelectAll = useCallback(() => {
    if (!filteredDocuments) return;
    const allIds = filteredDocuments.map((doc) => doc.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [filteredDocuments, selectedIds]);

  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await batchApproveMutation.mutateAsync({ ids: Array.from(selectedIds) });
  }, [selectedIds, batchApproveMutation]);

  const handleBatchReject = useCallback(async () => {
    if (selectedIds.size === 0 || !batchRejectReason.trim()) return;
    await batchRejectMutation.mutateAsync({
      ids: Array.from(selectedIds),
      reason: batchRejectReason,
    });
  }, [selectedIds, batchRejectReason, batchRejectMutation]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get unique categories for filter
  const categories = Array.from(
    new Set(reviewQueue?.data?.map((doc) => doc.documentType.category) || []),
  );

  // Selection state helpers
  const selectAllState =
    filteredDocuments && filteredDocuments.length > 0
      ? filteredDocuments.every((doc) => selectedIds.has(doc.id))
        ? 'all'
        : filteredDocuments.some((doc) => selectedIds.has(doc.id))
          ? 'some'
          : 'none'
      : 'none';

  const isBatchActionPending = batchApproveMutation.isPending || batchRejectMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Review Queue</h1>
          <p className="text-surface-500 mt-1">Review and approve pending documents</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="px-3 py-1.5">
            <Clock className="h-4 w-4 mr-1" />
            {reviewQueue?.meta?.total || 0} Pending
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center gap-4">
          {/* Select All Checkbox */}
          <button
            onClick={handleSelectAll}
            className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            disabled={!filteredDocuments || filteredDocuments.length === 0}
            aria-label="Select all documents"
          >
            {selectAllState === 'all' ? (
              <CheckSquare className="h-5 w-5 text-brand-600" />
            ) : selectAllState === 'some' ? (
              <Minus className="h-5 w-5 text-brand-400" />
            ) : (
              <Square className="h-5 w-5 text-surface-400" />
            )}
          </button>

          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by document name, type, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-surface-200">
              <span className="text-sm text-surface-600">{selectedIds.size} selected</span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchApprove}
                disabled={isBatchActionPending}
              >
                {batchApproveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve All
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBatchRejectModal(true)}
                disabled={isBatchActionPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={isBatchActionPending}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Batch Reject Modal */}
      {showBatchRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">
              Reject {selectedIds.size} Document{selectedIds.size > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-surface-500 mb-4">
              Please provide a reason for rejecting these documents. This will be sent to the
              document owners.
            </p>
            <textarea
              value={batchRejectReason}
              onChange={(e) => setBatchRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={4}
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowBatchRejectModal(false);
                  setBatchRejectReason('');
                }}
                disabled={batchRejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleBatchReject}
                disabled={!batchRejectReason.trim() || batchRejectMutation.isPending}
              >
                {batchRejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Reject {selectedIds.size} Document{selectedIds.size > 1 ? 's' : ''}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-surface-500">Loading review queue...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-danger-500" />
            <div className="text-center">
              <h3 className="font-medium text-surface-900">Failed to load review queue</h3>
              <p className="text-sm text-surface-500 mt-1">
                There was an error loading the pending documents.
              </p>
            </div>
            <Button variant="secondary" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredDocuments?.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Inbox className="h-16 w-16 text-surface-300" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-surface-900">No Documents to Review</h3>
              <p className="text-surface-500 mt-1">
                {searchQuery || categoryFilter
                  ? 'No documents match your filters'
                  : 'All documents have been reviewed'}
              </p>
            </div>
            {(searchQuery || categoryFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter(null);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Document List */}
      {!isLoading && !isError && filteredDocuments && filteredDocuments.length > 0 && (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <button
                  onClick={() => handleSelectOne(doc.id)}
                  className="p-1 hover:bg-surface-100 rounded transition-colors mt-2"
                  aria-label={`Select ${doc.fileName}`}
                >
                  {selectedIds.has(doc.id) ? (
                    <CheckSquare className="h-5 w-5 text-brand-600" />
                  ) : (
                    <Square className="h-5 w-5 text-surface-400" />
                  )}
                </button>

                {/* Document Icon */}
                <div
                  className={clsx(
                    'p-3 rounded-lg',
                    CATEGORY_COLORS[doc.documentType.category] || 'bg-surface-100',
                  )}
                >
                  {CATEGORY_ICONS[doc.documentType.category] || <FileText className="h-5 w-5" />}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-surface-900 truncate">{doc.fileName}</h3>
                      <p className="text-sm text-surface-500 mt-0.5">{doc.documentType.name}</p>
                    </div>
                    <Badge variant="warning">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Review
                    </Badge>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-surface-500">
                    {doc.session?.user && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {doc.session.user.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(doc.createdAt)}
                    </span>
                    <span className="uppercase text-xs font-medium">{doc.format}</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <div className="w-px h-5 bg-surface-200" />
                    <ReviewActions
                      documentId={doc.id}
                      documentName={doc.fileName}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      compact
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {reviewQueue?.meta && reviewQueue.meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-surface-500">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, reviewQueue.meta.total)}{' '}
            of {reviewQueue.meta.total} documents
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-3 py-1 text-sm text-surface-600">
              Page {page} of {reviewQueue.meta.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(reviewQueue.meta.totalPages, p + 1))}
              disabled={page >= reviewQueue.meta.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewQueuePage;
