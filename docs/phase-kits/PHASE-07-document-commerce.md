# Phase 7: Document Menu, Quality Slider & Pricing

> **Objective:** Build the document selection, quality slider, dynamic pricing, and fact review flow.
> **Branch:** `phase-7/document-commerce`
> **Dependencies:** Phase 6 complete (quality scoring works)
> **Acceptance:** User selects docs, slides quality, sees dynamic price, reviews facts, pays per document via Stripe.

---

## Pre-flight

```bash
git checkout main
git merge phase-6/quality-scoring
git checkout -b phase-7/document-commerce
```

---

## Task 7.1 — GET /projects/:id/available-documents

**Create module:** `apps/api/src/modules/document-commerce/`

```
document-commerce/
├── document-commerce.module.ts
├── document-commerce.controller.ts
├── services/
│   └── pricing.service.ts
├── dto/
│   ├── available-documents.dto.ts
│   └── preview-request.dto.ts
└── document-commerce.spec.ts
```

**Endpoint:** `GET /api/projects/:projectId/available-documents`

**Response:**
```typescript
{
  documents: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    basePrice: number;
    formatOptions: string[];  // ["DOCX", "PDF", "MARKDOWN"]
    readiness: {
      percentage: number;     // 0–100, based on how many required facts exist
      missingFields: string[];
      status: 'ready' | 'partial' | 'insufficient';
    };
  }>;
}
```

**Readiness calculation:** Compare extracted facts against the fields required for this document type. Business Plan needs company_name, value_proposition, target_market, revenue_model as minimum → if 3 of 4 exist, readiness = 75%.

A document is `ready` at ≥60%, `partial` at 30–59%, `insufficient` below 30%.

---

## Task 7.2 — Pricing Calculator

**File:** `document-commerce/services/pricing.service.ts`

```typescript
@Injectable()
export class PricingService {
  // Quality slider breakpoints
  private readonly breakpoints = [
    { position: 0.00, multiplier: 1.0, label: 'Essential' },
    { position: 0.25, multiplier: 2.0, label: 'Standard' },
    { position: 0.50, multiplier: 3.5, label: 'Professional' },
    { position: 0.75, multiplier: 5.0, label: 'Enterprise' },
    { position: 1.00, multiplier: 5.0, label: 'Enterprise' },
  ];

  calculatePrice(basePrice: number, sliderPosition: number): PriceResult {
    // Clamp slider to 0–1
    const pos = Math.max(0, Math.min(1, sliderPosition));

    // Linear interpolation between breakpoints
    let lower = this.breakpoints[0];
    let upper = this.breakpoints[1];
    for (let i = 0; i < this.breakpoints.length - 1; i++) {
      if (pos >= this.breakpoints[i].position && pos <= this.breakpoints[i + 1].position) {
        lower = this.breakpoints[i];
        upper = this.breakpoints[i + 1];
        break;
      }
    }

    const t = (pos - lower.position) / (upper.position - lower.position || 1);
    const multiplier = lower.multiplier + t * (upper.multiplier - lower.multiplier);
    const price = Math.round(basePrice * multiplier * 100) / 100;

    return {
      basePrice,
      sliderPosition: pos,
      multiplier: Math.round(multiplier * 100) / 100,
      price,
      label: this.getLabel(pos),
      currency: 'AUD',
    };
  }

  private getLabel(pos: number): string {
    if (pos < 0.25) return 'Essential';
    if (pos < 0.50) return 'Standard';
    if (pos < 0.75) return 'Professional';
    return 'Enterprise';
  }
}
```

**API endpoint:** `GET /api/pricing/calculate?basePrice=29&slider=0.65`

Returns: `{ basePrice: 29, multiplier: 2.75, price: 79.75, label: "Professional", currency: "AUD" }`

---

## Task 7.3 — POST /projects/:id/documents/preview

**Endpoint:** `POST /api/projects/:projectId/documents/preview`

**Request:**
```typescript
{
  documentTypeId: string;
  qualityLevel: number;    // 0–1 (slider position)
  format: 'DOCX' | 'PDF' | 'MARKDOWN';
  provider: string;        // "claude" | "openai"
}
```

**Response:**
```typescript
{
  documentType: { name: string; slug: string };
  qualityLevel: number;
  price: number;
  format: string;
  provider: string;
  facts: Array<{
    fieldName: string;
    fieldValue: string;
    confidence: number;
    confirmed: boolean;
    label: string;
    category: string;
  }>;
  readiness: number;
  warnings: string[];  // e.g. "Revenue model not yet defined — document will use placeholder"
}
```

---

## Task 7.4 — Document Menu Page

**File:** `apps/web/src/pages/documents/DocumentMenuPage.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Generate Documents for: My SaaS Idea        │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────┐  ┌─────────────┐            │
│ │ Business    │  │ CTO / Arch  │            │
│ │ Plan        │  │ Pack        │            │
│ │ From $29    │  │ From $39    │            │
│ │ Ready: 75%  │  │ Ready: 40%  │            │
│ │ [Generate →]│  │ [Generate →]│            │
│ └─────────────┘  └─────────────┘            │
│                                             │
│ ┌─────────────┐  ┌─────────────┐            │
│ │ Marketing   │  │ Financial   │            │
│ │ Strategy    │  │ Projections │            │
│ │ From $25    │  │ From $35    │            │
│ │ Ready: 20%  │  │ Ready: 55%  │            │
│ │ [Chat more] │  │ [Generate →]│            │
│ └─────────────┘  └─────────────┘            │
│                                             │
│ ... (all 7 types)                           │
└─────────────────────────────────────────────┘
```

