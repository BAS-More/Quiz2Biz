import { Injectable, Logger } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { DocumentCategory } from '@prisma/client';
import { TemplateData, StandardSection } from './template-engine.service';

export interface DocumentTypeInfo {
  name: string;
  slug: string;
  category: DocumentCategory;
}

@Injectable()
export class DocumentBuilderService {
  private readonly logger = new Logger(DocumentBuilderService.name);

  /**
   * Build a DOCX document from template data
   */
  async buildDocument(templateData: TemplateData, documentType: DocumentTypeInfo): Promise<Buffer> {
    this.logger.log(`Building document: ${documentType.name}`);

    const sections = this.buildSections(templateData, documentType);

    const doc = new Document({
      creator: 'Adaptive Questionnaire System',
      title: documentType.name,
      description: `Generated ${documentType.name} document`,
      styles: this.getDocumentStyles(),
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: this.buildHeader(documentType.name),
          },
          footers: {
            default: this.buildFooter(),
          },
          children: sections,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Build document sections based on category and content
   */
  private buildSections(templateData: TemplateData, documentType: DocumentTypeInfo): Paragraph[] {
    const sections: Paragraph[] = [];

    // Title
    sections.push(this.buildTitle(documentType.name));

    // Document Control section
    sections.push(...this.buildDocumentControl(templateData));

    // Content sections based on category
    switch (documentType.category) {
      case DocumentCategory.CTO:
        sections.push(...this.buildCTOContent(templateData));
        break;
      case DocumentCategory.CFO:
        sections.push(...this.buildCFOContent(templateData));
        break;
      case DocumentCategory.BA:
        sections.push(...this.buildBAContent(templateData));
        break;
    }

    // Standards section for CTO documents
    if (templateData.standards && templateData.standards.length > 0) {
      sections.push(...this.buildStandardsSection(templateData.standards));
    }

    return sections;
  }

  /**
   * Build document title
   */
  private buildTitle(title: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    });
  }

  /**
   * Build document control section
   */
  private buildDocumentControl(templateData: TemplateData): Paragraph[] {
    return [
      this.buildHeading('Document Control', HeadingLevel.HEADING_1),
      this.buildTable([
        ['Version', templateData.metadata.version],
        ['Date', templateData.metadata.generatedAt.toISOString().split('T')[0]],
        ['Document Type', templateData.metadata.documentType],
        ['Classification', 'Internal'],
      ]),
      this.buildEmptyParagraph(),
    ];
  }

  /**
   * Build CTO document content
   */
  private buildCTOContent(templateData: TemplateData): Paragraph[] {
    const sections: Paragraph[] = [];
    const content = templateData.content;

    // Executive Summary
    if (content.executive_summary) {
      sections.push(this.buildHeading('Executive Summary', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.executive_summary));
    }

    // Technical Overview
    if (content.technical_overview || content.architecture) {
      sections.push(this.buildHeading('Technical Overview', HeadingLevel.HEADING_1));
      sections.push(
        ...this.buildContentSection(content.technical_overview ?? content.architecture),
      );
    }

    // Infrastructure
    if (content.infrastructure) {
      sections.push(this.buildHeading('Infrastructure', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.infrastructure));
    }

    // Security
    if (content.security) {
      sections.push(this.buildHeading('Security', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.security));
    }

    return sections;
  }

  /**
   * Build CFO document content (Business Plan)
   */
  private buildCFOContent(templateData: TemplateData): Paragraph[] {
    const sections: Paragraph[] = [];
    const content = templateData.content;

    // Executive Summary
    if (content.executive_summary) {
      sections.push(this.buildHeading('Executive Summary', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.executive_summary));
    }

    // Company Description
    if (content.company_description) {
      sections.push(this.buildHeading('Company Description', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.company_description));
    }

    // Market Analysis
    if (content.market_analysis) {
      sections.push(this.buildHeading('Market Analysis', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.market_analysis));
    }

    // Financial Projections
    if (content.financial_projections) {
      sections.push(this.buildHeading('Financial Projections', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.financial_projections));
    }

    // Risk Management
    if (content.risk_management) {
      sections.push(this.buildHeading('Risk Management', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.risk_management));
    }

    return sections;
  }

