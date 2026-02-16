# Phase 5: Fact Extraction Pipeline

> **Objective:** Build the AI-powered system that extracts structured facts from chat conversation in real-time.
> **Branch:** `phase-5/fact-extraction`
> **Dependencies:** Phase 4 complete (chat engine works)
> **Acceptance:** Facts extracted from chat automatically. Confidence scores assigned. User can view and correct facts via API.

---

## Pre-flight

```bash
git checkout main
git merge phase-4/chat-engine
git checkout -b phase-5/fact-extraction
```

---

## Task 5.1 — Create Fact Extraction Module

**Create directory:** `apps/api/src/modules/fact-extraction/`

```
fact-extraction/
├── fact-extraction.module.ts
├── fact-extraction.controller.ts
├── fact-extraction.service.ts
├── schemas/
│   ├── business-plan.schema.ts
│   ├── tech-architecture.schema.ts
│   ├── marketing-strategy.schema.ts
│   ├── financial-projections.schema.ts
│   ├── investor-pitch.schema.ts
│   ├── ai-development.schema.ts
│   └── custom.schema.ts
└── fact-extraction.spec.ts
```

Register in `app.module.ts`. Import `AiGatewayModule`.

---

## Task 5.2 — Extraction Schemas Per Project Type

Each schema defines the fields to extract. Example for Business Plan:

**File:** `schemas/business-plan.schema.ts`

```typescript
export const businessPlanSchema: ExtractionField[] = [
  // Executive Summary
  { fieldName: 'company_name', label: 'Company Name', category: 'Executive Summary', required: true },
  { fieldName: 'business_concept', label: 'Business Concept', category: 'Executive Summary', required: true },
  { fieldName: 'value_proposition', label: 'Value Proposition', category: 'Executive Summary', required: true },
  { fieldName: 'industry', label: 'Industry', category: 'Executive Summary', required: true },

  // Market Analysis
  { fieldName: 'target_market', label: 'Target Market', category: 'Market Analysis', required: true },
  { fieldName: 'market_size_tam', label: 'Total Addressable Market', category: 'Market Analysis', required: true },
  { fieldName: 'market_size_sam', label: 'Serviceable Market', category: 'Market Analysis', required: false },
  { fieldName: 'competitors', label: 'Competitors', category: 'Market Analysis', required: true },
  { fieldName: 'competitive_advantage', label: 'Competitive Advantage', category: 'Market Analysis', required: true },

  // Operations
  { fieldName: 'business_model', label: 'Business Model', category: 'Operations', required: true },
  { fieldName: 'key_processes', label: 'Key Processes', category: 'Operations', required: false },
  { fieldName: 'technology_stack', label: 'Technology Stack', category: 'Operations', required: false },

  // Financial
  { fieldName: 'revenue_model', label: 'Revenue Model', category: 'Financial', required: true },
  { fieldName: 'pricing_strategy', label: 'Pricing Strategy', category: 'Financial', required: true },
  { fieldName: 'cost_structure', label: 'Cost Structure', category: 'Financial', required: false },
  { fieldName: 'funding_required', label: 'Funding Required', category: 'Financial', required: false },
  { fieldName: 'break_even_timeline', label: 'Break-Even Timeline', category: 'Financial', required: false },

  // Team
  { fieldName: 'founders', label: 'Founders / Key Team', category: 'Team', required: true },
  { fieldName: 'team_size', label: 'Team Size', category: 'Team', required: false },
  { fieldName: 'hiring_plan', label: 'Hiring Plan', category: 'Team', required: false },

  // Risk
  { fieldName: 'key_risks', label: 'Key Risks', category: 'Risk', required: false },
  { fieldName: 'legal_structure', label: 'Legal Structure', category: 'Legal', required: false },
  { fieldName: 'location', label: 'Location / Jurisdiction', category: 'Legal', required: false },
];
```

**Create similar schemas** for all 7 project types. Each should have 15–25 fields covering their quality dimensions.

---

## Task 5.3 — Extraction Trigger

**In `fact-extraction.service.ts`:**

After each assistant response in the chat engine, call:

