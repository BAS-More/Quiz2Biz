import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadInput } from './FileUploadInput';

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('FileUploadInput', () => {
  const mockOnChange = vi.fn();
  const mockQuestion = {
    id: 'q1',
    sectionId: 's1',
    text: 'Upload files',
    type: 'FILE_UPLOAD' as const,
    orderIndex: 0,
    isRequired: false,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    vi.clearAllMocks();
  });

  it('renders drag and drop zone', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} />);

    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
  });

  it('shows file input element', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} />);

    // File input should exist but be hidden
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('displays file preview for uploaded files', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileWithPreview = {
      id: '1',
      file,
      preview: 'mock-url',
    };

    render(<FileUploadInput question={mockQuestion} value={[fileWithPreview]} onChange={mockOnChange} />);

    expect(screen.getByAltText('test.png')).toBeInTheDocument();
    expect(screen.getByText('test.png')).toBeInTheDocument();
  });

  it('displays generic icon for non-image files', () => {
    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
    const fileWithPreview = {
      id: '1',
      file,
      preview: undefined, // Non-image files don't have preview
    };

    render(<FileUploadInput question={mockQuestion} value={[fileWithPreview]} onChange={mockOnChange} />);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('handles file removal', async () => {
    const user = userEvent.setup();
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileWithPreview = {
      id: '1',
      file,
      preview: undefined,
    };

    render(<FileUploadInput question={mockQuestion} value={[fileWithPreview]} onChange={mockOnChange} />);

    // Get the remove button (it's the one inside the file preview, not the dropzone)
    const buttons = screen.getAllByRole('button');
    const removeButton = buttons.find((btn) => btn.classList.contains('bg-red-500'));
    expect(removeButton).toBeTruthy();
    await user.click(removeButton!);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('displays multiple files', () => {
    const files = [
      { id: '1', file: new File(['1'], 'file1.txt', { type: 'text/plain' }), preview: undefined },
      { id: '2', file: new File(['2'], 'file2.png', { type: 'image/png' }), preview: 'mock-url' },
    ];

    render(<FileUploadInput question={mockQuestion} value={files} onChange={mockOnChange} />);

    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.png')).toBeInTheDocument();
  });

  it('disables upload when disabled prop is true', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} disabled={true} />);

    const dropzone = screen.getByRole('button', { name: /upload files/i });
    expect(dropzone).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows accepted file types in help text', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} />);

    expect(screen.getByText(/images.*pdfs.*documents/i)).toBeInTheDocument();
  });

  it('has accessible label for drop zone', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} />);

    const dropzone = screen.getByRole('button', { name: /upload files/i });
    expect(dropzone).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<FileUploadInput question={mockQuestion} value={[]} onChange={mockOnChange} error="File too large" />);

    expect(screen.getByText('File too large')).toBeInTheDocument();
  });
});