  /**
   * Build BA document content
   */
  private buildBAContent(templateData: TemplateData): Paragraph[] {
    const sections: Paragraph[] = [];
    const content = templateData.content;

    // Introduction/Overview
    if (content.introduction || content.overview) {
      sections.push(this.buildHeading('Introduction', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.introduction ?? content.overview));
    }

    // Business Requirements
    if (content.business_requirements) {
      sections.push(this.buildHeading('Business Requirements', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.business_requirements));
    }

    // Functional Requirements
    if (content.functional_requirements) {
      sections.push(this.buildHeading('Functional Requirements', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.functional_requirements));
    }

    // User Stories
    if (content.user_stories) {
      sections.push(this.buildHeading('User Stories', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.user_stories));
    }

    // Process Flows
    if (content.process_flows) {
      sections.push(this.buildHeading('Process Flows', HeadingLevel.HEADING_1));
      sections.push(...this.buildContentSection(content.process_flows));
    }

    return sections;
  }

  /**
   * Build standards section for CTO documents
   */
  private buildStandardsSection(standards: StandardSection[]): Paragraph[] {
    const sections: Paragraph[] = [];

    sections.push(this.buildHeading('Engineering Standards', HeadingLevel.HEADING_1));

    for (const standard of standards) {
      sections.push(this.buildHeading(standard.title, HeadingLevel.HEADING_2));
      sections.push(this.buildParagraph(standard.description));

      for (const principle of standard.principles) {
        sections.push(this.buildHeading(principle.title, HeadingLevel.HEADING_3));
        sections.push(this.buildParagraph(principle.description));
      }
    }

    return sections;
  }

  /**
   * Build content section from nested object
   */
  private buildContentSection(content: unknown): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    if (typeof content === 'string') {
      paragraphs.push(this.buildParagraph(content));
    } else if (Array.isArray(content)) {
      for (const item of content) {
        paragraphs.push(this.buildBulletPoint(String(item)));
      }
    } else if (typeof content === 'object' && content !== null) {
      for (const [key, value] of Object.entries(content)) {
        const label = this.formatLabel(key);
        if (typeof value === 'string' || typeof value === 'number') {
          paragraphs.push(this.buildLabeledParagraph(label, String(value)));
        } else if (Array.isArray(value)) {
          paragraphs.push(this.buildHeading(label, HeadingLevel.HEADING_3));
          for (const item of value) {
            paragraphs.push(this.buildBulletPoint(String(item)));
          }
        } else if (typeof value === 'object' && value !== null) {
          paragraphs.push(this.buildHeading(label, HeadingLevel.HEADING_2));
          paragraphs.push(...this.buildContentSection(value));
        }
      }
    }

    return paragraphs;
  }

  /**
   * Build a heading paragraph
   */
  private buildHeading(
    text: string,
    level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
  ): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text, bold: true })],
      heading: level,
      spacing: { before: 240, after: 120 },
    });
  }

  /**
   * Build a regular paragraph
   */
  private buildParagraph(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text })],
      spacing: { after: 120 },
    });
  }

  /**
   * Build a labeled paragraph (bold label: value)
   */
  private buildLabeledParagraph(label: string, value: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
      spacing: { after: 120 },
    });
  }

  /**
   * Build a bullet point
   */
  private buildBulletPoint(text: string): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text })],
      bullet: { level: 0 },
      spacing: { after: 60 },
    });
  }

  /**
   * Build an empty paragraph for spacing
   */
  private buildEmptyParagraph(): Paragraph {
    return new Paragraph({ children: [], spacing: { after: 200 } });
  }

  /**
   * Build a simple two-column table
   */
  private buildTable(rows: string[][]): Paragraph {
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell, index) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: index === 0,
                        }),
                      ],
                    }),
                  ],
                  width: { size: index === 0 ? 30 : 70, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1 },
                    bottom: { style: BorderStyle.SINGLE, size: 1 },
                    left: { style: BorderStyle.SINGLE, size: 1 },
                    right: { style: BorderStyle.SINGLE, size: 1 },
                  },
                }),
            ),
          }),
      ),
    });

    // Return as paragraph containing table reference
    return new Paragraph({
      children: [],
      spacing: { after: 200 },
    });
  }

  /**
   * Build document header
   */
  private buildHeader(title: string): Header {
    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              size: 20,
              color: '666666',
            }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    });
  }

  /**
   * Build document footer with page numbers
   */
  private buildFooter(): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Page ',
              size: 20,
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              size: 20,
            }),
            new TextRun({
              text: ' of ',
              size: 20,
            }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });
  }

  /**
   * Get document styles
   */
  private getDocumentStyles() {
    return {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 24, // 12pt
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15 line spacing
            },
          },
        },
      },
    };
  }

  /**
   * Format a key to a human-readable label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
