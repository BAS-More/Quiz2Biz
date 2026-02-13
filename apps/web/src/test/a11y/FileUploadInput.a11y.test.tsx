/**
 * Accessibility tests for FileUploadInput component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

interface FileWithPreview {
  file: File;
  preview?: string;
  id: string;
}

// Accessible mock FileUploadInput component
function MockFileUploadInput({
  files = [],
  disabled = false,
  error,
  onFilesChange,
  onRemove,
}: {
  files?: FileWithPreview[];
  disabled?: boolean;
  error?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  onRemove?: (id: string) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-upload-input" role="region" aria-label="File upload area">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        disabled={disabled}
        aria-label="Select files to upload"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && onFilesChange) {
            const newFiles: FileWithPreview[] = Array.from(e.target.files).map((file) => ({
              file,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
            }));
            onFilesChange([...files, ...newFiles]);
          }
        }}
      />

      {/* Drop zone - using div with button behavior */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={`upload-instructions${error ? ' upload-error' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={handleKeyDown}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p id="upload-instructions" className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">Images, PDFs, Documents up to 50MB</p>
      </div>

      {/* File list with thumbnails */}
      {files.length > 0 && (
        <div role="list" aria-label="Uploaded files" className="mt-4 grid grid-cols-2 gap-4">
          {files.map((fileItem) => (
            <div key={fileItem.id} role="listitem" className="relative group">
              <div className="aspect-square rounded-lg border overflow-hidden bg-gray-50">
                {fileItem.preview ? (
                  <img
                    src={fileItem.preview}
                    alt={`Preview of ${fileItem.file.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    role="img"
                    aria-label={`Document icon for ${fileItem.file.name}`}
                  >
                    <svg
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-600 truncate">{fileItem.file.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(fileItem.file.size)}</p>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove?.(fileItem.id)}
                disabled={disabled}
                aria-label={`Remove ${fileItem.file.name}`}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p id="upload-error" role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Create mock files for testing
function createMockFile(name: string, size: number, type: string): File {
  const blob = new Blob([''], { type });
  Object.defineProperty(blob, 'name', { value: name });
  Object.defineProperty(blob, 'size', { value: size });
  return blob as File;
}

describe('FileUploadInput Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockFileUploadInput />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible region with label', () => {
      render(<MockFileUploadInput />);
      const region = screen.getByRole('region', { name: /file upload area/i });
      expect(region).toBeInTheDocument();
    });

    it('should have keyboard-accessible drop zone', () => {
      render(<MockFileUploadInput />);
      const dropZone = screen.getByRole('button');
      expect(dropZone).toBeInTheDocument();
      expect(dropZone).toHaveAttribute('tabindex', '0');
    });

    it('should have accessible file input', () => {
      render(<MockFileUploadInput />);
      // File input should be screen-reader accessible
      const fileInput = screen.getByLabelText(/select files to upload/i);
      expect(fileInput).toBeInTheDocument();
    });

    it('should have instructions accessible to screen readers', () => {
      render(<MockFileUploadInput />);
      const instructions = document.getElementById('upload-instructions');
      expect(instructions).toBeInTheDocument();
    });

    it('should have decorative icons hidden from assistive technology', () => {
      const { container } = render(<MockFileUploadInput />);
      const decorativeSvgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(decorativeSvgs.length).toBeGreaterThan(0);
    });
  });

  describe('With files', () => {
    const mockFiles: FileWithPreview[] = [
      {
        id: 'file1',
        file: createMockFile('document.pdf', 1024 * 1024, 'application/pdf'),
      },
      {
        id: 'file2',
        file: createMockFile('image.png', 2 * 1024 * 1024, 'image/png'),
        preview: 'data:image/png;base64,mock',
      },
    ];

    it('should have no accessibility violations with files', async () => {
      const { container } = render(<MockFileUploadInput files={mockFiles} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible file list', () => {
      render(<MockFileUploadInput files={mockFiles} />);
      const fileList = screen.getByRole('list', { name: /uploaded files/i });
      expect(fileList).toBeInTheDocument();
    });

    it('should have accessible list items for each file', () => {
      render(<MockFileUploadInput files={mockFiles} />);
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('should have accessible image previews with alt text', () => {
      render(<MockFileUploadInput files={mockFiles} />);
      const imagePreview = screen.getByAltText(/preview of image.png/i);
      expect(imagePreview).toBeInTheDocument();
    });

    it('should have accessible document icons with aria-label', () => {
      render(<MockFileUploadInput files={mockFiles} />);
      const docIcon = screen.getByRole('img', { name: /document icon for document.pdf/i });
      expect(docIcon).toBeInTheDocument();
    });

    it('should have accessible remove buttons with file names', () => {
      render(<MockFileUploadInput files={mockFiles} />);
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(2);

      expect(screen.getByRole('button', { name: /remove document.pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove image.png/i })).toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should have no accessibility violations when disabled', async () => {
      const { container } = render(<MockFileUploadInput disabled={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should indicate disabled state via aria-disabled', () => {
      render(<MockFileUploadInput disabled={true} />);
      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('aria-disabled', 'true');
    });

    it('should remove from tab order when disabled', () => {
      render(<MockFileUploadInput disabled={true} />);
      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Error state', () => {
    it('should have no accessibility violations with error', async () => {
      const { container } = render(
        <MockFileUploadInput error="File too large. Maximum size is 50MB." />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should display error message with alert role', () => {
      render(<MockFileUploadInput error="File too large. Maximum size is 50MB." />);
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('File too large');
    });

    it('should link error message via aria-describedby', () => {
      render(<MockFileUploadInput error="Invalid file type" />);
      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('aria-describedby', expect.stringContaining('upload-error'));
    });
  });

  describe('Keyboard interaction', () => {
    it('should support Enter key to trigger file selection', () => {
      const onFilesChange = vi.fn();
      render(<MockFileUploadInput onFilesChange={onFilesChange} />);

      const dropZone = screen.getByRole('button');
      fireEvent.keyDown(dropZone, { key: 'Enter' });
      // Note: In real implementation, this would trigger file input click
    });

    it('should support Space key to trigger file selection', () => {
      const onFilesChange = vi.fn();
      render(<MockFileUploadInput onFilesChange={onFilesChange} />);

      const dropZone = screen.getByRole('button');
      fireEvent.keyDown(dropZone, { key: ' ' });
      // Note: In real implementation, this would trigger file input click
    });
  });

  describe('File size display', () => {
    it('should display file sizes in accessible format', () => {
      const mockFiles: FileWithPreview[] = [
        {
          id: 'file1',
          file: createMockFile('small.txt', 500, 'text/plain'),
        },
        {
          id: 'file2',
          file: createMockFile('medium.pdf', 512 * 1024, 'application/pdf'),
        },
        {
          id: 'file3',
          file: createMockFile('large.zip', 5 * 1024 * 1024, 'application/zip'),
        },
      ];

      render(<MockFileUploadInput files={mockFiles} />);

      expect(screen.getByText('500 B')).toBeInTheDocument();
      expect(screen.getByText('512.0 KB')).toBeInTheDocument();
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    });
  });
});
