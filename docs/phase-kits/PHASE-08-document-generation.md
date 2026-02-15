# Phase 8: Document Generation

> **Objective:** Generate professionally benchmarked documents from chat conversation, calibrated to quality slider and output format.
> **Branch:** `phase-8/document-generation`
> **Dependencies:** Phase 7 complete (commerce flow works, payment triggers generation)
> **Acceptance:** Documents generate in all 3 formats. Quality slider produces measurably different output depth. Comparison works. Files downloadable.

---

## Pre-flight

```bash
git checkout main
git merge phase-7/document-commerce
git checkout -b phase-8/document-generation
npm install docx pdfkit  # document rendering libraries (check existing deps first)
```

---

## Task 8.1 — Create Document Generation Module

**Refactor or create alongside:** `apps/api/src/modules/document-generation/`

```
document-generation/
├── document-generation.module.ts
├── document-generation.controller.ts
├── document-generation.service.ts  (orchestrator)
├── services/
│   ├── generation-prompt.service.ts
│   └── quality-calibrator.service.ts
├── renderers/
│   ├── docx.renderer.ts
│   ├── pdf.renderer.ts
│   └── markdown.renderer.ts
├── prompts/
│   ├── business-plan.prompt.ts
│   ├── tech-architecture.prompt.ts
│   ├── marketing-strategy.prompt.ts
│   ├── financial-projections.prompt.ts
│   ├── investor-pitch.prompt.ts
│   ├── ai-dev-prompts.prompt.ts
│   └── custom.prompt.ts
└── document-generation.spec.ts
```

---

## Task 8.2 — Generation Prompt Builder

**File:** `services/generation-prompt.service.ts`

Constructs the AI prompt for document generation. Inputs:
- Extracted facts (confirmed and high-confidence)
- Chat history (full conversation)
- Document type (which template/structure)
- Quality level (calibrates depth)
- Benchmark criteria (for the relevant dimensions)

**Template structure:**
```
You are a professional document writer for Quiz2Biz.

TASK: Generate a {documentType} document.

QUALITY LEVEL: {qualityLabel} ({qualityPercentage}%)
{qualityInstructions}

CLIENT INFORMATION (extracted from conversation):
{facts formatted as key-value pairs}

CONVERSATION CONTEXT:
{chat history — last 20 messages or full if under 20}

DOCUMENT STRUCTURE:
{sections list from document type template}

BENCHMARK STANDARDS:
{relevant standards and criteria this document should address}

FORMATTING RULES:
- Use professional language
- Include section headings
- Use data and specifics from the client information
- Where information is missing, note "[To be determined]" — do not fabricate
- At Enterprise quality: include standard references, detailed analysis, appendices
- At Essential quality: concise coverage of core sections only

OUTPUT: Generate the complete document content in Markdown format.
Each section should be clearly headed.
```

---

## Task 8.3 — Quality Calibrator

**File:** `services/quality-calibrator.service.ts`

Maps slider position to generation parameters:

```typescript
interface QualityParams {
  label: string;
  maxSections: number;          // how many sections to include
  detailLevel: 'concise' | 'standard' | 'detailed' | 'comprehensive';
  includeStandardRefs: boolean; // reference ISO/industry standards
  includeAppendices: boolean;
  targetWordCount: { min: number; max: number };
  includeCharts: boolean;       // text descriptions of charts (actual charts V2)
  includeActionItems: boolean;
}

getParams(sliderPosition: number): QualityParams {
  if (sliderPosition < 0.25) {
    return {
      label: 'Essential',
      maxSections: 5,
      detailLevel: 'concise',
      includeStandardRefs: false,
      includeAppendices: false,
      targetWordCount: { min: 1500, max: 3000 },
      includeCharts: false,
      includeActionItems: false,
    };
  } else if (sliderPosition < 0.50) {
    return {
      label: 'Standard',
      maxSections: 8,
      detailLevel: 'standard',
      includeStandardRefs: false,
      includeAppendices: false,
      targetWordCount: { min: 3000, max: 6000 },
      includeCharts: false,
      includeActionItems: true,
    };
  } else if (sliderPosition < 0.75) {
    return {
      label: 'Professional',
      maxSections: 12,
      detailLevel: 'detailed',
      includeStandardRefs: true,
      includeAppendices: true,
      targetWordCount: { min: 6000, max: 12000 },
      includeCharts: true,
      includeActionItems: true,
    };
  } else {
    return {
      label: 'Enterprise',
      maxSections: 20,
      detailLevel: 'comprehensive',
      includeStandardRefs: true,
      includeAppendices: true,
      targetWordCount: { min: 12000, max: 25000 },
      includeCharts: true,
      includeActionItems: true,
    };
  }
}
```

