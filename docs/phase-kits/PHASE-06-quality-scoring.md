# Phase 6: Quality Scoring Engine

> **Objective:** Build standards-based quality scoring that benchmarks extracted facts against real standards per project type.
> **Branch:** `phase-6/quality-scoring`
> **Dependencies:** Phase 5 complete (fact extraction works)
> **Acceptance:** Score updates as facts are extracted. Dashboard shows per-dimension breakdown and gaps. Scores benchmarked against defined standards.

---

## Pre-flight

```bash
git checkout main
git merge phase-5/fact-extraction
git checkout -b phase-6/quality-scoring
```

---

## Task 6.1 — Create Quality Scoring Module

**Refactor** `apps/api/src/modules/scoring-engine/` → `apps/api/src/modules/quality-scoring/`

Or create new alongside and swap the import in `app.module.ts`.

```
quality-scoring/
├── quality-scoring.module.ts
├── quality-scoring.controller.ts
├── quality-scoring.service.ts
├── services/
│   └── scoring-calculator.service.ts
├── benchmarks/
│   └── (loaded from QualityDimension table — no static files needed)
└── quality-scoring.spec.ts
```

---

## Task 6.2 — Benchmark Criteria

Already seeded in Phase 2 (Tasks 2.11 and 2.14). The `QualityDimension` table contains `benchmarkCriteria` JSON with criteria IDs, descriptions, standards references, and required flags.

**No new files needed here.** The scoring calculator reads from the database.

If the Phase 2 seeds need adjustment based on testing, update them now.

---

## Task 6.3 — Scoring Calculator

**File:** `quality-scoring/services/scoring-calculator.service.ts`

```typescript
@Injectable()
export class ScoringCalculatorService {
  constructor(private prisma: PrismaClient) {}

  async calculateScore(projectId: string): Promise<ProjectScore> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { facts: true },
    });

    // Get dimensions for this project type
    const dimensions = await this.prisma.qualityDimension.findMany({
      where: { projectType: project.projectType },
      orderBy: { sortOrder: 'asc' },
    });

    const dimensionScores: DimensionScoreResult[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const dimension of dimensions) {
      const criteria = JSON.parse(dimension.benchmarkCriteria as string) as Criterion[];
      const { covered, total, score } = this.evaluateDimension(criteria, project.facts);

      // Upsert dimension score
      await this.prisma.dimensionScore.upsert({
        where: { projectId_dimensionId: { projectId, dimensionId: dimension.id } },
        update: { score, coveredCriteria: covered, totalCriteria: total },
        create: { projectId, dimensionId: dimension.id, score, coveredCriteria: covered, totalCriteria: total },
      });

      dimensionScores.push({
        dimensionId: dimension.id,
        name: dimension.name,
        weight: dimension.weight,
        score,
        covered,
        total,
        gaps: this.getGaps(criteria, project.facts),
      });

      totalWeightedScore += score * dimension.weight;
      totalWeight += dimension.weight;
    }

    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Update project overall score
    await this.prisma.project.update({
      where: { id: projectId },
      data: { qualityScore: Math.round(overallScore * 100) / 100 },
    });

    return { overallScore, dimensions: dimensionScores };
  }

  private evaluateDimension(
    criteria: Criterion[],
    facts: ExtractedFact[],
  ): { covered: number; total: number; score: number } {
    const total = criteria.length;
    let covered = 0;

    for (const criterion of criteria) {
      // Map criterion to expected facts
      // A criterion is "covered" if relevant extracted facts exist with confidence >= 0.5
      const relatedFacts = this.findRelatedFacts(criterion, facts);
      if (relatedFacts.length > 0) {
        // Weight by confidence: a fact with 0.9 confidence covers more than 0.5
        const bestConfidence = Math.max(...relatedFacts.map(f => f.confidence));
        covered += bestConfidence;
      }
    }

    const score = total > 0 ? (covered / total) * 100 : 0;
    return { covered: Math.round(covered), total, score: Math.round(score * 100) / 100 };
  }

  private findRelatedFacts(criterion: Criterion, facts: ExtractedFact[]): ExtractedFact[] {
    // Map criterion IDs to fact field names
    // This mapping comes from the criterion ID prefix matching schema categories
    // e.g., criterion "es-1" (Executive Summary) maps to facts in category "Executive Summary"
    // Implementation: use AI to evaluate coverage, or use keyword matching
    //
    // V1 approach: keyword matching between criterion.criterion text and fact fieldNames/values
    // V2 approach: AI-based evaluation for nuanced coverage assessment
    return facts.filter(f =>
      f.fieldValue &&
      f.fieldValue.trim().length > 0 &&
      this.criterionMatchesFact(criterion, f)
    );
  }

  private criterionMatchesFact(criterion: Criterion, fact: ExtractedFact): boolean {
    // Build a mapping of criterion patterns to fact field names
    // This should be defined in the schema alongside extraction fields
    // For V1: maintain a static mapping per project type
    const criterionFactMap: Record<string, string[]> = {
      'es-1': ['business_concept'],
      'es-2': ['value_proposition'],
      'es-3': ['target_market'],
      'es-4': ['revenue_model'],
      'es-5': ['funding_required'],
      'ma-1': ['market_size_tam'],
      'ma-2': ['market_size_sam'],
      'ma-3': ['target_market'],
      'ma-4': ['competitors'],
      'ma-5': ['competitive_advantage'],
      // ... extend for all criteria across all project types
    };

    const matchingFields = criterionFactMap[criterion.id] ?? [];
    return matchingFields.includes(fact.fieldName);
  }

  private getGaps(criteria: Criterion[], facts: ExtractedFact[]): Gap[] {
    return criteria
      .filter(c => {
        const related = this.findRelatedFacts(c, facts);
        return related.length === 0;
      })
      .map(c => ({
        criterionId: c.id,
        criterion: c.criterion,
        standard: c.standard,
        required: c.required,
        suggestedPrompt: `Tell me about ${c.criterion.toLowerCase()}`,
      }));
  }
}
```

