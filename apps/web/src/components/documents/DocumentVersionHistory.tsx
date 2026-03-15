/**
 * DocumentVersionHistory.tsx
 * Document Version History with comparison and download capabilities
 * Displays version timeline for generated documents
 */

import React, { useState, useCallback } from 'react';
import {
  History,
  Download,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  GitCompare,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import clsx from 'clsx';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'APPROVED' | 'REJECTED';
  format: string;
  fileName?: string;
  fileSize?: number;
  generatedAt?: string;
  createdAt: string;
  downloadUrl?: string;
  changeDescription?: string;
  metadata?: {
    generatedBy?: string;
    aiModel?: string;
    templateVersion?: string;
  };
}

interface DocumentVersionHistoryProps {
  documentId: string;
  currentVersion: number;
  versions: DocumentVersion[];
  onDownload?: (version: DocumentVersion) => void;
  onRestore?: (version: DocumentVersion) => void;
  onCompare?: (version1: DocumentVersion, version2: DocumentVersion) => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusConfig(status: DocumentVersion['status']) {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return {
        variant: 'success' as const,
        icon: CheckCircle,
        label: status === 'APPROVED' ? 'Approved' : 'Completed',
      };
    case 'PROCESSING':
    case 'PENDING':
      return {
        variant: 'warning' as const,
        icon: Clock,
        label: status === 'PROCESSING' ? 'Processing' : 'Pending',
      };
    case 'FAILED':
    case 'REJECTED':
      return {
        variant: 'danger' as const,
        icon: XCircle,
        label: status === 'REJECTED' ? 'Rejected' : 'Failed',
      };
    default:
      return {
        variant: 'secondary' as const,
        icon: Clock,
        label: status,
      };
  }
}

// ============================================================================
// Version Item Component
// ============================================================================

