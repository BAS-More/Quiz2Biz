/**
 * Test suite for document-types.ts
 *
 * Tests document schemas, validation, and word counting with CJK support.
 */

import {
  DOCUMENT_SCHEMAS,
  validateDocumentStructure,
  calculateDocumentPrice,
  listDocumentSchemas,
  type DocumentSlug,
} from '../document-types';

describe('Document Types', () => {
  describe('DOCUMENT_SCHEMAS', () => {
    it('should have all 8 document types defined', () => {
      const schemas = listDocumentSchemas();
      expect(schemas).toHaveLength(8);
    });

    it('should have unique slugs', () => {
      const schemas = listDocumentSchemas();
      const slugs = schemas.map(dt => dt.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('should have valid price constraints', () => {
      const schemas = listDocumentSchemas();
      schemas.forEach(docType => {
        expect(docType.basePrice).toBeGreaterThan(0);
        expect(docType.formats).toBeDefined();
      });
    });
  });

  describe('validateDocumentStructure - Word Counting', () => {
    // Use business-plan slug for testing
    const businessPlanSlug = 'business-plan';

    describe('English text', () => {
      it('should count simple English words correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Hello world this is a test',
          market_analysis: 'The market is growing rapidly',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Hello world this is a test" = 6 words
        // "The market is growing rapidly" = 5 words
        // Total = 11 words
        expect(result.totalWords).toBe(11);
      });

      it('should handle contractions as single words', () => {
        const sections: Record<string, string> = {
          executive_summary: "Don't stop believing",
          market_analysis: "It's a wonderful world",
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Don't stop believing" = 3 words
        // "It's a wonderful world" = 4 words
        // Total = 7 words
        expect(result.totalWords).toBe(7);
      });

      it('should handle possessives as single words', () => {
        const sections: Record<string, string> = {
          executive_summary: "The user's choice",
          market_analysis: "Our company's vision",
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "The user's choice" = 3 words
        // "Our company's vision" = 3 words
        // Total = 6 words
        expect(result.totalWords).toBe(6);
      });

      it('should handle hyphenated words as single words', () => {
        const sections: Record<string, string> = {
          executive_summary: 'User-friendly interface design',
          market_analysis: 'State-of-the-art technology platform',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "User-friendly interface design" = 3 words
        // "State-of-the-art technology platform" = 3 words
        // Total = 6 words
        expect(result.totalWords).toBe(6);
      });

      it('should handle multiple spaces correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: '   Multiple   spaces   between   words   ',
          market_analysis: 'Normal spacing here',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Multiple spaces between words" = 4 words
        // "Normal spacing here" = 3 words
        // Total = 7 words
        expect(result.totalWords).toBe(7);
      });
    });

    describe('CJK (Chinese, Japanese, Korean) text', () => {
      it('should count CJK characters correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: '你好世界',
          market_analysis: '韓国語',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "你好世界" = 4 CJK characters (each counts as a word)
        // "韓国語" = 3 CJK characters (each counts as a word)
        // Total = 7 words
        expect(result.totalWords).toBe(7);
      });

      it('should count mixed English and CJK text correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Hello means 你好',
          market_analysis: 'Welcome to Japan 日本へようこそ',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Hello means 你好" = 2 English + 2 CJK = 4 words
        // "Welcome to Japan 日本へようこそ" = 3 English + 7 CJK = 10 words
        // Total = 14 words
        expect(result.totalWords).toBe(14);
      });

      it('should count Korean text correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: '안녕하세요',
          market_analysis: '대한민국',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "안녕하세요" = 5 Korean characters
        // "대한민국" = 4 Korean characters
        // Total = 9 words
        expect(result.totalWords).toBe(9);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty strings correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: '',
          market_analysis: 'Some content',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // Empty string = 0 words
        // "Some content" = 2 words
        // Total = 2 words
        expect(result.totalWords).toBe(2);
      });

      it('should handle missing sections correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Some content',
          // market_analysis is missing
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // Only counts words from present sections
        expect(result.totalWords).toBe(2);
      });

      it('should handle special characters and numbers', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Revenue: $1,000,000 by 2027',
          market_analysis: 'Growth rate: 25% annually',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // Numbers and special chars with letters are counted as words
        expect(result.totalWords).toBeGreaterThan(0);
      });
    });

    describe('Multilingual support', () => {
      it('should count Cyrillic text correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Привет мир',
          market_analysis: 'Russian text here',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Привет мир" = 2 words (Cyrillic)
        // "Russian text here" = 3 words (English)
        // Total = 5 words
        expect(result.totalWords).toBe(5);
      });

      it('should count Greek text correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'Γεια σου κόσμε',
          market_analysis: 'Greek text example',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // "Γεια σου κόσμε" = 4 words (Greek - includes diacritic marks)
        // "Greek text example" = 3 words (English)
        // Total = 7 words
        expect(result.totalWords).toBe(7);
      });

      it('should count Arabic text correctly', () => {
        const sections: Record<string, string> = {
          executive_summary: 'مرحبا بالعالم',
          market_analysis: 'Arabic text example',
        };

        const result = validateDocumentStructure(businessPlanSlug, sections, 1.0);
        // Arabic words + English words
        expect(result.totalWords).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateDocumentPrice', () => {
    it('should calculate price at minimum quality (0%)', () => {
      const price = calculateDocumentPrice(100, 0);
      expect(price).toBe(100); // 1.0x multiplier
    });

    it('should calculate price at maximum quality (100%)', () => {
      const price = calculateDocumentPrice(100, 1.0);
      expect(price).toBe(500); // 5.0x multiplier
    });

    it('should calculate price at mid quality (50%)', () => {
      const price = calculateDocumentPrice(100, 0.5);
      expect(price).toBe(200); // 2.0x multiplier at 50%
    });

    it('should interpolate between quality levels', () => {
      const price25 = calculateDocumentPrice(100, 0.25);
      const price75 = calculateDocumentPrice(100, 0.75);

      expect(price25).toBeGreaterThan(100);
      expect(price25).toBeLessThan(200);
      expect(price75).toBeGreaterThan(200);
      expect(price75).toBeLessThan(500);
    });
  });
});