**Important:** The criterion-to-fact mapping is critical. Build comprehensive mappings for all project types during implementation. Store them alongside the extraction schemas (Phase 5).

---

## Task 6.4 — Scoring Trigger

Modify `fact-extraction.service.ts` to call scoring after extraction:

```typescript
// At the end of extractFacts():
await this.scoringCalculator.calculateScore(projectId);
```

Scores recalculate after every chat exchange. This is lightweight — just comparing facts against criteria.

---

## Task 6.5 — GET /projects/:id/score

**Endpoint:** `GET /api/projects/:projectId/score`

**Response:**
```typescript
{
  overallScore: number;  // 0–100
  dimensions: Array<{
    id: string;
    name: string;
    score: number;        // 0–100
    coveredCriteria: number;
    totalCriteria: number;
    weight: number;
  }>;
}
```

---

## Task 6.6 — GET /projects/:id/gaps

**Endpoint:** `GET /api/projects/:projectId/gaps`

**Response:**
```typescript
{
  gaps: Array<{
    dimensionName: string;
    criterion: string;
    standard: string;
    required: boolean;
    suggestedPrompt: string;  // pre-built question the user can click to send
  }>;
  totalGaps: number;
  requiredGaps: number;  // gaps in required criteria
}
```

Sorted by: required first, then by dimension weight (highest impact first).

---

## Task 6.7 — Dashboard Page Frontend

**File:** `apps/web/src/pages/dashboard/DashboardPage.tsx` (rewrite)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Project: My SaaS Idea                       │
├─────────────────────┬───────────────────────┤
│                     │                       │
│    QUALITY SCORE    │   DIMENSION BREAKDOWN │
│       67/100        │   ████████░░ Market   │
│     [animated]      │   ██████░░░░ Finance  │
│                     │   █████████░ Ops      │
│                     │   ███░░░░░░░ Risk     │
│                     │                       │
├─────────────────────┴───────────────────────┤
│ INFORMATION GAPS                            │
│                                             │
│ ⚠ Required: Define your revenue model      │
│   Standard: Business Model Canvas           │
│   [Ask about this →]                        │
│                                             │
│ ○ Optional: Break-even timeline             │
│   Standard: Financial Analysis              │
│   [Ask about this →]                        │
│                                             │
└─────────────────────────────────────────────┘
```

"Ask about this" buttons navigate back to chat with the suggested prompt pre-filled.

---

## Tasks 6.8–6.9 — QualityScoreCard and GapList Components

**QualityScoreCard:** Animated circle or gauge showing 0–100 score. Colour coded: red (0–30), amber (31–60), green (61–100).

**GapList:** Required gaps highlighted with warning icon. Optional gaps with neutral icon. Each gap shows the standard it references and a clickable "Ask about this" button.

---

## Task 6.10 — Unit Tests

1. Score calculation with known facts: 3 of 5 criteria covered at confidence 0.9 → score ≈ 54
2. Weight impact: high-weight dimension affects overall score more
3. Gap detection: uncovered criteria appear in gaps list
4. Required gaps sorted before optional
5. Score updates when new fact extracted

---

## Completion

```bash
git add -A
git commit -m "Phase 6: Quality scoring engine — standards-benchmarked scoring with dashboard"
git push origin phase-6/quality-scoring
```

**Acceptance checklist:**
- [ ] Score calculated from extracted facts vs benchmark criteria
- [ ] Per-dimension scores with coverage counts
- [ ] Gaps identified with suggested prompts
- [ ] Score recalculates after each fact extraction
- [ ] Dashboard page shows score, dimensions, and gaps
- [ ] "Ask about this" navigates to chat with pre-filled prompt
- [ ] ALL existing tests still pass