interface VersionItemProps {
  version: DocumentVersion;
  isCurrent: boolean;
  isSelected: boolean;
  isCompareMode: boolean;
  compareSelections: string[];
  onSelect: () => void;
  onDownload: () => void;
  onCompareSelect: () => void;
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isCurrent,
  isSelected,
  isCompareMode,
  compareSelections,
  onSelect,
  onDownload,
  onCompareSelect,
}) => {
  const statusConfig = getStatusConfig(version.status);
  const StatusIcon = statusConfig.icon;
  const isSelectedForCompare = compareSelections.includes(version.id);

  return (
    <div
      className={clsx(
        'relative pl-6 pb-6 border-l-2 transition-colors',
        isCurrent ? 'border-brand-500' : 'border-surface-200',
        isSelected && 'bg-brand-50/50',
      )}
    >
      {/* Timeline dot */}
      <div
        className={clsx(
          'absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full border-2',
          isCurrent
            ? 'bg-brand-500 border-brand-500'
            : version.status === 'COMPLETED' || version.status === 'APPROVED'
              ? 'bg-success-500 border-success-500'
              : 'bg-surface-200 border-surface-300',
        )}
      />

      <div className="ml-4">
        {/* Version header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-surface-900">Version {version.version}</span>
            {isCurrent && (
              <Badge variant="brand" size="sm">
                Current
              </Badge>
            )}
            <Badge variant={statusConfig.variant} size="sm">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isCompareMode ? (
              <Button
                variant={isSelectedForCompare ? 'primary' : 'outline'}
                size="sm"
                onClick={onCompareSelect}
                disabled={!isSelectedForCompare && compareSelections.length >= 2}
              >
                <GitCompare className="w-3.5 h-3.5 mr-1" />
                {isSelectedForCompare ? 'Selected' : 'Select'}
              </Button>
            ) : (
              <>
                {(version.status === 'COMPLETED' || version.status === 'APPROVED') && (
                  <>
                    <Button variant="ghost" size="sm" onClick={onSelect}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDownload}>
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Version details */}
        <div className="text-sm text-surface-500 space-y-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(version.generatedAt || version.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {version.format.toUpperCase()} • {formatFileSize(version.fileSize)}
            </span>
          </div>

          {version.changeDescription && (
            <p className="text-surface-600 italic">"{version.changeDescription}"</p>
          )}

          {version.metadata && (
            <div className="flex items-center gap-3 text-xs text-surface-400">
              {version.metadata.aiModel && <span>Model: {version.metadata.aiModel}</span>}
              {version.metadata.templateVersion && (
                <span>Template: v{version.metadata.templateVersion}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Version Comparison View
// ============================================================================

interface VersionCompareProps {
  version1: DocumentVersion;
  version2: DocumentVersion;
  onClose: () => void;
}

const VersionCompareView: React.FC<VersionCompareProps> = ({ version1, version2, onClose }) => {
  // Sort by version number (older first)
  const [older, newer] = [version1, version2].sort((a, b) => a.version - b.version);

  return (
    <Card className="mt-4 bg-surface-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-surface-900 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-brand-600" />
          Version Comparison
        </h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Older version */}
        <div className="p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-surface-700">Version {older.version}</span>
            <Badge variant="secondary" size="sm">
              Older
            </Badge>
          </div>
          <div className="text-sm text-surface-500 space-y-1">
            <p>
              <strong>Created:</strong> {formatDate(older.createdAt)}
            </p>
            <p>
              <strong>Format:</strong> {older.format.toUpperCase()}
            </p>
            <p>
              <strong>Size:</strong> {formatFileSize(older.fileSize)}
            </p>
          </div>
        </div>

        {/* Newer version */}
        <div className="p-4 bg-white dark:bg-surface-800 rounded-lg border border-brand-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-surface-700">Version {newer.version}</span>
            <Badge variant="brand" size="sm">
              Newer
            </Badge>
          </div>
          <div className="text-sm text-surface-500 space-y-1">
            <p>
              <strong>Created:</strong> {formatDate(newer.createdAt)}
            </p>
            <p>
              <strong>Format:</strong> {newer.format.toUpperCase()}
            </p>
            <p>
              <strong>Size:</strong> {formatFileSize(newer.fileSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Changes summary */}
      <div className="mt-4 p-3 bg-surface-100 rounded-lg">
        <h5 className="text-sm font-medium text-surface-700 mb-2">Changes Summary</h5>
        <ul className="text-sm text-surface-600 space-y-1">
          <li>
            • Time between versions:{' '}
            {Math.round(
              (new Date(newer.createdAt).getTime() - new Date(older.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            )}{' '}
            days
          </li>
          <li>
            • File size change:{' '}
            {older.fileSize && newer.fileSize
              ? `${(((newer.fileSize - older.fileSize) / older.fileSize) * 100).toFixed(1)}%`
              : 'N/A'}
          </li>
          {newer.changeDescription && <li>• Change notes: {newer.changeDescription}</li>}
        </ul>
      </div>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId: _documentId,
  currentVersion,
  versions,
  onDownload,
  onRestore: _onRestore,
  onCompare,
  isLoading = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSelections, setCompareSelections] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Sort versions by version number (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  // Toggle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle version selection for comparison
  const handleCompareSelect = useCallback((versionId: string) => {
    setCompareSelections((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, versionId];
    });
  }, []);

  // Start comparison
  const handleStartCompare = useCallback(() => {
    if (compareSelections.length === 2) {
      setShowComparison(true);
      const v1 = versions.find((v) => v.id === compareSelections[0]);
      const v2 = versions.find((v) => v.id === compareSelections[1]);
      if (v1 && v2 && onCompare) {
        onCompare(v1, v2);
      }
    }
  }, [compareSelections, versions, onCompare]);

  // Exit compare mode
  const handleExitCompare = useCallback(() => {
    setIsCompareMode(false);
    setCompareSelections([]);
    setShowComparison(false);
  }, []);

  // Handle download
  const handleDownload = useCallback(
    (version: DocumentVersion) => {
      if (onDownload) {
        onDownload(version);
      }
    },
    [onDownload],
  );

  // Don't render if no versions
  if (!versions.length) {
    return null;
  }

  const displayedVersions = isExpanded ? sortedVersions : sortedVersions.slice(0, 3);
  const hasMoreVersions = sortedVersions.length > 3;

  // Get versions for comparison view
  const comparedVersions =
    compareSelections.length === 2
      ? [
          versions.find((v) => v.id === compareSelections[0])!,
          versions.find((v) => v.id === compareSelections[1])!,
        ]
      : null;

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-surface-900">Version History</h3>
          <Badge variant="secondary" size="sm">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {!isCompareMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompareMode(true)}
              disabled={versions.length < 2}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartCompare}
                disabled={compareSelections.length !== 2}
              >
                Compare ({compareSelections.length}/2)
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExitCompare}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      )}

      {/* Version timeline */}
      {!isLoading && (
        <div className="space-y-0">
          {displayedVersions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isCurrent={version.version === currentVersion}
              isSelected={selectedVersion === version.id}
              isCompareMode={isCompareMode}
              compareSelections={compareSelections}
              onSelect={() => setSelectedVersion(version.id)}
              onDownload={() => handleDownload(version)}
              onCompareSelect={() => handleCompareSelect(version.id)}
            />
          ))}
        </div>
      )}

      {/* Show more/less toggle */}
      {hasMoreVersions && !isLoading && (
        <div className="mt-4 pt-4 border-t border-surface-200">
          <Button variant="ghost" size="sm" onClick={handleToggleExpand} className="w-full">
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show {sortedVersions.length - 3} More
              </>
            )}
          </Button>
        </div>
      )}

      {/* Comparison view */}
      {showComparison && comparedVersions && (
        <VersionCompareView
          version1={comparedVersions[0]}
          version2={comparedVersions[1]}
          onClose={handleExitCompare}
        />
      )}
    </Card>
  );
};

export default DocumentVersionHistory;
