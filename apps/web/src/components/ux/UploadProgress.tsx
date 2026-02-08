/**
 * Upload Progress Components
 *
 * Progress bars for file uploads with:
 * - Percentage complete (0-100%)
 * - Upload speed (MB/s)
 * - ETA for large files
 *
 * Nielsen Heuristic #1: Visibility of System Status
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
  bytesUploaded: number;
  speed?: number; // bytes per second
  error?: string;
  startTime?: number;
  file?: File;
}

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface UploadProgressOptions {
  maxConcurrent?: number;
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (file: UploadFile) => void;
  onComplete?: (file: UploadFile) => void;
  onError?: (file: UploadFile, error: Error) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) {
    return '0 B/s';
  }
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) {
    return '--';
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}m`;
  }
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

export function getFileTypeIcon(type: string): string {
  if (type.startsWith('image/')) {
    return '🖼️';
  }
  if (type.startsWith('video/')) {
    return '🎬';
  }
  if (type.startsWith('audio/')) {
    return '🎵';
  }
  if (type.includes('pdf')) {
    return '📄';
  }
  if (type.includes('word') || type.includes('document')) {
    return '📝';
  }
  if (type.includes('excel') || type.includes('spreadsheet')) {
    return '📊';
  }
  if (type.includes('powerpoint') || type.includes('presentation')) {
    return '📽️';
  }
  if (type.includes('zip') || type.includes('archive')) {
    return '📦';
  }
  if (type.includes('json') || type.includes('xml') || type.includes('yaml')) {
    return '⚙️';
  }
  return '📎';
}

// ============================================================================
// Hook: useUploadProgress
// ============================================================================

export interface UseUploadProgressReturn {
  files: UploadFile[];
  upload: (files: File[]) => void;
  cancel: (fileId: string) => void;
  retry: (fileId: string) => void;
  clear: (fileId?: string) => void;
  isUploading: boolean;
  totalProgress: number;
  totalSpeed: number;
  totalETA: number;
}

export function useUploadProgress(
  uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>,
  options: UploadProgressOptions = {},
): UseUploadProgressReturn {
  const { maxConcurrent = 3, onProgress, onComplete, onError } = options;

  const [files, setFiles] = useState<UploadFile[]>([]);
  const activeUploadsRef = useRef(0);
  const speedHistoryRef = useRef<Map<string, number[]>>(new Map());

  // Calculate speed using moving average
  const updateSpeed = useCallback((fileId: string, bytesUploaded: number, elapsedMs: number) => {
    const speed = elapsedMs > 0 ? (bytesUploaded / elapsedMs) * 1000 : 0;
    const history = speedHistoryRef.current.get(fileId) || [];
    history.push(speed);
    if (history.length > 5) {
      history.shift();
    } // Keep last 5 measurements
    speedHistoryRef.current.set(fileId, history);
    return history.reduce((a, b) => a + b, 0) / history.length;
  }, []);

  // Upload single file
  const uploadFile = useCallback(
    async (uploadFile: UploadFile) => {
      if (!uploadFile.file) {
        return;
      }

      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastBytesUploaded = 0;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', startTime, progress: 0 } : f,
        ),
      );

      try {
        await uploadFn(uploadFile.file, (progress) => {
          const now = Date.now();
          const bytesUploaded = Math.floor((progress / 100) * uploadFile.size);
          const elapsed = now - lastUpdateTime;

          if (elapsed > 100) {
            // Update at most every 100ms
            const speed = updateSpeed(uploadFile.id, bytesUploaded - lastBytesUploaded, elapsed);
            lastUpdateTime = now;
            lastBytesUploaded = bytesUploaded;

            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress, bytesUploaded, speed } : f,
              ),
            );

            const updatedFile = { ...uploadFile, progress, bytesUploaded, speed };
            onProgress?.(updatedFile);
          }
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'complete', progress: 100, bytesUploaded: f.size }
              : f,
          ),
        );

        onComplete?.({ ...uploadFile, status: 'complete', progress: 100 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'error', error: errorMessage } : f,
          ),
        );

        onError?.({ ...uploadFile, status: 'error', error: errorMessage }, error as Error);
      } finally {
        activeUploadsRef.current--;
        speedHistoryRef.current.delete(uploadFile.id);
      }
    },
    [uploadFn, updateSpeed, onProgress, onComplete, onError],
  );

  // Process upload queue
  const processQueue = useCallback(() => {
    setFiles((currentFiles) => {
      const pendingFiles = currentFiles.filter((f) => f.status === 'pending');
      const availableSlots = maxConcurrent - activeUploadsRef.current;

      pendingFiles.slice(0, availableSlots).forEach((file) => {
        activeUploadsRef.current++;
        uploadFile(file);
      });

      return currentFiles;
    });
  }, [maxConcurrent, uploadFile]);

  // Effect to process queue when files change
  useEffect(() => {
    processQueue();
  }, [files.length, processQueue]);

  // Add files to upload
  const upload = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      bytesUploaded: 0,
      file,
    }));

    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  // Cancel upload
  const cancel = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId && (f.status === 'pending' || f.status === 'uploading')
          ? { ...f, status: 'cancelled' }
          : f,
      ),
    );
  }, []);

  // Retry failed upload
  const retry = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId && f.status === 'error'
          ? { ...f, status: 'pending', error: undefined, progress: 0, bytesUploaded: 0 }
          : f,
      ),
    );
  }, []);

  // Clear files
  const clear = useCallback((fileId?: string) => {
    if (fileId) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      setFiles((prev) => prev.filter((f) => f.status === 'uploading'));
    }
  }, []);

  // Calculate totals
  const isUploading = files.some((f) => f.status === 'uploading');

  const totalProgress = useMemo(() => {
    const activeFiles = files.filter(
      (f) => f.status === 'uploading' || f.status === 'complete' || f.status === 'pending',
    );
    if (activeFiles.length === 0) {
      return 0;
    }
    const totalBytes = activeFiles.reduce((sum, f) => sum + f.size, 0);
    const uploadedBytes = activeFiles.reduce((sum, f) => sum + f.bytesUploaded, 0);
    return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
  }, [files]);

  const totalSpeed = useMemo(() => {
    const uploadingFiles = files.filter((f) => f.status === 'uploading' && f.speed);
    return uploadingFiles.reduce((sum, f) => sum + (f.speed || 0), 0);
  }, [files]);

  const totalETA = useMemo(() => {
    if (totalSpeed === 0) {
      return Infinity;
    }
    const remainingBytes = files
      .filter((f) => f.status === 'uploading' || f.status === 'pending')
      .reduce((sum, f) => sum + (f.size - f.bytesUploaded), 0);
    return remainingBytes / totalSpeed;
  }, [files, totalSpeed]);

  return {
    files,
    upload,
    cancel,
    retry,
    clear,
    isUploading,
    totalProgress,
    totalSpeed,
    totalETA,
  };
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error' | 'warning';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  variant = 'default',
  showLabel = true,
  animated = true,
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const heights = { sm: 4, md: 8, lg: 12 };
  const colors = {
    default: '#3182ce',
    success: '#48bb78',
    error: '#e53e3e',
    warning: '#ecc94b',
  };

  return (
    <div className={`progress-bar-container ${className}`}>
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: heights[size],
          background: '#e2e8f0',
          borderRadius: heights[size] / 2,
          overflow: 'hidden',
        }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            background: colors[variant],
            borderRadius: heights[size] / 2,
            transition: animated ? 'width 0.3s ease' : 'none',
          }}
        />
      </div>
      {showLabel && (
        <span
          className="progress-bar-label"
          style={{
            fontSize: size === 'sm' ? 10 : size === 'lg' ? 14 : 12,
            color: '#4a5568',
            marginLeft: 8,
          }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Upload Item Component
// ============================================================================

interface UploadItemProps {
  file: UploadFile;
  onCancel?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

export const UploadItem: React.FC<UploadItemProps> = ({
  file,
  onCancel,
  onRetry,
  onRemove,
  compact = false,
}) => {
  const eta = file.speed && file.speed > 0 ? (file.size - file.bytesUploaded) / file.speed : 0;

  const statusColors: Record<UploadStatus, string> = {
    pending: '#718096',
    uploading: '#3182ce',
    processing: '#805ad5',
    complete: '#48bb78',
    error: '#e53e3e',
    cancelled: '#a0aec0',
  };

  const statusText: Record<UploadStatus, string> = {
    pending: 'Waiting...',
    uploading: 'Uploading',
    processing: 'Processing',
    complete: 'Complete',
    error: 'Failed',
    cancelled: 'Cancelled',
  };

  return (
    <div
      className={`upload-item ${compact ? 'upload-item--compact' : ''}`}
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        gap: compact ? 12 : 8,
        padding: compact ? 8 : 12,
        background: '#f7fafc',
        borderRadius: 8,
        border: `1px solid ${file.status === 'error' ? '#feb2b2' : '#e2e8f0'}`,
      }}
    >
      {/* File info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{ fontSize: compact ? 20 : 24 }}>{getFileTypeIcon(file.type)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: compact ? 13 : 14,
              fontWeight: 500,
              color: '#2d3748',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={file.name}
          >
            {file.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#718096' }}>
            {formatFileSize(file.size)}
            {file.status === 'uploading' && file.speed && <> • {formatSpeed(file.speed)}</>}
            {file.status === 'uploading' && eta > 0 && <> • ETA: {formatETA(eta)}</>}
          </p>
        </div>
      </div>

      {/* Progress & Status */}
      {!compact && (
        <div style={{ width: '100%' }}>
          <ProgressBar
            progress={file.progress}
            variant={
              file.status === 'complete' ? 'success' : file.status === 'error' ? 'error' : 'default'
            }
          />
        </div>
      )}

      {/* Status badge & actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            background: `${statusColors[file.status]}20`,
            color: statusColors[file.status],
          }}
        >
          {statusText[file.status]}
        </span>

        {file.status === 'uploading' && onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
            aria-label={`Cancel upload of ${file.name}`}
          >
            Cancel
          </button>
        )}

        {file.status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '4px 8px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
            aria-label={`Retry upload of ${file.name}`}
          >
            Retry
          </button>
        )}

        {(file.status === 'complete' || file.status === 'error' || file.status === 'cancelled') &&
          onRemove && (
            <button
              onClick={onRemove}
              style={{
                padding: 4,
                background: 'transparent',
                border: 'none',
                fontSize: 16,
                cursor: 'pointer',
                color: '#718096',
              }}
              aria-label={`Remove ${file.name}`}
            >
              ✕
            </button>
          )}
      </div>

      {/* Error message */}
      {file.error && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#e53e3e' }}>⚠️ {file.error}</p>
      )}
    </div>
  );
};

