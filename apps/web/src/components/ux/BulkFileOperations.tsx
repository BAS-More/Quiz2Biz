/**
 * Bulk File Operations Component
 * Sprint 33: UX Polish & Enhancements
 *
 * Nielsen Heuristic: User Control and Freedom
 * - Select All checkbox for batch operations
 * - Bulk delete with confirmation
 * - Multi-file drag-and-drop preview
 * - Clear selection actions
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface BulkFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt?: Date;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  progress?: number;
}

export interface BulkOperationResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
}

export interface BulkFileContextValue {
  files: BulkFile[];
  selectedIds: Set<string>;
  isAllSelected: boolean;
  hasSelection: boolean;
  selectionCount: number;
  addFiles: (files: File[]) => void;
  removeFiles: (ids: string[]) => void;
  updateFile: (id: string, updates: Partial<BulkFile>) => void;
  selectFile: (id: string) => void;
  deselectFile: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
  deleteSelected: () => Promise<BulkOperationResult>;
  clearAll: () => void;
  getSelectedFiles: () => BulkFile[];
}

export interface BulkFileProviderProps {
  children: React.ReactNode;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  onFilesAdded?: (files: BulkFile[]) => void;
  onFilesRemoved?: (ids: string[]) => void;
  onDeleteFiles?: (ids: string[]) => Promise<BulkOperationResult>;
}

// ============================================================================
// Context
// ============================================================================

const BulkFileContext = createContext<BulkFileContextValue | null>(null);

export function useBulkFiles(): BulkFileContextValue {
  const context = useContext(BulkFileContext);
  if (!context) {
    throw new Error('useBulkFiles must be used within a BulkFileProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(type: string): string {
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
  if (type.includes('sheet') || type.includes('excel')) {
    return '📊';
  }
  if (type.includes('presentation') || type.includes('powerpoint')) {
    return '📽️';
  }
  if (type.includes('zip') || type.includes('archive')) {
    return '📦';
  }
  if (type.includes('text')) {
    return '📃';
  }
  return '📎';
}

// ============================================================================
// Provider Component
// ============================================================================

export const BulkFileProvider: React.FC<BulkFileProviderProps> = ({
  children,
  maxFiles = 50,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes,
  onFilesAdded,
  onFilesRemoved,
  onDeleteFiles,
}) => {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = useMemo(
    () => files.length > 0 && selectedIds.size === files.length,
    [files.length, selectedIds.size],
  );

  const hasSelection = selectedIds.size > 0;
  const selectionCount = selectedIds.size;

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const bulkFiles: BulkFile[] = [];
      const currentCount = files.length;
      const availableSlots = maxFiles - currentCount;

      if (availableSlots <= 0) {
        console.warn(`Maximum file limit (${maxFiles}) reached`);
        return;
      }

      const filesToAdd = newFiles.slice(0, availableSlots);

      filesToAdd.forEach((file) => {
        // Validate file size
        if (file.size > maxFileSize) {
          console.warn(`File ${file.name} exceeds maximum size`);
          return;
        }

        // Validate file type
        if (acceptedTypes && acceptedTypes.length > 0) {
          const isAccepted = acceptedTypes.some(
            (type) => file.type.startsWith(type) || file.name.endsWith(type),
          );
          if (!isAccepted) {
            console.warn(`File ${file.name} type not accepted`);
            return;
          }
        }

        const bulkFile: BulkFile = {
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          uploadedAt: new Date(),
        };

        // Generate thumbnail for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === bulkFile.id ? { ...f, thumbnailUrl: e.target?.result as string } : f,
              ),
            );
          };
          reader.readAsDataURL(file);
        }

        bulkFiles.push(bulkFile);
      });

      if (bulkFiles.length > 0) {
        setFiles((prev) => [...prev, ...bulkFiles]);
        onFilesAdded?.(bulkFiles);
      }
    },
    [files.length, maxFiles, maxFileSize, acceptedTypes, onFilesAdded],
  );

  const removeFiles = useCallback(
    (ids: string[]) => {
      setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      onFilesRemoved?.(ids);
    },
    [onFilesRemoved],
  );

  const updateFile = useCallback((id: string, updates: Partial<BulkFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const selectFile = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselectFile = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(files.map((f) => f.id)));
  }, [files]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  const deleteSelected = useCallback(async (): Promise<BulkOperationResult> => {
    const idsToDelete = Array.from(selectedIds);

    if (onDeleteFiles) {
      const result = await onDeleteFiles(idsToDelete);
      removeFiles(result.success);
      return result;
    }

    // Default behavior: remove locally
    removeFiles(idsToDelete);
    return { success: idsToDelete, failed: [] };
  }, [selectedIds, onDeleteFiles, removeFiles]);

  const clearAll = useCallback(() => {
    const allIds = files.map((f) => f.id);
    removeFiles(allIds);
  }, [files, removeFiles]);

  const getSelectedFiles = useCallback((): BulkFile[] => {
    return files.filter((f) => selectedIds.has(f.id));
  }, [files, selectedIds]);

  const value: BulkFileContextValue = {
    files,
    selectedIds,
    isAllSelected,
    hasSelection,
    selectionCount,
    addFiles,
    removeFiles,
    updateFile,
    selectFile,
    deselectFile,
    toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll,
    deleteSelected,
    clearAll,
    getSelectedFiles,
  };

  return <BulkFileContext.Provider value={value}>{children}</BulkFileContext.Provider>;
};

// ============================================================================
// Select All Checkbox Component
// ============================================================================

export interface SelectAllCheckboxProps {
  className?: string;
  label?: string;
  showCount?: boolean;
}

export const SelectAllCheckbox: React.FC<SelectAllCheckboxProps> = ({
  className = '',
  label = 'Select All',
  showCount = true,
}) => {
  const { files, isAllSelected, hasSelection, selectionCount, toggleSelectAll } = useBulkFiles();

  const isIndeterminate = hasSelection && !isAllSelected;

  const checkboxRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  if (files.length === 0) {
    return null;
  }

  return (
    <label className={`bulk-select-all ${className}`} style={styles.selectAllLabel}>
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={isAllSelected}
        onChange={toggleSelectAll}
        style={styles.checkbox}
        aria-label={`${label} (${files.length} files)`}
      />
      <span style={styles.selectAllText}>
        {label}
        {showCount && (
          <span style={styles.selectionCount}>
            {selectionCount > 0 ? ` (${selectionCount}/${files.length})` : ` (${files.length})`}
          </span>
        )}
      </span>
    </label>
  );
};

// ============================================================================
// Bulk Action Bar Component
// ============================================================================

export interface BulkActionBarProps {
  className?: string;
  onDelete?: () => void;
  onDownload?: () => void;
  onMove?: () => void;
  showDeleteConfirm?: boolean;
  deleteConfirmMessage?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  className = '',
  onDelete,
  onDownload,
  onMove,
  showDeleteConfirm = true,
  deleteConfirmMessage = 'Are you sure you want to delete the selected files? This action cannot be undone.',
}) => {
  const { hasSelection, selectionCount, deleteSelected, deselectAll, getSelectedFiles } =
    useBulkFiles();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      setShowConfirm(true);
    } else {
      handleConfirmDelete();
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSelected();
      onDelete?.();
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleDownload = () => {
    const selectedFiles = getSelectedFiles();
    onDownload?.();
    // Trigger downloads for files with URLs
    selectedFiles.forEach((file) => {
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  if (!hasSelection) {
    return null;
  }

  return (
    <>
      <div className={`bulk-action-bar ${className}`} style={styles.actionBar}>
        <span style={styles.actionBarText}>
          {selectionCount} file{selectionCount !== 1 ? 's' : ''} selected
        </span>

        <div style={styles.actionButtons}>
          <button onClick={deselectAll} style={styles.actionButton} aria-label="Clear selection">
            ✕ Clear
          </button>

          {onDownload && (
            <button
              onClick={handleDownload}
              style={styles.actionButton}
              aria-label="Download selected files"
            >
              ⬇️ Download
            </button>
          )}

          {onMove && (
            <button onClick={onMove} style={styles.actionButton} aria-label="Move selected files">
              📁 Move
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            style={styles.deleteButton}
            disabled={isDeleting}
            aria-label="Delete selected files"
          >
            {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div
          style={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div style={styles.modalContent}>
            <h3 id="delete-confirm-title" style={styles.modalTitle}>
              Confirm Delete
            </h3>
            <p style={styles.modalMessage}>{deleteConfirmMessage}</p>
            <p style={styles.modalFileCount}>
              {selectionCount} file{selectionCount !== 1 ? 's' : ''} will be deleted.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowConfirm(false)} style={styles.cancelButton} autoFocus>
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={styles.confirmDeleteButton}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================================
// File Item Component
// ============================================================================

export interface FileItemProps {
  file: BulkFile;
  showCheckbox?: boolean;
  showThumbnail?: boolean;
  showSize?: boolean;
  showStatus?: boolean;
  onRemove?: (id: string) => void;
  onClick?: (file: BulkFile) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  showCheckbox = true,
  showThumbnail = true,
  showSize = true,
  showStatus = true,
  onRemove,
  onClick,
}) => {
  const { selectedIds, toggleSelect } = useBulkFiles();
  const isSelected = selectedIds.has(file.id);

  return (
    <div
      className={`bulk-file-item ${isSelected ? 'selected' : ''}`}
      style={{
        ...styles.fileItem,
        ...(isSelected ? styles.fileItemSelected : {}),
      }}
      onClick={() => onClick?.(file)}
      role="listitem"
      aria-selected={isSelected}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(file.id)}
          onClick={(e) => e.stopPropagation()}
          style={styles.fileCheckbox}
          aria-label={`Select ${file.name}`}
        />
      )}

      {showThumbnail && (
        <div style={styles.thumbnail}>
          {file.thumbnailUrl ? (
            <img src={file.thumbnailUrl} alt={file.name} style={styles.thumbnailImage} />
          ) : (
            <span style={styles.fileIcon}>{getFileIcon(file.type)}</span>
          )}
        </div>
      )}

      <div style={styles.fileInfo}>
        <span style={styles.fileName} title={file.name}>
          {file.name}
        </span>
        <span style={styles.fileMeta}>
          {showSize && <span>{formatFileSize(file.size)}</span>}
          {showStatus && file.status !== 'uploaded' && (
            <span style={styles.fileStatus} data-status={file.status}>
              {file.status === 'uploading' && `${file.progress || 0}%`}
              {file.status === 'pending' && 'Pending'}
              {file.status === 'error' && file.error}
            </span>
          )}
        </span>
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(file.id);
          }}
          style={styles.removeButton}
          aria-label={`Remove ${file.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ============================================================================
// File Grid Component
// ============================================================================

export interface FileGridProps {
  className?: string;
  columns?: number;
  gap?: number;
  showCheckbox?: boolean;
  showThumbnail?: boolean;
  showSize?: boolean;
  onFileClick?: (file: BulkFile) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  className = '',
  columns = 4,
  gap = 16,
  showCheckbox = true,
  showThumbnail = true,
  showSize = true,
  onFileClick,
}) => {
  const { files, removeFiles } = useBulkFiles();

  if (files.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📂</span>
        <p style={styles.emptyText}>No files added yet</p>
        <p style={styles.emptyHint}>Drag and drop files or click to browse</p>
      </div>
    );
  }

  return (
    <div
      className={`bulk-file-grid ${className}`}
      style={{
        ...styles.fileGrid,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
      role="list"
      aria-label={`${files.length} files`}
    >
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          showCheckbox={showCheckbox}
          showThumbnail={showThumbnail}
          showSize={showSize}
          onRemove={(id) => removeFiles([id])}
          onClick={onFileClick}
        />
      ))}
    </div>
  );
};

// ============================================================================
// Multi-File Dropzone Component
// ============================================================================

export interface MultiFileDropzoneProps {
  className?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const MultiFileDropzone: React.FC<MultiFileDropzoneProps> = ({
  className = '',
  accept,
  maxFiles,
  maxSize,
  disabled = false,
  children,
}) => {
  const { files, addFiles } = useBulkFiles();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) {
        return;
      }

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [disabled, addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      addFiles(selectedFiles);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const remainingSlots = maxFiles ? maxFiles - files.length : undefined;

  return (
    <div
      className={`multi-file-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      style={{
        ...styles.dropzone,
        ...(isDragging ? styles.dropzoneDragging : {}),
        ...(disabled ? styles.dropzoneDisabled : {}),
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label="Drop files here or click to browse"
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileSelect}
        style={styles.hiddenInput}
        disabled={disabled}
        aria-hidden="true"
      />

      {children || (
        <div style={styles.dropzoneContent}>
          <span style={styles.dropzoneIcon}>{isDragging ? '📥' : '📤'}</span>
          <p style={styles.dropzoneText}>
            {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
          </p>
          {remainingSlots !== undefined && (
            <p style={styles.dropzoneHint}>
              {remainingSlots > 0
                ? `${remainingSlots} file${remainingSlots !== 1 ? 's' : ''} can still be added`
                : 'Maximum files reached'}
            </p>
          )}
          {maxSize && <p style={styles.dropzoneHint}>Max file size: {formatFileSize(maxSize)}</p>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Complete Bulk File Manager Component
// ============================================================================

export interface BulkFileManagerProps {
  className?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  gridColumns?: number;
  onFilesChange?: (files: BulkFile[]) => void;
  onDeleteFiles?: (ids: string[]) => Promise<BulkOperationResult>;
}

export const BulkFileManager: React.FC<BulkFileManagerProps> = ({
  className = '',
  maxFiles = 50,
  maxFileSize = 50 * 1024 * 1024,
  acceptedTypes,
  gridColumns = 4,
  onFilesChange,
  onDeleteFiles,
}) => {
  return (
    <BulkFileProvider
      maxFiles={maxFiles}
      maxFileSize={maxFileSize}
      acceptedTypes={acceptedTypes}
      onFilesAdded={(files) => onFilesChange?.(files)}
      onDeleteFiles={onDeleteFiles}
    >
      <div className={`bulk-file-manager ${className}`} style={styles.manager}>
        <MultiFileDropzone
          maxFiles={maxFiles}
          maxSize={maxFileSize}
          accept={acceptedTypes?.join(',')}
        />

        <div style={styles.toolbar}>
          <SelectAllCheckbox />
          <BulkActionBar />
        </div>

        <FileGrid columns={gridColumns} />
      </div>
    </BulkFileProvider>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  // Select All
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    userSelect: 'none',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  selectAllText: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  selectionCount: {
    color: '#6B7280',
    fontWeight: 400,
  },

  // Action Bar
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    border: '1px solid #BFDBFE',
    marginBottom: '16px',
  },
  actionBarText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1E40AF',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  modalMessage: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#4B5563',
    lineHeight: 1.5,
  },
  modalFileCount: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    fontWeight: 500,
    color: '#DC2626',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  confirmDeleteButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  // File Item
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  fileItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  fileCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  thumbnail: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fileIcon: {
    fontSize: '24px',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fileName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#6B7280',
  },
  fileStatus: {
    fontWeight: 500,
  },
  removeButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },

  // File Grid
  fileGrid: {
    display: 'grid',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
  },
  emptyHint: {
    margin: 0,
    fontSize: '14px',
    color: '#6B7280',
  },

  // Dropzone
  dropzone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '150px',
    padding: '24px',
    backgroundColor: '#FAFAFA',
    border: '2px dashed #D1D5DB',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '16px',
  },
  dropzoneDragging: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderStyle: 'solid',
  },
  dropzoneDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dropzoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  dropzoneIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  dropzoneText: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
  },
  dropzoneHint: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    color: '#6B7280',
  },
  hiddenInput: {
    display: 'none',
  },

  // Manager
  manager: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
};

// ============================================================================
// Export
// ============================================================================

export default BulkFileManager;