---

## Task 8.4 — DOCX Renderer

**File:** `renderers/docx.renderer.ts`

Convert AI-generated Markdown content into a professionally formatted DOCX file.

Use the `docx` npm package. Parse the Markdown output:
- `# Heading` → Heading 1
- `## Heading` → Heading 2
- Paragraphs → styled body text
- Bullet lists → bullet paragraphs
- Bold/italic → inline formatting
- Tables → Table objects

Add professional formatting:
- Cover page with document title, company name, date, quality badge
- Table of contents (if Professional or Enterprise quality)
- Page numbers in footer
- Header with "CONFIDENTIAL — Prepared by Quiz2Biz"
- Consistent fonts (Arial or similar)

Upload to Azure Blob Storage. Return URL.

---

## Task 8.5 — PDF Renderer

**File:** `renderers/pdf.renderer.ts`

Convert Markdown to PDF. Options:
1. Use `pdfkit` for direct rendering
2. Or render DOCX first, then convert to PDF using a library like `libreoffice-convert`
3. Or use the Markdown → HTML → PDF pipeline with `puppeteer` or `playwright`

**Recommendation:** Markdown → HTML (marked) → PDF (puppeteer). Most reliable for complex formatting.

Same professional formatting as DOCX: cover page, TOC, headers, footers.

Upload to Azure Blob Storage. Return URL.

---

## Task 8.6 — Markdown Renderer

**File:** `renderers/markdown.renderer.ts`

Simplest renderer. The AI output is already Markdown. Add:
- Front matter with metadata (title, date, quality level, provider)
- Clean formatting
- Remove any AI artefacts or preamble

Upload to Azure Blob Storage. Return URL.

---

## Task 8.7 — Generation Orchestrator

**File:** `document-generation.service.ts`

Triggered by payment confirmation webhook:

```typescript
async generateDocument(documentId: string): Promise<void> {
  const doc = await this.prisma.generatedDocument.findUnique({
    where: { id: documentId },
    include: { project: { include: { facts: true, messages: true } }, documentType: true },
  });

  // Update status
  await this.prisma.generatedDocument.update({
    where: { id: documentId },
    data: { status: 'GENERATING' },
  });

  try {
    // 1. Build generation prompt
    const qualityParams = this.qualityCalibrator.getParams(doc.qualityLevel);
    const prompt = this.promptBuilder.build(doc.documentType, doc.project, qualityParams);

    // 2. Call AI Gateway (non-streaming — we need the full response)
    const response = await this.aiGateway.complete(doc.providerId, {
      taskType: 'generate',
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a professional document writer. Generate the complete document in Markdown format.',
      maxTokens: 8192,
      temperature: 0.3,  // lower temperature for documents
    }, doc.project.workspace.userId);

    // 3. Render to selected format
    const renderer = this.getRenderer(doc.format);
    const fileBuffer = await renderer.render(response.content, {
      title: doc.documentType.name,
      companyName: doc.project.facts.find(f => f.fieldName === 'company_name')?.fieldValue ?? doc.project.name,
      date: new Date(),
      qualityLabel: qualityParams.label,
      provider: doc.providerId,
    });

    // 4. Upload to Azure Blob Storage
    const fileUrl = await this.blobStorage.upload(
      `documents/${doc.projectId}/${doc.id}.${this.getExtension(doc.format)}`,
      fileBuffer,
    );

    // 5. Update record
    await this.prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        fileUrl,
        tokenCount: response.usage.totalTokens,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    await this.prisma.generatedDocument.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
```