// ============================================================================
// Upload Summary Component
// ============================================================================

interface UploadSummaryProps {
  files: UploadFile[];
  totalProgress: number;
  totalSpeed: number;
  totalETA: number;
  onClearCompleted?: () => void;
}

export const UploadSummary: React.FC<UploadSummaryProps> = ({
  files,
  totalProgress,
  totalSpeed,
  totalETA,
  onClearCompleted,
}) => {
  const uploading = files.filter((f) => f.status === 'uploading').length;
  const pending = files.filter((f) => f.status === 'pending').length;
  const completed = files.filter((f) => f.status === 'complete').length;
  const failed = files.filter((f) => f.status === 'error').length;

  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className="upload-summary"
      style={{
        padding: 12,
        background: '#ebf8ff',
        borderRadius: 8,
        border: '1px solid #90cdf4',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <h4 style={{ margin: 0, fontSize: 14, color: '#2b6cb0' }}>📤 Upload Progress</h4>
        {completed > 0 && onClearCompleted && (
          <button
            onClick={onClearCompleted}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid #90cdf4',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              color: '#2b6cb0',
            }}
          >
            Clear completed
          </button>
        )}
      </div>

      <ProgressBar progress={totalProgress} size="lg" />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 13 }}>
        {uploading > 0 && <span style={{ color: '#3182ce' }}>🔄 {uploading} uploading</span>}
        {pending > 0 && <span style={{ color: '#718096' }}>⏳ {pending} pending</span>}
        {completed > 0 && <span style={{ color: '#38a169' }}>✅ {completed} complete</span>}
        {failed > 0 && <span style={{ color: '#e53e3e' }}>❌ {failed} failed</span>}
      </div>

      {uploading > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#4a5568' }}>
          Speed: {formatSpeed(totalSpeed)} • ETA: {formatETA(totalETA)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Upload List Component
// ============================================================================

interface UploadListProps {
  files: UploadFile[];
  onCancel: (fileId: string) => void;
  onRetry: (fileId: string) => void;
  onClear: (fileId: string) => void;
  compact?: boolean;
  maxHeight?: number;
}

export const UploadList: React.FC<UploadListProps> = ({
  files,
  onCancel,
  onRetry,
  onClear,
  compact = false,
  maxHeight = 400,
}) => {
  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#718096' }}>
        <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }} aria-hidden="true">
          📁
        </span>
        <p>No files to upload</p>
        <p style={{ fontSize: 13 }}>Drag and drop files or click to select</p>
      </div>
    );
  }

  return (
    <div
      className="upload-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight,
        overflowY: 'auto',
        padding: 4,
      }}
    >
      {files.map((file) => (
        <UploadItem
          key={file.id}
          file={file}
          compact={compact}
          onCancel={() => onCancel(file.id)}
          onRetry={() => onRetry(file.id)}
          onRemove={() => onClear(file.id)}
        />
      ))}
    </div>
  );
};

export default UploadItem;