Cards show readiness bar. "Generate" if ready/partial, "Chat more" if insufficient (links to chat).

---

## Task 7.5 — Quality Slider Component

**File:** `apps/web/src/components/documents/QualitySlider.tsx`

Props: `{ basePrice, onChange: (level: number, price: number) => void }`

**UI:** Continuous range slider (0–100%). Below the slider:
- Current label: "Standard"
- Current price: "$58.00 AUD"
- Detail description that updates:
  - Essential: "Core sections only. Concise executive overview."
  - Standard: "Full sections with supporting detail. Professional formatting."
  - Professional: "Comprehensive coverage. Benchmark references. Detailed analysis."
  - Enterprise: "Maximum depth. Full standards mapping. Board-ready quality."

Price updates in real-time as slider moves.

---

## Task 7.6 — Format Selector Component

**File:** `apps/web/src/components/documents/FormatSelector.tsx`

Radio buttons: DOCX | PDF | Markdown

Markdown only enabled if document type supports it (tech docs). Grey out with tooltip "Available for technical document types" otherwise.

---

## Task 7.7 — Provider Comparison Component

**File:** `apps/web/src/components/documents/ProviderComparison.tsx`

Checkbox: "Generate with both providers and compare ($X extra)"

Shows cost breakdown:
- Claude: $58.00
- OpenAI: $58.00
- Comparison total: $116.00

If checked, both documents generate and are available for side-by-side comparison.

---

## Task 7.8 — Fact Review Page

**File:** `apps/web/src/pages/documents/FactReviewPage.tsx`

Shown after user clicks "Generate" on a document type and sets quality/format.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Review Your Information                      │
│ Business Plan — Professional — DOCX          │
├─────────────────────────────────────────────┤
│                                             │
│ Executive Summary                           │
│ ┌─────────────────────────────────────────┐ │
│ │ Company Name: FreshBite        [✓] [✎] │ │
│ │ Business Concept: Meal deliv.. [✓] [✎] │ │
│ │ Value Proposition: —           [!] [✎] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Market Analysis                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Target Market: Young prof...   [✓] [✎] │ │
│ │ TAM: $2.5B                     [?] [✎] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [✓] = confirmed  [?] = low confidence       │
│ [!] = missing     [✎] = edit                │
│                                             │
├─────────────────────────────────────────────┤
│ Total: $79.75 AUD          [← Back] [Pay →] │
└─────────────────────────────────────────────┘
```

User can edit any fact inline. Clicking "Pay" proceeds to Stripe checkout.

---

## Task 7.9 — Modify Stripe Integration

**Modify:** `apps/api/src/modules/payment/`

Switch from Stripe Subscriptions to PaymentIntents:

```typescript
async createDocumentPayment(
  userId: string,
  documentId: string,
  amount: number,
): Promise<{ clientSecret: string }> {
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: 'aud',
    metadata: {
      userId,
      documentId,
      type: 'document_generation',
    },
  });

  await this.prisma.payment.create({
    data: {
      userId,
      generatedDocumentId: documentId,
      amount,
      currency: 'AUD',
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING',
    },
  });

  return { clientSecret: paymentIntent.client_secret };
}
```

**Webhook handler:** On `payment_intent.succeeded`:
1. Update Payment status to COMPLETED
2. Trigger document generation (Phase 8)

Remove subscription-related code from being the default path. Keep the code for reference but do not expose subscription endpoints.

---

## Task 7.10 — Checkout Flow Component

**File:** `apps/web/src/components/documents/CheckoutFlow.tsx`

Stripe Elements integration for card payment. Shows:
- Document name
- Quality level
- Price
- Card input (Stripe Elements)
- "Generate Document" button

On payment success → redirect to generation progress (Phase 8).

---

## Tasks 7.11–7.12 — Tests

**Pricing tests:** Verify interpolation at all breakpoints and between them. Edge cases: slider at 0, at 1, at exact breakpoints.

**E2E:** Select doc → set slider → review facts → pay → verify PaymentIntent created with correct amount.

---

## Completion

```bash
git add -A
git commit -m "Phase 7: Document commerce — menu, quality slider, dynamic pricing, Stripe per-document"
git push origin phase-7/document-commerce
```

**Acceptance checklist:**
- [ ] Document menu shows 7 types with readiness percentages
- [ ] Quality slider updates price in real-time with continuous interpolation
- [ ] Format selector works (Markdown restricted to tech docs)
- [ ] Provider comparison option shows combined cost
- [ ] Fact review page shows all extracted facts, editable
- [ ] Low-confidence facts flagged, missing facts shown
- [ ] Stripe PaymentIntent created with correct AUD amount
- [ ] Payment webhook triggers on success
- [ ] ALL existing tests still pass