```typescript
async extractFacts(projectId: string): Promise<ExtractedFact[]> {
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    include: { messages: { orderBy: { createdAt: 'asc' } }, facts: true },
  });

  const schema = this.getSchema(project.projectType);
  const existingFacts = project.facts;

  // Build extraction prompt
  const prompt = this.buildExtractionPrompt(project.messages, schema, existingFacts);

  // Call AI Gateway in JSON mode
  const extracted = await this.aiGateway.getAdapter('claude').completeJson<ExtractionResult>({
    taskType: 'extract',
    messages: [{ role: 'user', content: prompt }],
    systemPrompt: 'You are a fact extraction engine. Extract structured data from the conversation. Respond ONLY with valid JSON.',
    jsonMode: true,
  });

  // Upsert facts
  const results: ExtractedFact[] = [];
  for (const fact of extracted.facts) {
    const upserted = await this.prisma.extractedFact.upsert({
      where: { projectId_fieldName: { projectId, fieldName: fact.fieldName } },
      update: {
        fieldValue: fact.value,
        confidence: fact.confidence,
        sourceMessageId: fact.sourceMessageId ?? null,
      },
      create: {
        projectId,
        fieldName: fact.fieldName,
        fieldValue: fact.value,
        confidence: fact.confidence,
        sourceMessageId: fact.sourceMessageId ?? null,
      },
    });
    results.push(upserted);
  }

  return results;
}
```

**Extraction prompt template:**
```
Given this conversation between a user and an AI consultant:

{messages formatted as User: ... / Assistant: ...}

Extract the following fields if mentioned:
{schema fields as JSON array}

Already known facts (update if new information contradicts):
{existing facts as JSON}

Respond with JSON:
{
  "facts": [
    {
      "fieldName": "company_name",
      "value": "extracted value",
      "confidence": 0.95,
      "sourceMessageId": "uuid of the message where this was mentioned"
    }
  ]
}

Rules:
- Only extract facts explicitly stated or strongly implied
- Confidence 0.9+ for explicit statements, 0.5-0.8 for inferences
- If a fact was previously known and the user gives updated info, use the new value
- Do not fabricate facts. If unsure, omit.
```

**Integration with Chat Engine:** Modify `chat-engine.service.ts` to call `factExtractionService.extractFacts(projectId)` after saving each assistant message. Run asynchronously — don't block the chat response.

---

## Task 5.4 — Confidence Scoring

In the extraction prompt, instruct the AI to assign confidence:
- **0.9–1.0:** User explicitly stated this ("Our company is called Acme")
- **0.7–0.89:** Strongly implied ("We're targeting the Australian market" → location = Australia)
- **0.5–0.69:** Inferred ("We have 5 developers" → team_size could be 5 but might be more)
- **Below 0.5:** Don't extract (too uncertain)

Facts with confidence < 0.7 are flagged for user confirmation on the Fact Review page (Phase 7).

---

## Task 5.5 — Fact Deduplication

The `@@unique([projectId, fieldName])` constraint in the schema handles this. The upsert in Task 5.3 automatically updates existing facts with new values when the same field is mentioned again.

Additional logic: if the user says "Actually, our company is called Beta, not Acme", the new value replaces the old one and confidence should be set to 1.0 (user correction).

---

## Task 5.6 — GET /projects/:id/facts

**Endpoint:** `GET /api/projects/:projectId/facts`

**Response:**
```typescript
{
  facts: Array<{
    id: string;
    fieldName: string;
    fieldValue: string;
    confidence: number;
    confirmedByUser: boolean;
    category: string;  // from schema
    label: string;     // from schema
    updatedAt: string;
  }>;
  coverage: {
    total: number;      // total fields in schema
    extracted: number;  // fields with values
    confirmed: number;  // user-confirmed fields
    percentage: number; // extracted / total * 100
  };
}
```

---

## Task 5.7 — PATCH /projects/:id/facts/:id

**Endpoint:** `PATCH /api/projects/:projectId/facts/:factId`

**Request body:**
```typescript
{
  fieldValue?: string;       // corrected value
  confirmedByUser?: boolean; // user confirms this fact
}
```

When user confirms or corrects: set `confirmedByUser = true`, `confidence = 1.0`.

---

## Task 5.8 — Unit Tests

Test with sample conversations:
1. User says "I'm building a meal delivery app called FreshBox" → extracts company_name = "FreshBox", business_concept includes "meal delivery"
2. User corrects: "Actually it's called FreshBite" → company_name updates to "FreshBite"
3. Vague statement "We might target young professionals" → confidence < 0.8
4. Coverage calculation: 5 of 20 fields extracted = 25%
5. Upsert doesn't create duplicates

---

## Completion

```bash
git add -A
git commit -m "Phase 5: Fact extraction pipeline — automatic extraction with confidence scoring"
git push origin phase-5/fact-extraction
```

**Acceptance checklist:**
- [ ] Facts extracted automatically after each assistant response
- [ ] Extraction schemas exist for all 7 project types
- [ ] Confidence scores assigned based on extraction rules
- [ ] Facts deduplicated via upsert on projectId + fieldName
- [ ] GET /facts returns facts with coverage statistics
- [ ] PATCH /facts allows user correction with auto-confirm
- [ ] Extraction runs asynchronously (doesn't block chat)
- [ ] ALL existing tests still pass
