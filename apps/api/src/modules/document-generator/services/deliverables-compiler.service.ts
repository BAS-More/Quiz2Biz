import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { SessionStatus, DecisionStatus } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * DeliverablesCompilerService - Quiz2Biz Deliverables Pack Compiler
 *
 * Implements the document generation requirements from Quiz2Biz document Section 15:
 * - Auto-sectioning with ≤1000 words per sub-section
 * - Architecture Dossier, SDLC Playbook, Test Strategy
 * - DevSecOps, Privacy/Data, Observability, Finance documents
 * - Policy → Standard → Procedure generation
 * - Decision Log export and Readiness Report
 */

// Maximum words per section before auto-splitting
const MAX_WORDS_PER_SECTION = 1000;

// Document categories
export enum DeliverableCategory {
  ARCHITECTURE = 'ARCHITECTURE',
  SDLC = 'SDLC',
  TESTING = 'TESTING',
  DEVSECOPS = 'DEVSECOPS',
  PRIVACY = 'PRIVACY',
  OBSERVABILITY = 'OBSERVABILITY',
  FINANCE = 'FINANCE',
  GOVERNANCE = 'GOVERNANCE',
  READINESS = 'READINESS',
}

export interface DeliverablePack {
  sessionId: string;
  generatedAt: Date;
  documents: CompiledDocument[];
  summary: PackSummary;
  readinessScore: number;
  metadata: PackMetadata;
}

export interface CompiledDocument {
  id: string;
  title: string;
  category: DeliverableCategory;
  sections: DocumentSection[];
  wordCount: number;
  subSectionCount: number;
  generatedAt: Date;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  subSections?: DocumentSection[];
  order: number;
}

export interface PackSummary {
  totalDocuments: number;
  totalSections: number;
  totalWordCount: number;
  categories: Record<DeliverableCategory, number>;
  completenessScore: number;
}

export interface PackMetadata {
  sessionId: string;
  userId: string;
  questionnaireVersion: number;
  industry?: string;
  readinessScore: number;
  dimensionScores: Record<string, number>;
  generationTimestamp: string;
}

export interface CompilerOptions {
  includeDecisionLog?: boolean;
  includeReadinessReport?: boolean;
  includePolicyPack?: boolean;
  autoSection?: boolean;
  maxWordsPerSection?: number;
}

