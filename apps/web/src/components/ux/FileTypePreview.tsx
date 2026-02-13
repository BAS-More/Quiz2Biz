/**
 * File Type Preview & Validation
 *
 * Shows file type icons before upload.
 * Validates on selection (not after upload).
 * Clear error messaging.
 *
 * Nielsen Heuristic #5: Error Prevention
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FileTypeConfig {
  extensions: string[];
  mimeTypes: string[];
  icon: string;
  label: string;
  maxSize?: number; // bytes
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: 'type' | 'size' | 'name' | 'count' | 'custom';
  message: string;
  file?: File;
}

export interface FilePreview {
  id: string;
  file: File;
  preview?: string;
  icon: string;
  label: string;
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// File Type Configurations
// ============================================================================

export const FILE_TYPES: Record<string, FileTypeConfig> = {
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf',
      'application/vnd.oasis.opendocument.text',
    ],
    icon: '📄',
    label: 'Document',
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  spreadsheet: {
    extensions: ['.xls', '.xlsx', '.csv', '.ods'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.oasis.opendocument.spreadsheet',
    ],
    icon: '📊',
    label: 'Spreadsheet',
    maxSize: 50 * 1024 * 1024,
  },
  image: {
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
    icon: '🖼️',
    label: 'Image',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    extensions: ['.mp4', '.webm', '.mov', '.avi'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    icon: '🎬',
    label: 'Video',
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.m4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    icon: '🎵',
    label: 'Audio',
    maxSize: 50 * 1024 * 1024,
  },
  archive: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ],
    icon: '📦',
    label: 'Archive',
    maxSize: 100 * 1024 * 1024,
  },
  code: {
    extensions: ['.json', '.xml', '.yaml', '.yml', '.md', '.html', '.css', '.js', '.ts'],
    mimeTypes: [
      'application/json',
      'application/xml',
      'text/yaml',
      'text/markdown',
      'text/html',
      'text/css',
      'text/javascript',
      'application/typescript',
    ],
    icon: '⚙️',
    label: 'Code',
    maxSize: 10 * 1024 * 1024,
  },
  presentation: {
    extensions: ['.ppt', '.pptx', '.odp'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    icon: '📽️',
    label: 'Presentation',
    maxSize: 100 * 1024 * 1024,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getFileTypeConfig(file: File): FileTypeConfig | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  for (const config of Object.values(FILE_TYPES)) {
    if (config.extensions.includes(extension) || config.mimeTypes.includes(mimeType)) {
      return config;
    }
  }
  return null;
}

export function getFileIcon(file: File): string {
  const config = getFileTypeConfig(file);
  if (config) {
    return config.icon;
  }

  // Fallback based on MIME type category
  if (file.type.startsWith('image/')) {
    return '🖼️';
  }
  if (file.type.startsWith('video/')) {
    return '🎬';
  }
  if (file.type.startsWith('audio/')) {
    return '🎵';
  }
  if (file.type.startsWith('text/')) {
    return '📝';
  }

  return '📎';
}

export function getFileLabel(file: File): string {
  const config = getFileTypeConfig(file);
  return config?.label || 'File';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationOptions {
  allowedTypes?: string[]; // e.g., ['document', 'image']
  maxFileSize?: number;
  maxFiles?: number;
  minFiles?: number;
  customValidator?: (file: File) => string | null;
}

export function validateFile(file: File, options: ValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];

  // Type validation
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const fileTypeConfig = getFileTypeConfig(file);
    const fileTypeName = fileTypeConfig
      ? Object.entries(FILE_TYPES).find(([_, config]) => config === fileTypeConfig)?.[0]
      : null;

    if (!fileTypeName || !options.allowedTypes.includes(fileTypeName)) {
      const allowedLabels = options.allowedTypes
        .map((type) => FILE_TYPES[type]?.label || type)
        .join(', ');
      errors.push({
        type: 'type',
        message: `File type not allowed. Accepted: ${allowedLabels}`,
        file,
      });
    }
  }

  // Size validation
  const maxSize = options.maxFileSize || getFileTypeConfig(file)?.maxSize || 100 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push({
      type: 'size',
      message: `File too large. Maximum size: ${formatFileSize(maxSize)}`,
      file,
    });
  }

  // Name validation (no special characters that could cause issues)
  if (!/^[\w\-. ]+$/.test(file.name)) {
    errors.push({
      type: 'name',
      message: 'File name contains invalid characters',
      file,
    });
  }

  // Custom validation
  if (options.customValidator) {
    const customError = options.customValidator(file);
    if (customError) {
      errors.push({
        type: 'custom',
        message: customError,
        file,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateFiles(files: File[], options: ValidationOptions = {}): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Count validation
  if (options.maxFiles && files.length > options.maxFiles) {
    allErrors.push({
      type: 'count',
      message: `Too many files. Maximum: ${options.maxFiles}`,
    });
  }

  if (options.minFiles && files.length < options.minFiles) {
    allErrors.push({
      type: 'count',
      message: `Not enough files. Minimum: ${options.minFiles}`,
    });
  }

  // Individual file validation
  for (const file of files) {
    const result = validateFile(file, options);
    allErrors.push(...result.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

// ============================================================================
// File Preview Hook
// ============================================================================

interface UseFilePreviewOptions extends ValidationOptions {
  generateThumbnails?: boolean;
}

interface UseFilePreviewReturn {
  files: FilePreview[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  hasErrors: boolean;
  validFiles: FilePreview[];
  invalidFiles: FilePreview[];
}

export function useFilePreview(options: UseFilePreviewOptions = {}): UseFilePreviewReturn {
  const { generateThumbnails = true, ...validationOptions } = options;
  const [files, setFiles] = useState<FilePreview[]>([]);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const previews: FilePreview[] = newFiles.map((file) => {
        const validation = validateFile(file, validationOptions);
        const preview: FilePreview = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          icon: getFileIcon(file),
          label: getFileLabel(file),
          valid: validation.valid,
          errors: validation.errors,
        };

        // Generate thumbnail for images
        if (generateThumbnails && file.type.startsWith('image/') && validation.valid) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === preview.id ? { ...f, preview: e.target?.result as string } : f,
              ),
            );
          };
          reader.readAsDataURL(file);
        }

        return preview;
      });

      setFiles((prev) => [...prev, ...previews]);
    },
    [generateThumbnails, validationOptions],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const hasErrors = files.some((f) => !f.valid);
  const validFiles = files.filter((f) => f.valid);
  const invalidFiles = files.filter((f) => !f.valid);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    hasErrors,
    validFiles,
    invalidFiles,
  };
}

// ============================================================================
// File Preview Item Component
// ============================================================================

interface FilePreviewItemProps {
  preview: FilePreview;
  onRemove: () => void;
  compact?: boolean;
  showValidation?: boolean;
}

export const FilePreviewItem: React.FC<FilePreviewItemProps> = ({
  preview,
  onRemove,
  compact = false,
  showValidation = true,
}) => {
  return (
    <div
      className={`file-preview-item ${!preview.valid ? 'file-preview-item--invalid' : ''}`}
      style={{
        display: 'flex',
        alignItems: compact ? 'center' : 'flex-start',
        gap: compact ? 8 : 12,
        padding: compact ? 8 : 12,
        background: preview.valid ? '#f7fafc' : '#fff5f5',
        border: `1px solid ${preview.valid ? '#e2e8f0' : '#feb2b2'}`,
        borderRadius: 8,
      }}
    >
      {/* Thumbnail or Icon */}
      {preview.preview ? (
        <img
          src={preview.preview}
          alt={preview.file.name}
          style={{
            width: compact ? 32 : 48,
            height: compact ? 32 : 48,
            objectFit: 'cover',
            borderRadius: 4,
          }}
        />
      ) : (
        <span
          style={{
            width: compact ? 32 : 48,
            height: compact ? 32 : 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: preview.valid ? '#e2e8f0' : '#fed7d7',
            borderRadius: 4,
            fontSize: compact ? 18 : 24,
          }}
        >
          {preview.icon}
        </span>
      )}

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: compact ? 13 : 14,
            fontWeight: 500,
            color: preview.valid ? '#2d3748' : '#c53030',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={preview.file.name}
        >
          {preview.file.name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#718096' }}>
          {preview.label} • {formatFileSize(preview.file.size)}
        </p>

        {/* Validation errors */}
        {showValidation && preview.errors.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {preview.errors.map((error, idx) => (
              <p
                key={idx}
                style={{
                  margin: idx > 0 ? '4px 0 0' : 0,
                  fontSize: 12,
                  color: '#c53030',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span aria-hidden="true">⚠️</span> {error.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {preview.valid ? (
          <span
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#c6f6d5',
              borderRadius: '50%',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">✓</span>
          </span>
        ) : (
          <span
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fed7d7',
              borderRadius: '50%',
              fontSize: 12,
            }}
          >
            <span aria-hidden="true">✕</span>
          </span>
        )}

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
          aria-label={`Remove ${preview.file.name}`}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// File Type Picker Component
// ============================================================================

interface FileTypePickerProps {
  allowedTypes: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
}

export const FileTypePicker: React.FC<FileTypePickerProps> = ({
  allowedTypes,
  selected,
  onChange,
  multiple = true,
}) => {
  const toggleType = (type: string) => {
    if (multiple) {
      if (selected.includes(type)) {
        onChange(selected.filter((t) => t !== type));
      } else {
        onChange([...selected, type]);
      }
    } else {
      onChange([type]);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {allowedTypes.map((type) => {
        const config = FILE_TYPES[type];
        if (!config) {
          return null;
        }

        const isSelected = selected.includes(type);

        return (
          <button
            key={type}
            onClick={() => toggleType(type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: isSelected ? '#ebf8ff' : '#f7fafc',
              border: `2px solid ${isSelected ? '#3182ce' : '#e2e8f0'}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{config.icon}</span>
            <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// Dropzone with Validation
// ============================================================================

interface ValidatedDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  validationOptions?: ValidationOptions;
  accept?: string;
  multiple?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const ValidatedDropzone: React.FC<ValidatedDropzoneProps> = ({
  onFilesSelected,
  validationOptions = {},
  accept,
  multiple = true,
  children,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const result = validateFiles(files, validationOptions);

      if (!result.valid) {
        setErrors(result.errors);
        // Only pass valid files
        const validFiles = files.filter((file) => {
          const fileResult = validateFile(file, validationOptions);
          return fileResult.valid;
        });
        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
      } else {
        setErrors([]);
        onFilesSelected(files);
      }
    },
    [validationOptions, onFilesSelected],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const result = validateFiles(files, validationOptions);

      if (!result.valid) {
        setErrors(result.errors);
        const validFiles = files.filter((file) => {
          const fileResult = validateFile(file, validationOptions);
          return fileResult.valid;
        });
        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
      } else {
        setErrors([]);
        onFilesSelected(files);
      }

      // Reset input
      e.target.value = '';
    },
    [validationOptions, onFilesSelected],
  );

  // Build accept string from allowed types
  const acceptString = useMemo(() => {
    if (accept) {
      return accept;
    }
    if (!validationOptions.allowedTypes) {
      return undefined;
    }

    const extensions: string[] = [];
    for (const type of validationOptions.allowedTypes) {
      const config = FILE_TYPES[type];
      if (config) {
        extensions.push(...config.extensions);
      }
    }
    return extensions.join(',');
  }, [accept, validationOptions.allowedTypes]);

  return (
    <div
      className={`validated-dropzone ${isDragging ? 'validated-dropzone--dragging' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        padding: 32,
        border: `2px dashed ${isDragging ? '#3182ce' : errors.length > 0 ? '#e53e3e' : '#cbd5e0'}`,
        borderRadius: 12,
        background: isDragging ? '#ebf8ff' : errors.length > 0 ? '#fff5f5' : '#f7fafc',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        accept={acceptString}
        multiple={multiple}
        style={{ display: 'none' }}
      />

      {children || (
        <>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }} aria-hidden="true">
            📁
          </span>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#2d3748' }}>
            {isDragging ? 'Drop files here' : 'Drag and drop files, or click to select'}
          </p>
          {validationOptions.allowedTypes && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#718096' }}>
              Allowed:{' '}
              {validationOptions.allowedTypes.map((t) => FILE_TYPES[t]?.label || t).join(', ')}
            </p>
          )}
          {validationOptions.maxFileSize && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#718096' }}>
              Max size: {formatFileSize(validationOptions.maxFileSize)}
            </p>
          )}
        </>
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {errors.slice(0, 3).map((error, idx) => (
            <p
              key={idx}
              style={{
                margin: idx > 0 ? '4px 0 0' : 0,
                fontSize: 13,
                color: '#c53030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span aria-hidden="true">⚠️</span> {error.message}
            </p>
          ))}
          {errors.length > 3 && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#718096' }}>
              + {errors.length - 3} more errors
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidatedDropzone;