---

## Task 8.8 — Comparison Generation

When user requests comparison:
1. Create two `GeneratedDocument` records with same `comparisonGroup` UUID
2. One with provider `claude`, one with `openai`
3. Generate both in parallel: `Promise.all([generate(doc1), generate(doc2)])`
4. Both appear in My Documents linked by comparisonGroup

---

## Task 8.9 — POST /projects/:id/documents/generate

**Endpoint:** `POST /api/projects/:projectId/documents/generate`

Called by payment webhook after successful payment. Also callable directly if payment already confirmed.

```typescript
{
  documentTypeId: string;
  qualityLevel: number;
  format: 'DOCX' | 'PDF' | 'MARKDOWN';
  provider: string;
  comparisonGroup?: string;  // if comparison mode
}
```

Returns: `{ documentId: string, status: 'QUEUED' }`

---

## Task 8.10 — My Documents Page

**File:** `apps/web/src/pages/documents/MyDocumentsPage.tsx`

List of generated documents:
- Document name
- Quality level badge
- Provider badge
- Format icon
- Date generated
- Download button
- If comparison: "Compare" button

---

## Task 8.11 — Comparison View

**File:** `apps/web/src/components/documents/ComparisonView.tsx`

Side-by-side display of two documents generated from same facts:
- Left panel: Claude version
- Right panel: OpenAI version
- Both downloadable independently

Render document content as Markdown preview (the raw content before rendering to DOCX/PDF).

---

## Task 8.12 — Generation Progress

**File:** `apps/web/src/components/documents/GenerationProgress.tsx`

Poll `GET /api/documents/:id/status` every 3 seconds:
- QUEUED → "Preparing your document..."
- GENERATING → "Writing your document... (this may take 30–120 seconds)"
- COMPLETED → Redirect to download / My Documents
- FAILED → Error message with retry option

---

## Task 8.13 — Prompt Templates for All 7 Types

Create prompt templates in `prompts/` directory. Each template defines:
- Section structure for that document type
- Key information to include per section
- Quality-level variations
- Standard references

Example sections for Business Plan:
```
Essential (5 sections): Executive Summary, Market Overview, Business Model, Financial Summary, Next Steps
Standard (8 sections): + Operations Plan, Team, Risk Overview
Professional (12 sections): + Detailed Market Analysis, Competitive Landscape, Financial Projections, Legal, Appendices
Enterprise (20 sections): + Industry Analysis, Customer Personas, Technology Stack, Partnership Strategy, Exit Strategy, Standards Compliance Matrix, Detailed Appendices
```

---

## Tasks 8.14–8.15 — Tests

**Unit:** Prompt builder creates correct prompts. Quality calibrator returns correct params. Pricing matches expected values at each slider position.

**E2E:** Pay → generate → poll status → download → verify file is valid DOCX/PDF/MD with expected content.

---

## Completion

```bash
git add -A
git commit -m "Phase 8: Document generation — AI-powered with quality calibration and multi-format output"
git push origin phase-8/document-generation
```

**Acceptance checklist:**
- [ ] Documents generate in DOCX, PDF, and Markdown
- [ ] Essential quality produces shorter, concise documents
- [ ] Enterprise quality produces comprehensive, standards-referenced documents
- [ ] Comparison generates same doc with both providers
- [ ] Files downloadable from Azure Blob Storage
- [ ] Generation progress shows real-time status
- [ ] My Documents page lists all generated documents
- [ ] Comparison view shows side-by-side output
- [ ] ALL existing tests still pass