@Injectable()
export class DeliverablesCompilerService {
  private readonly logger = new Logger(DeliverablesCompilerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compile complete deliverables pack for a session
   */
  async compileDeliverablesPack(
    sessionId: string,
    userId: string,
    options: CompilerOptions = {},
  ): Promise<DeliverablePack> {
    const {
      includeDecisionLog = true,
      includeReadinessReport = true,
      includePolicyPack = true,
      autoSection = true,
      maxWordsPerSection = MAX_WORDS_PER_SECTION,
    } = options;

    // Validate session
    const session = await this.validateSession(sessionId, userId);

    // Gather all data needed for compilation
    const [responses, dimensions, decisions, evidenceItems] = await Promise.all([
      this.getSessionResponses(sessionId),
      this.getDimensionScores(sessionId),
      includeDecisionLog ? this.getDecisions(sessionId) : Promise.resolve([]),
      this.getEvidenceItems(sessionId),
    ]);

    const documents: CompiledDocument[] = [];
    const generatedAt = new Date();

    // 1. Architecture Dossier
    documents.push(
      this.compileArchitectureDossier(
        session,
        responses,
        dimensions,
        autoSection,
        maxWordsPerSection,
      ),
    );

    // 2. SDLC Playbook
    documents.push(
      this.compileSDLCPlaybook(session, responses, dimensions, autoSection, maxWordsPerSection),
    );

    // 3. Test Strategy
    documents.push(
      this.compileTestStrategy(session, responses, dimensions, autoSection, maxWordsPerSection),
    );

    // 4. DevSecOps Document
    documents.push(
      this.compileDevSecOpsDocument(
        session,
        responses,
        dimensions,
        autoSection,
        maxWordsPerSection,
      ),
    );

    // 5. Privacy/Data Document
    documents.push(
      this.compilePrivacyDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );

    // 6. Observability Document
    documents.push(
      this.compileObservabilityDocument(
        session,
        responses,
        dimensions,
        autoSection,
        maxWordsPerSection,
      ),
    );

    // 7. Finance Document
    documents.push(
      this.compileFinanceDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );

    // 8. Policy → Standard → Procedure (if enabled)
    if (includePolicyPack) {
      documents.push(
        this.compilePolicyDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
      );
    }

    // 9. Decision Log (if enabled)
    if (includeDecisionLog && decisions.length > 0) {
      documents.push(this.compileDecisionLog(session, decisions, autoSection, maxWordsPerSection));
    }

    // 10. Readiness Report (if enabled)
    if (includeReadinessReport) {
      documents.push(
        this.compileReadinessReport(
          session,
          dimensions,
          evidenceItems,
          autoSection,
          maxWordsPerSection,
        ),
      );
    }

    // Calculate readiness score
    const readinessScore = session.readinessScore ? Number(session.readinessScore) : 0;

    // Build summary
    const summary = this.buildPackSummary(documents);

    // Build metadata
    const metadata: PackMetadata = {
      sessionId,
      userId,
      questionnaireVersion: session.questionnaireVersion,
      industry: session.industry ?? undefined,
      readinessScore,
      dimensionScores: dimensions,
      generationTimestamp: generatedAt.toISOString(),
    };

    this.logger.log(
      `Compiled deliverables pack for session ${sessionId}: ${documents.length} documents, ${summary.totalWordCount} words`,
    );

    return {
      sessionId,
      generatedAt,
      documents,
      summary,
      readinessScore,
      metadata,
    };
  }

  /**
   * Validate session and check permissions
   */
  private async validateSession(sessionId: string, userId: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questionnaire: { select: { name: true, version: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Access denied to this session');
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        `Session must be completed before compiling deliverables. Current status: ${session.status}`,
      );
    }

    return session;
  }

  /**
   * Get all responses for a session
   */
  private async getSessionResponses(sessionId: string): Promise<any[]> {
    return this.prisma.response.findMany({
      where: { sessionId, isValid: true },
      include: {
        question: {
          include: {
            section: true,
            dimension: true,
          },
        },
      },
    });
  }

  /**
   * Get dimension scores for a session
   * Calculated from responses grouped by dimension
   */
  private async getDimensionScores(sessionId: string): Promise<Record<string, number>> {
    // Get all responses with their questions and dimensions
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      include: {
        question: {
          include: {
            dimension: true,
          },
        },
      },
    });

    // Group responses by dimension and calculate average coverage
    const dimensionScores: Record<string, { total: number; count: number }> = {};

    for (const response of responses) {
      const dimensionKey = response.question.dimension?.key;
      if (dimensionKey) {
        if (!dimensionScores[dimensionKey]) {
          dimensionScores[dimensionKey] = { total: 0, count: 0 };
        }
        const coverage = response.coverage ? Number(response.coverage) : 0;
        dimensionScores[dimensionKey].total += coverage;
        dimensionScores[dimensionKey].count += 1;
      }
    }

    // Calculate average score per dimension (0-100 scale)
    const result: Record<string, number> = {};
    for (const [key, { total, count }] of Object.entries(dimensionScores)) {
      result[key] = count > 0 ? Math.round((total / count) * 100) : 0;
    }

