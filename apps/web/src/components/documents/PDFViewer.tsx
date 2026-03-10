/**
 * PDF Viewer Component
 * Provides PDF preview with zoom, navigation, and download controls
 */

import { useState, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  Loader2,
  FileWarning,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';
import { Button } from '../ui';
import clsx from 'clsx';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PDFViewerProps {
  /** URL or base64 data of the PDF */
  src: string;
  /** Title to display in the toolbar */
  title?: string;
  /** Callback when download is clicked */
  onDownload?: () => void;
  /** Show download button */
  showDownload?: boolean;
  /** Initial scale (default: 1.0) */
  initialScale?: number;
  /** Minimum scale (default: 0.5) */
  minScale?: number;
  /** Maximum scale (default: 3.0) */
  maxScale?: number;
  /** Enable fullscreen mode */
  enableFullscreen?: boolean;
  /** Custom class name */
  className?: string;
  /** Height of the viewer (default: 600px) */
  height?: number | string;
}

interface DocumentLoadSuccess {
  numPages: number;
}

const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.0;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

export function PDFViewer({
  src,
  title,
  onDownload,
  showDownload = true,
  initialScale = DEFAULT_SCALE,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
  enableFullscreen = true,
  className,
  height = 600,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: DocumentLoadSuccess) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle document load error
  const onDocumentLoadError = useCallback((err: Error) => {
    setIsLoading(false);
    setError(err.message || 'Failed to load PDF');
    console.error('PDF load error:', err);
  }, []);

  // Navigation handlers
  const goToFirstPage = useCallback(() => setPageNumber(1), []);
  const goToLastPage = useCallback(() => setPageNumber(numPages), [numPages]);
  const goToPrevPage = useCallback(() => setPageNumber((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(
    () => setPageNumber((prev) => Math.min(numPages, prev + 1)),
    [numPages],
  );

  // Zoom handlers
  const zoomIn = useCallback(
    () => setScale((prev) => Math.min(maxScale, prev + SCALE_STEP)),
    [maxScale],
  );
  const zoomOut = useCallback(
    () => setScale((prev) => Math.max(minScale, prev - SCALE_STEP)),
    [minScale],
  );
  const resetZoom = useCallback(() => setScale(initialScale), [initialScale]);

  // Rotation handler
  const rotate = useCallback(() => setRotation((prev) => (prev + 90) % 360), []);

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Handle page input change
  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 1 && value <= numPages) {
        setPageNumber(value);
      }
    },
    [numPages],
  );

  // Memoized options for react-pdf
  const documentOptions = useMemo(
    () => ({
      cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
    }),
    [],
  );

  // Scale percentage display
  const scalePercentage = Math.round(scale * 100);

  return (
    <div
      className={clsx(
        'flex flex-col bg-surface-100 rounded-lg border border-surface-200 overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-none',
        className,
      )}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-surface-200">
        {/* Left: Title */}
        <div className="flex items-center gap-2 min-w-0">
          {title && <h3 className="text-sm font-medium text-surface-700 truncate">{title}</h3>}
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToFirstPage}
            disabled={pageNumber <= 1 || isLoading}
            title="First page"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || isLoading}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={handlePageInputChange}
              disabled={isLoading}
              className="w-12 h-7 text-center text-sm border border-surface-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <span className="text-sm text-surface-500">/ {numPages || '?'}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToLastPage}
            disabled={pageNumber >= numPages || isLoading}
            title="Last page"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Zoom & Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= minScale || isLoading}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <button
            onClick={resetZoom}
            disabled={isLoading}
            className="px-2 py-1 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded transition-colors min-w-[60px]"
            title="Reset zoom"
          >
            {scalePercentage}%
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= maxScale || isLoading}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-surface-300 mx-1" />

          <Button variant="ghost" size="sm" onClick={rotate} disabled={isLoading} title="Rotate">
            <RotateCw className="h-4 w-4" />
          </Button>

          {enableFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}

          {showDownload && onDownload && (
            <>
              <div className="w-px h-5 bg-surface-300 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                disabled={isLoading}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-surface-200 flex items-start justify-center p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-danger-600">
            <FileWarning className="h-12 w-12" />
            <div className="text-center">
              <p className="font-medium">Failed to load PDF</p>
              <p className="text-sm text-surface-500 mt-1">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : (
          <Document
            file={src}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <span className="text-sm text-surface-500">Loading PDF...</span>
              </div>
            }
            options={documentOptions}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              loading={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
              }
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      {!error && numPages > 1 && (
        <div className="px-4 py-1.5 bg-surface-50 border-t border-surface-200 text-xs text-surface-400 text-center">
          Use arrow keys to navigate • Ctrl+Mouse wheel to zoom
        </div>
      )}
    </div>
  );
}

export default PDFViewer;
