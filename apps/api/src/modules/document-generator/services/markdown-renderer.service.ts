/**
 * Markdown Renderer Service
 * Converts AI-generated content to properly formatted Markdown documents
 */

import { Injectable } from '@nestjs/common';

export interface DocumentSection {
  title: string;
  content: string;
  level: 1 | 2 | 3 | 4;
  subsections?: DocumentSection[];
}

export interface MarkdownDocument {
  title: string;
  subtitle?: string;
  metadata?: Record<string, string>;
  sections: DocumentSection[];
  footer?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

@Injectable()
export class MarkdownRendererService {
  /**
   * Render a full document to Markdown
   */
  renderDocument(doc: MarkdownDocument): string {
    const parts: string[] = [];

    // Title
    parts.push(`# ${doc.title}\n`);

    // Subtitle
    if (doc.subtitle) {
      parts.push(`*${doc.subtitle}*\n`);
    }

    // Metadata
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      parts.push('---');
      for (const [key, value] of Object.entries(doc.metadata)) {
        parts.push(`**${key}:** ${value}`);
      }
      parts.push('---\n');
    }

    // Table of contents
    const toc = this.generateToc(doc.sections);
    if (toc) {
      parts.push('## Table of Contents\n');
      parts.push(toc);
      parts.push('\n---\n');
    }

    // Sections
    for (const section of doc.sections) {
      parts.push(this.renderSection(section));
    }

    // Footer
    if (doc.footer) {
      parts.push('\n---\n');
      parts.push(`*${doc.footer}*`);
    }

    return parts.join('\n');
  }

  /**
   * Render a section with subsections
   */
  renderSection(section: DocumentSection): string {
    const parts: string[] = [];
    const heading = '#'.repeat(section.level);

    parts.push(`${heading} ${section.title}\n`);
    parts.push(this.formatContent(section.content));

    if (section.subsections) {
      for (const subsection of section.subsections) {
        parts.push(this.renderSection(subsection));
      }
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Generate table of contents
   */
  generateToc(sections: DocumentSection[], depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);

    for (const section of sections) {
      const slug = this.slugify(section.title);
      lines.push(`${indent}- [${section.title}](#${slug})`);

      if (section.subsections && section.subsections.length > 0) {
        lines.push(this.generateToc(section.subsections, depth + 1));
      }
    }

    return lines.join('\n');
  }

  /**
   * Render a data table
   */
  renderTable(data: TableData): string {
    const parts: string[] = [];

    if (data.caption) {
      parts.push(`**${data.caption}**\n`);
    }

    // Header
    parts.push(`| ${data.headers.join(' | ')} |`);
    parts.push(`| ${data.headers.map(() => '---').join(' | ')} |`);

    // Rows
    for (const row of data.rows) {
      parts.push(`| ${row.join(' | ')} |`);
    }

    return parts.join('\n') + '\n';
  }

  /**
   * Render a bullet list
   */
  renderList(items: string[], ordered = false): string {
    return items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join('\n') + '\n';
  }

  /**
   * Render a code block
   */
  renderCodeBlock(code: string, language = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\`\n`;
  }

  /**
   * Render a blockquote
   */
  renderBlockquote(text: string): string {
    return (
      text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n') + '\n'
    );
  }

  /**
   * Render a callout/admonition
   */
  renderCallout(type: 'info' | 'warning' | 'success' | 'error', content: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌',
    };
    return `> ${icons[type]} **${type.charAt(0).toUpperCase() + type.slice(1)}**\n> \n> ${content}\n`;
  }

  /**
   * Format raw content with proper markdown
   */
  formatContent(content: string): string {
    let formatted = content;

    // Ensure proper paragraph spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Fix bullet lists that might be malformed
    formatted = formatted.replace(/^[•●]\s*/gm, '- ');

    // Ensure headers have proper spacing
    formatted = formatted.replace(/^(#{1,6})\s*(.+)$/gm, '\n$1 $2\n');

    // Fix bold/italic formatting
    formatted = formatted.replace(/\*{3,}/g, '**');

    return formatted.trim() + '\n';
  }

  /**
   * Convert title to URL slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Parse raw AI output into structured sections
   */
  parseAiOutput(rawContent: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = rawContent.split('\n');
    let currentSection: DocumentSection | null = null;
    let contentBuffer: string[] = [];

    for (const line of lines) {
      // Check for headers
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentBuffer.join('\n').trim();
          sections.push(currentSection);
        }

        const level = headerMatch[1].length as 1 | 2 | 3 | 4;
        currentSection = {
          title: headerMatch[2].trim(),
          content: '',
          level,
        };
        contentBuffer = [];
      } else if (currentSection) {
        contentBuffer.push(line);
      }
    }

    // Don't forget the last section
    if (currentSection) {
      currentSection.content = contentBuffer.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Convert document to HTML for preview
   */
  toHtml(markdown: string): string {
    // Basic markdown to HTML conversion for preview
    let html = markdown;

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs
    html = html.replace(/^(?!<[hulo]|>|\|)(.+)$/gm, '<p>$1</p>');

    // Line breaks
    html = html.replace(/\n\n/g, '\n');

    return html;
  }
}