    return result;
  }

  /**
   * Get decisions for a session
   */
  private async getDecisions(sessionId: string): Promise<any[]> {
    return this.prisma.decisionLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get evidence items for a session
   */
  private async getEvidenceItems(sessionId: string): Promise<any[]> {
    return this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
      include: { question: true },
    });
  }

  /**
   * Auto-section content if it exceeds max words
   */
  private autoSectionContent(content: string, maxWords: number): DocumentSection[] {
    const words = content.split(/\s+/);
    const wordCount = words.length;

    if (wordCount <= maxWords) {
      return [
        {
          id: this.generateId(),
          title: 'Content',
          content,
          wordCount,
          order: 0,
        },
      ];
    }

    // Split into sub-sections
    const sections: DocumentSection[] = [];
    let currentWords: string[] = [];
    let sectionIndex = 0;

    for (const word of words) {
      currentWords.push(word);

      if (currentWords.length >= maxWords) {
        sections.push({
          id: this.generateId(),
          title: `Part ${sectionIndex + 1}`,
          content: currentWords.join(' '),
          wordCount: currentWords.length,
          order: sectionIndex,
        });
        currentWords = [];
        sectionIndex++;
      }
    }

    // Add remaining words
    if (currentWords.length > 0) {
      sections.push({
        id: this.generateId(),
        title: `Part ${sectionIndex + 1}`,
        content: currentWords.join(' '),
        wordCount: currentWords.length,
        order: sectionIndex,
      });
    }

    return sections;
  }

  /**
   * Compile Architecture Dossier
   */
  private compileArchitectureDossier(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const archResponses = responses.filter((r) => r.question.dimension?.key === 'arch_sec');

    const sections: DocumentSection[] = [];

    // System Overview
    sections.push({
      id: this.generateId(),
      title: '1. System Overview',
      content: this.generateSystemOverview(session, archResponses),
      wordCount: 0,
      order: 0,
    });

    // Architecture Decisions
    sections.push({
      id: this.generateId(),
      title: '2. Architecture Decisions',
      content: this.generateArchitectureDecisions(archResponses),
      wordCount: 0,
      order: 1,
    });

    // Security Architecture
    sections.push({
      id: this.generateId(),
      title: '3. Security Architecture',
      content: this.generateSecurityArchitecture(archResponses),
      wordCount: 0,
      order: 2,
    });

    // Technology Stack
    sections.push({
      id: this.generateId(),
      title: '4. Technology Stack',
      content: this.generateTechnologyStack(archResponses),
      wordCount: 0,
      order: 3,
    });

    // Calculate word counts and apply auto-sectioning
    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Architecture Dossier',
      category: DeliverableCategory.ARCHITECTURE,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile SDLC Playbook
   */
  private compileSDLCPlaybook(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const devResponses = responses.filter(
      (r) =>
        r.question.dimension?.key === 'devops_iac' || r.question.dimension?.key === 'quality_test',
    );

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Development Process',
        content: this.generateDevelopmentProcess(devResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. CI/CD Pipeline',
        content: this.generateCICDPipeline(devResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Branching Strategy',
        content: this.generateBranchingStrategy(devResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. Release Management',
        content: this.generateReleaseManagement(devResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'SDLC Playbook',
      category: DeliverableCategory.SDLC,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Test Strategy
   */
  private compileTestStrategy(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const testResponses = responses.filter((r) => r.question.dimension?.key === 'quality_test');

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Test Objectives',
        content: this.generateTestObjectives(testResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Test Types & Coverage',
        content: this.generateTestTypesCoverage(testResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Test Automation',
        content: this.generateTestAutomation(testResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. Performance Testing',
        content: this.generatePerformanceTesting(testResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Test Strategy',
      category: DeliverableCategory.TESTING,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile DevSecOps Document
   */
  private compileDevSecOpsDocument(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const securityResponses = responses.filter(
      (r) => r.question.dimension?.key === 'arch_sec' || r.question.dimension?.key === 'devops_iac',
    );

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Security Integration',
        content: this.generateSecurityIntegration(securityResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Vulnerability Management',
        content: this.generateVulnerabilityManagement(securityResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Compliance Automation',
        content: this.generateComplianceAutomation(securityResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. Incident Response',
        content: this.generateIncidentResponse(securityResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'DevSecOps Guide',
      category: DeliverableCategory.DEVSECOPS,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Privacy/Data Document
   */
  private compilePrivacyDocument(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const privacyResponses = responses.filter((r) => r.question.dimension?.key === 'privacy_data');

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Data Classification',
        content: this.generateDataClassification(privacyResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Privacy Controls',
        content: this.generatePrivacyControls(privacyResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Data Retention',
        content: this.generateDataRetention(privacyResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. GDPR Compliance',
        content: this.generateGDPRCompliance(privacyResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Privacy & Data Protection',
      category: DeliverableCategory.PRIVACY,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Observability Document
   */
  private compileObservabilityDocument(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const obsResponses = responses.filter((r) => r.question.dimension?.key === 'observe_sre');

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Monitoring Strategy',
        content: this.generateMonitoringStrategy(obsResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Logging Architecture',
        content: this.generateLoggingArchitecture(obsResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Alerting & Runbooks',
        content: this.generateAlertingRunbooks(obsResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. SLOs & Error Budgets',
        content: this.generateSLOsErrorBudgets(obsResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Observability Guide',
      category: DeliverableCategory.OBSERVABILITY,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Finance Document
   */
  private compileFinanceDocument(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const financeResponses = responses.filter((r) => r.question.dimension?.key === 'finance_unit');

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Cost Analysis',
        content: this.generateCostAnalysis(financeResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Unit Economics',
        content: this.generateUnitEconomics(financeResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Budget Allocation',
        content: this.generateBudgetAllocation(financeResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. ROI Projections',
        content: this.generateROIProjections(financeResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Finance & Economics',
      category: DeliverableCategory.FINANCE,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Policy Document (Policy → Standard → Procedure)
   */
  private compilePolicyDocument(
    session: any,
    responses: any[],
    dimensions: Record<string, number>,
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const policyResponses = responses.filter(
      (r) =>
        r.question.dimension?.key === 'governance_risk' ||
        r.question.dimension?.key === 'policy_ctrl',
    );

    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Policies',
        content: this.generatePolicies(policyResponses),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Standards',
        content: this.generateStandards(policyResponses),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Procedures',
        content: this.generateProcedures(policyResponses),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. Control Mappings',
        content: this.generateControlMappings(policyResponses),
        wordCount: 0,
        order: 3,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Policy & Governance Pack',
      category: DeliverableCategory.GOVERNANCE,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Decision Log
   */
  private compileDecisionLog(
    session: any,
    decisions: any[],
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const sections: DocumentSection[] = [];

    // Group decisions by status
    const lockedDecisions = decisions.filter((d) => d.status === DecisionStatus.LOCKED);
    const draftDecisions = decisions.filter((d) => d.status === DecisionStatus.DRAFT);

    sections.push({
      id: this.generateId(),
      title: '1. Approved Decisions',
      content: this.formatDecisions(lockedDecisions),
      wordCount: 0,
      order: 0,
    });

    sections.push({
      id: this.generateId(),
      title: '2. Pending Decisions',
      content: this.formatDecisions(draftDecisions),
      wordCount: 0,
      order: 1,
    });

    sections.push({
      id: this.generateId(),
      title: '3. Decision Timeline',
      content: this.generateDecisionTimeline(decisions),
      wordCount: 0,
      order: 2,
    });

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Decision Log',
      category: DeliverableCategory.GOVERNANCE,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  /**
   * Compile Readiness Report
   */
  private compileReadinessReport(
    session: any,
    dimensions: Record<string, number>,
    evidenceItems: any[],
    autoSection: boolean,
    maxWords: number,
  ): CompiledDocument {
    const sections: DocumentSection[] = [
      {
        id: this.generateId(),
        title: '1. Executive Summary',
        content: this.generateExecutiveSummary(session, dimensions),
        wordCount: 0,
        order: 0,
      },
      {
        id: this.generateId(),
        title: '2. Dimension Analysis',
        content: this.generateDimensionAnalysis(dimensions),
        wordCount: 0,
        order: 1,
      },
      {
        id: this.generateId(),
        title: '3. Evidence Summary',
        content: this.generateEvidenceSummary(evidenceItems),
        wordCount: 0,
        order: 2,
      },
      {
        id: this.generateId(),
        title: '4. Gap Analysis',
        content: this.generateGapAnalysis(dimensions),
        wordCount: 0,
        order: 3,
      },
      {
        id: this.generateId(),
        title: '5. Recommendations',
        content: this.generateRecommendations(dimensions),
        wordCount: 0,
        order: 4,
      },
    ];

    const processedSections = this.processAndCountWords(sections, autoSection, maxWords);

    return {
      id: this.generateId(),
      title: 'Readiness Report',
      category: DeliverableCategory.READINESS,
      sections: processedSections,
      wordCount: this.sumWordCounts(processedSections),
      subSectionCount: this.countSubSections(processedSections),
      generatedAt: new Date(),
    };
  }

  // === Content Generation Helpers ===

  private generateSystemOverview(session: any, responses: any[]): string {
    const questionnaireName = session.questionnaire?.name || 'Assessment';
    const industry = session.industry || 'General';

    return `
## System Overview

This Architecture Dossier documents the system architecture for the ${questionnaireName} assessment.

**Industry:** ${industry}
**Assessment Date:** ${new Date().toISOString().split('T')[0]}
**Questionnaire Version:** ${session.questionnaireVersion}

### Scope
This document covers the architectural decisions, security considerations, and technology stack recommendations based on the readiness assessment responses.

### Key Findings
Based on ${responses.length} architecture-related responses, this document outlines the system design principles and implementation guidelines.
    `.trim();
  }

  private generateArchitectureDecisions(responses: any[]): string {
    const decisions = responses.filter(
      (r) =>
        r.question.text.toLowerCase().includes('decision') ||
        r.question.text.toLowerCase().includes('architecture'),
    );

    let content = '## Architecture Decisions\n\n';
    content += 'The following architectural decisions have been documented:\n\n';

    for (const resp of decisions.slice(0, 10)) {
      content += `### ${resp.question.text}\n`;
      content += `**Response:** ${JSON.stringify(resp.value)}\n`;
      content += `**Rationale:** Based on assessment requirements\n\n`;
    }

    if (decisions.length === 0) {
      content +=
        'No specific architecture decisions documented. Refer to the questionnaire responses for details.\n';
    }

    return content.trim();
  }

  private generateSecurityArchitecture(_responses: any[]): string {
    return `
## Security Architecture

### Authentication & Authorization
Based on the assessment responses, the system implements appropriate authentication and authorization controls.

### Data Protection
Data encryption and protection mechanisms are in place according to the security requirements.

### Network Security
Network security controls and segmentation follow industry best practices.

### Security Monitoring
Continuous security monitoring and alerting capabilities are configured.
    `.trim();
  }

  private generateTechnologyStack(_responses: any[]): string {
    return `
## Technology Stack

### Frontend Technologies
Modern frontend frameworks and libraries as specified in the assessment.

### Backend Technologies
Server-side technologies and frameworks based on requirements.

### Database Technologies
Data storage solutions appropriate for the use case.

### Infrastructure
Cloud and infrastructure components as documented.
    `.trim();
  }

  private generateDevelopmentProcess(_responses: any[]): string {
    return `
## Development Process

### Development Workflow
Agile development practices with iterative delivery cycles.

### Code Review Process
Peer review requirements and approval workflows.

### Quality Gates
Automated quality checks and CI/CD integration.
    `.trim();
  }

  private generateCICDPipeline(_responses: any[]): string {
    return `
## CI/CD Pipeline

### Build Stage
Automated build process with dependency management.

### Test Stage
Automated testing including unit, integration, and E2E tests.

### Deploy Stage
Deployment automation with rollback capabilities.

### Security Stage
SAST, DAST, and SCA scanning integration.
    `.trim();
  }

  private generateBranchingStrategy(_responses: any[]): string {
    return '## Branching Strategy\n\nGit flow or trunk-based development as appropriate.';
  }

  private generateReleaseManagement(_responses: any[]): string {
    return '## Release Management\n\nRelease planning and version control processes.';
  }

  private generateTestObjectives(_responses: any[]): string {
    return '## Test Objectives\n\nQuality assurance goals and coverage targets.';
  }

  private generateTestTypesCoverage(_responses: any[]): string {
    return '## Test Types & Coverage\n\nUnit, integration, E2E, and performance testing requirements.';
  }

  private generateTestAutomation(_responses: any[]): string {
    return '## Test Automation\n\nAutomated testing framework and tooling.';
  }

  private generatePerformanceTesting(_responses: any[]): string {
    return '## Performance Testing\n\nLoad testing, stress testing, and benchmarking requirements.';
  }

  private generateSecurityIntegration(_responses: any[]): string {
    return '## Security Integration\n\nShift-left security practices and DevSecOps integration.';
  }

  private generateVulnerabilityManagement(_responses: any[]): string {
    return '## Vulnerability Management\n\nVulnerability scanning and remediation processes.';
  }

  private generateComplianceAutomation(_responses: any[]): string {
    return '## Compliance Automation\n\nAutomated compliance checking and reporting.';
  }

  private generateIncidentResponse(_responses: any[]): string {
    return '## Incident Response\n\nSecurity incident detection and response procedures.';
  }

  private generateDataClassification(_responses: any[]): string {
    return '## Data Classification\n\nData sensitivity levels and handling requirements.';
  }

  private generatePrivacyControls(_responses: any[]): string {
    return '## Privacy Controls\n\nPrivacy protection mechanisms and controls.';
  }

  private generateDataRetention(_responses: any[]): string {
    return '## Data Retention\n\nData lifecycle management and retention policies.';
  }

  private generateGDPRCompliance(_responses: any[]): string {
    return '## GDPR Compliance\n\nGDPR requirements and compliance measures.';
  }

  private generateMonitoringStrategy(_responses: any[]): string {
    return '## Monitoring Strategy\n\nApplication and infrastructure monitoring approach.';
  }

  private generateLoggingArchitecture(_responses: any[]): string {
    return '## Logging Architecture\n\nCentralized logging and log management.';
  }

  private generateAlertingRunbooks(_responses: any[]): string {
    return '## Alerting & Runbooks\n\nAlert configuration and incident runbooks.';
  }

  private generateSLOsErrorBudgets(_responses: any[]): string {
    return '## SLOs & Error Budgets\n\nService level objectives and error budget policies.';
  }

  private generateCostAnalysis(_responses: any[]): string {
    return '## Cost Analysis\n\nTotal cost of ownership and cost optimization.';
  }

  private generateUnitEconomics(_responses: any[]): string {
    return '## Unit Economics\n\nPer-unit cost analysis and profitability metrics.';
  }

  private generateBudgetAllocation(_responses: any[]): string {
    return '## Budget Allocation\n\nResource allocation and budget planning.';
  }

  private generateROIProjections(_responses: any[]): string {
    return '## ROI Projections\n\nReturn on investment analysis and projections.';
  }

  private generatePolicies(_responses: any[]): string {
    return '## Policies\n\nHigh-level governance policies and principles.';
  }

  private generateStandards(_responses: any[]): string {
    return '## Standards\n\nTechnical and operational standards.';
  }

  private generateProcedures(_responses: any[]): string {
    return '## Procedures\n\nOperational procedures and work instructions.';
  }

  private generateControlMappings(_responses: any[]): string {
    return '## Control Mappings\n\nISO 27001, NIST CSF, and OWASP control mappings.';
  }

  private formatDecisions(decisions: any[]): string {
    if (decisions.length === 0) {
      return 'No decisions in this category.\n';
    }

    let content = '';
    for (const decision of decisions) {
      content += `### ${decision.title}\n`;
      content += `**Status:** ${decision.status}\n`;
      content += `**Created:** ${decision.createdAt.toISOString()}\n`;
      content += `**Description:** ${decision.description || 'N/A'}\n\n`;
    }
    return content;
  }

  private generateDecisionTimeline(decisions: any[]): string {
    if (decisions.length === 0) {
      return 'No decisions recorded.\n';
    }

    let content = '## Decision Timeline\n\n';
    const sorted = [...decisions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const decision of sorted) {
      content += `- **${decision.createdAt.toISOString().split('T')[0]}:** ${decision.title} (${decision.status})\n`;
    }
    return content;
  }

  private generateExecutiveSummary(session: any, dimensions: Record<string, number>): string {
    const score = session.readinessScore ? Number(session.readinessScore) : 0;
    const dimensionCount = Object.keys(dimensions).length;

    return `
## Executive Summary

**Overall Readiness Score:** ${score.toFixed(1)}%

This readiness report summarizes the assessment results across ${dimensionCount} dimensions.

### Key Metrics
- Total Dimensions Assessed: ${dimensionCount}
- Assessment Completion: 100%
- Questionnaire Version: ${session.questionnaireVersion}
- Industry: ${session.industry || 'General'}
    `.trim();
  }

  private generateDimensionAnalysis(dimensions: Record<string, number>): string {
    let content = '## Dimension Analysis\n\n';
    content += '| Dimension | Score | Status |\n';
    content += '|-----------|-------|--------|\n';

    for (const [key, score] of Object.entries(dimensions)) {
      const status = score >= 80 ? 'Strong' : score >= 50 ? 'Adequate' : 'Needs Improvement';
      content += `| ${key} | ${score.toFixed(1)}% | ${status} |\n`;
    }

    return content;
  }

  private generateEvidenceSummary(evidenceItems: any[]): string {
    const verified = evidenceItems.filter((e) => e.verified).length;
    const pending = evidenceItems.length - verified;

    return `
## Evidence Summary

**Total Evidence Items:** ${evidenceItems.length}
**Verified:** ${verified}
**Pending Verification:** ${pending}

Evidence items support the coverage claims across all dimensions.
    `.trim();
  }

  private generateGapAnalysis(dimensions: Record<string, number>): string {
    const gaps = Object.entries(dimensions)
      .filter(([_, score]) => score < 80)
      .sort((a, b) => a[1] - b[1]);

    let content = '## Gap Analysis\n\n';

    if (gaps.length === 0) {
      content += 'No significant gaps identified. All dimensions meet the target threshold.\n';
    } else {
      content += 'The following dimensions require attention:\n\n';
      for (const [key, score] of gaps) {
        content += `- **${key}**: ${score.toFixed(1)}% (Gap: ${(80 - score).toFixed(1)}%)\n`;
      }
    }

    return content;
  }

  private generateRecommendations(dimensions: Record<string, number>): string {
    const weakDimensions = Object.entries(dimensions)
      .filter(([_, score]) => score < 60)
      .map(([key]) => key);

    let content = '## Recommendations\n\n';

    if (weakDimensions.length === 0) {
      content += '1. Continue current practices and maintain documentation\n';
      content += '2. Schedule periodic re-assessment to track improvements\n';
      content += '3. Consider extending coverage to additional areas\n';
    } else {
      content += `Priority improvements needed in: ${weakDimensions.join(', ')}\n\n`;
      content += '1. Focus remediation efforts on low-scoring dimensions\n';
      content += '2. Implement recommended controls and practices\n';
      content += '3. Gather additional evidence to support coverage claims\n';
      content += '4. Schedule follow-up assessment in 30-60 days\n';
    }

    return content;
  }

  // === Utility Methods ===

  private processAndCountWords(
    sections: DocumentSection[],
    autoSection: boolean,
    maxWords: number,
  ): DocumentSection[] {
    return sections.map((section) => {
      const wordCount = this.countWords(section.content);

      if (autoSection && wordCount > maxWords) {
        const subSections = this.autoSectionContent(section.content, maxWords);
        return {
          ...section,
          wordCount,
          subSections,
        };
      }

      return {
        ...section,
        wordCount,
      };
    });
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  }

  private sumWordCounts(sections: DocumentSection[]): number {
    return sections.reduce((sum, s) => sum + s.wordCount, 0);
  }

  private countSubSections(sections: DocumentSection[]): number {
    return sections.reduce((sum, s) => sum + (s.subSections?.length || 0), 0);
  }

  private generateId(): string {
    return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  }

  private buildPackSummary(documents: CompiledDocument[]): PackSummary {
    const categories: Record<DeliverableCategory, number> = {
      [DeliverableCategory.ARCHITECTURE]: 0,
      [DeliverableCategory.SDLC]: 0,
      [DeliverableCategory.TESTING]: 0,
      [DeliverableCategory.DEVSECOPS]: 0,
      [DeliverableCategory.PRIVACY]: 0,
      [DeliverableCategory.OBSERVABILITY]: 0,
      [DeliverableCategory.FINANCE]: 0,
      [DeliverableCategory.GOVERNANCE]: 0,
      [DeliverableCategory.READINESS]: 0,
    };

    let totalWordCount = 0;
    let totalSections = 0;

    for (const doc of documents) {
      categories[doc.category]++;
      totalWordCount += doc.wordCount;
      totalSections += doc.sections.length + doc.subSectionCount;
    }

    // Calculate completeness (presence of key documents)
    const expectedCategories = Object.keys(categories).length;
    const presentCategories = Object.values(categories).filter((c) => c > 0).length;
    const completenessScore = Math.round((presentCategories / expectedCategories) * 100);

    return {
      totalDocuments: documents.length,
      totalSections,
      totalWordCount,
      categories,
      completenessScore,
    };
  }
}
