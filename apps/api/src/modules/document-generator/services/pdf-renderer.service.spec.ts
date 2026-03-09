/**
 * PDF Renderer Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PdfRendererService } from './pdf-renderer.service';
import * as puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('PdfRendererService', () => {
  let service: PdfRendererService;
  let mockBrowser: {
    newPage: jest.Mock;
    close: jest.Mock;
  };
  let mockPage: {
    setContent: jest.Mock;
    pdf: jest.Mock;
  };

  beforeEach(async () => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfRendererService],
    }).compile();

    service = module.get<PdfRendererService>(PdfRendererService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFromMarkdown', () => {
    it('should generate PDF from markdown', async () => {
      const markdown = '# Hello World\n\nThis is a test document.';
      const options = { title: 'Test Document' };

      const result = await service.generateFromMarkdown(markdown, options);

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
        }),
      );
    });

    it('should convert markdown headers to HTML', async () => {
      const markdown = '# H1\n## H2\n### H3';
      const options = { title: 'Headers Test' };

      await service.generateFromMarkdown(markdown, options);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h1>H1</h1>'),
        expect.any(Object),
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h2>H2</h2>'),
        expect.any(Object),
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h3>H3</h3>'),
        expect.any(Object),
      );
    });

    it('should convert bold and italic text', async () => {
      const markdown = 'This is **bold** and *italic* text.';
      const options = { title: 'Formatting Test' };

      await service.generateFromMarkdown(markdown, options);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<strong>bold</strong>'),
        expect.any(Object),
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<em>italic</em>'),
        expect.any(Object),
      );
    });

    it('should convert links to anchor tags', async () => {
      const markdown = 'Visit [Quiz2Biz](https://quiz2biz.com)';
      const options = { title: 'Link Test' };

      await service.generateFromMarkdown(markdown, options);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<a href="https://quiz2biz.com">Quiz2Biz</a>'),
        expect.any(Object),
      );
    });

    it('should close browser after generation', async () => {
      const markdown = '# Test';
      const options = { title: 'Close Test' };

      await service.generateFromMarkdown(markdown, options);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close browser on error', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF error'));

      const markdown = '# Test';
      const options = { title: 'Error Test' };

      await expect(
        service.generateFromMarkdown(markdown, options),
      ).rejects.toThrow('PDF error');

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('generateFromHtml', () => {
    it('should generate PDF from HTML', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      const options = { title: 'HTML Test' };

      const result = await service.generateFromHtml(html, options);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockPage.setContent).toHaveBeenCalledWith(html, expect.any(Object));
    });

    it('should use default A4 format', async () => {
      const html = '<html><body>Test</body></html>';
      const options = { title: 'Format Test' };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
        }),
      );
    });

    it('should use custom format when specified', async () => {
      const html = '<html><body>Test</body></html>';
      const options = { title: 'Custom Format', format: 'Letter' as const };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter',
        }),
      );
    });

    it('should use default margins', async () => {
      const html = '<html><body>Test</body></html>';
      const options = { title: 'Margin Test' };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          margin: {
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in',
          },
        }),
      );
    });

    it('should use custom margins when specified', async () => {
      const html = '<html><body>Test</body></html>';
      const options = {
        title: 'Custom Margin Test',
        margin: { top: '2in', right: '2in', bottom: '2in', left: '2in' },
      };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          margin: options.margin,
        }),
      );
    });

    it('should include header and footer by default', async () => {
      const html = '<html><body>Test</body></html>';
      const options = { title: 'Header Footer Test' };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHeaderFooter: true,
          headerTemplate: expect.stringContaining('Header Footer Test'),
          footerTemplate: expect.stringContaining('Quiz2Biz'),
        }),
      );
    });

    it('should print background', async () => {
      const html = '<html><body>Test</body></html>';
      const options = { title: 'Background Test' };

      await service.generateFromHtml(html, options);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          printBackground: true,
        }),
      );
    });
  });

  describe('generateFromSections', () => {
    it('should generate PDF from sections array', async () => {
      const sections = [
        { title: 'Introduction', content: 'This is the intro.' },
        { title: 'Methods', content: 'This is the methodology.' },
        { title: 'Conclusion', content: 'This is the conclusion.' },
      ];
      const options = { title: 'Multi-Section Document' };

      const result = await service.generateFromSections(sections, options);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include all sections in HTML', async () => {
      const sections = [
        { title: 'Section A', content: 'Content A' },
        { title: 'Section B', content: 'Content B' },
      ];
      const options = { title: 'Sections Test' };

      await service.generateFromSections(sections, options);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h2>Section A</h2>'),
        expect.any(Object),
      );
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h2>Section B</h2>'),
        expect.any(Object),
      );
    });

    it('should include main title as H1', async () => {
      const sections = [{ title: 'Section', content: 'Content' }];
      const options = { title: 'Main Title' };

      await service.generateFromSections(sections, options);

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<h1>Main Title</h1>'),
        expect.any(Object),
      );
    });
  });

  describe('puppeteer configuration', () => {
    it('should launch with security flags', async () => {
      await service.generateFromHtml('<html></html>', { title: 'Test' });

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ]),
        }),
      );
    });

    it('should wait for network idle', async () => {
      await service.generateFromHtml('<html></html>', { title: 'Test' });

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          waitUntil: 'networkidle0',
        }),
      );
    });
  });
});
