# Phase 3: AI Gateway

> **Objective:** Build the provider-agnostic AI Gateway that routes requests to Claude or OpenAI based on user preference.
> **Branch:** `phase-3/ai-gateway`
> **Dependencies:** Phase 2 complete (data model exists)
> **Acceptance:** Gateway routes to Claude and OpenAI. Streaming works. Cost tracking logs token usage. Provider failure triggers fallback.

---

## Pre-flight

```bash
git checkout main
git merge phase-2/data-model  # only after Phase 2 verified
git checkout -b phase-3/ai-gateway
npm install @anthropic-ai/sdk openai  # install provider SDKs
```

---

## Task 3.1 — Create AI Gateway Module

**Create directory:** `apps/api/src/modules/ai-gateway/`

**Files to create:**

```
ai-gateway/
├── ai-gateway.module.ts
├── ai-gateway.controller.ts
├── ai-gateway.service.ts
├── interfaces/
│   ├── ai-provider.interface.ts
│   ├── ai-request.interface.ts
│   └── ai-response.interface.ts
├── adapters/
│   ├── claude.adapter.ts
│   └── openai.adapter.ts
├── services/
│   └── cost-tracker.service.ts
├── dto/
│   ├── chat-request.dto.ts
│   └── generate-request.dto.ts
└── ai-gateway.spec.ts
```

**Register in `app.module.ts`:**
```typescript
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
// Add to imports array
```

---

## Task 3.2 — Define Interfaces

**File:** `ai-gateway/interfaces/ai-provider.interface.ts`

```typescript
import { AiRequest, AiResponse, AiStreamChunk } from './ai-request.interface';

export interface AiProviderAdapter {
  readonly slug: string;
  readonly name: string;

  // Standard completion (fact extraction, structured output)
  complete(request: AiRequest): Promise<AiResponse>;

  // Streaming completion (chat, document generation)
  stream(request: AiRequest): AsyncGenerator<AiStreamChunk>;

  // JSON mode completion (fact extraction)
  completeJson<T>(request: AiRequest): Promise<T>;

  // Health check
  isAvailable(): Promise<boolean>;
}
```

**File:** `ai-gateway/interfaces/ai-request.interface.ts`

```typescript
export type AiTaskType = 'chat' | 'extract' | 'generate';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiRequest {
  taskType: AiTaskType;
  messages: AiMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AiResponse {
  content: string;
  provider: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface AiStreamChunk {
  content: string;
  done: boolean;
  provider?: string;
  model?: string;
  usage?: AiResponse['usage'];  // only on final chunk
}
```

---

## Task 3.3 — Claude Adapter

**File:** `ai-gateway/adapters/claude.adapter.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderAdapter } from '../interfaces/ai-provider.interface';
import { AiRequest, AiResponse, AiStreamChunk } from '../interfaces/ai-request.interface';

@Injectable()
export class ClaudeAdapter implements AiProviderAdapter {
  readonly slug = 'claude';
  readonly name = 'Claude (Anthropic)';
  private client: Anthropic;
  private logger = new Logger(ClaudeAdapter.name);

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async complete(request: AiRequest): Promise<AiResponse> {
    const start = Date.now();
    const model = this.getModel(request.taskType);

    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt ?? '',
      messages: request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      provider: this.slug,
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  async *stream(request: AiRequest): AsyncGenerator<AiStreamChunk> {
    const model = this.getModel(request.taskType);

    const stream = this.client.messages.stream({
      model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt ?? '',
      messages: request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      content: '',
      done: true,
      provider: this.slug,
      model,
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    };
  }

  async completeJson<T>(request: AiRequest): Promise<T> {
    const response = await this.complete({
      ...request,
      systemPrompt: `${request.systemPrompt ?? ''}\n\nRespond ONLY with valid JSON. No preamble, no markdown fences, no explanation.`,
    });

    return JSON.parse(response.content) as T;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      this.logger.warn('Claude provider unavailable');
      return false;
    }
  }

  private getModel(taskType: AiRequest['taskType']): string {
    // All tasks use the same model for V1. Can differentiate later.
    return 'claude-sonnet-4-5-20250929';
  }
}
```

---

## Task 3.4 — OpenAI Adapter

**File:** `ai-gateway/adapters/openai.adapter.ts`

Same interface as Claude adapter. Use the `openai` npm package. Key differences:
- Model: `gpt-4o`
- Streaming uses `stream: true` with `for await (const chunk of stream)` pattern
- JSON mode: `response_format: { type: 'json_object' }`
- System prompt goes as a message with `role: 'system'`, not a separate parameter
- Usage comes from `response.usage` (non-streaming) or final chunk (streaming)

Implement the full `AiProviderAdapter` interface identically to the Claude adapter.

---

## Task 3.5 — Gateway Router Service

**File:** `ai-gateway/ai-gateway.service.ts`

```typescript
@Injectable()
export class AiGatewayService {
  private adapters: Map<string, AiProviderAdapter>;

  constructor(
    private claude: ClaudeAdapter,
    private openai: OpenAiAdapter,
    private costTracker: CostTrackerService,
  ) {
    this.adapters = new Map([
      ['claude', claude],
      ['openai', openai],
    ]);
  }

  getAdapter(providerSlug: string): AiProviderAdapter {
    const adapter = this.adapters.get(providerSlug);
    if (!adapter) throw new BadRequestException(`Unknown provider: ${providerSlug}`);
    return adapter;
  }

  async complete(providerSlug: string, request: AiRequest, userId: string): Promise<AiResponse> {
    const adapter = this.getAdapter(providerSlug);
    try {
      const response = await adapter.complete(request);
      await this.costTracker.log(userId, providerSlug, request.taskType, response.usage);
      return response;
    } catch (error) {
      // Fallback to other provider
      const fallback = this.getFallback(providerSlug);
      if (fallback) {
        const response = await fallback.complete(request);
        await this.costTracker.log(userId, fallback.slug, request.taskType, response.usage);
        return response;
      }
      throw error;
    }
  }

  async *stream(providerSlug: string, request: AiRequest, userId: string): AsyncGenerator<AiStreamChunk> {
    const adapter = this.getAdapter(providerSlug);
    for await (const chunk of adapter.stream(request)) {
      yield chunk;
      if (chunk.done && chunk.usage) {
        await this.costTracker.log(userId, providerSlug, request.taskType, chunk.usage);
      }
    }
  }

  private getFallback(failedSlug: string): AiProviderAdapter | null {
    for (const [slug, adapter] of this.adapters) {
      if (slug !== failedSlug) return adapter;
    }
    return null;
  }
}
```

---

## Task 3.6 — Configuration

**Modify file:** `config/configuration.ts` (or equivalent config file)

Add AI provider configuration:
```typescript
ai: {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'claude',
}
```

**Modify file:** `.env.example` — add:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEFAULT_AI_PROVIDER=claude
```

---

## Task 3.7 — SSE Streaming Endpoint

**File:** `ai-gateway/ai-gateway.controller.ts`

```typescript
@Controller('ai')
export class AiGatewayController {
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  async streamChat(
    @Query('provider') provider: string,
    @Body() body: ChatRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Observable<MessageEvent>> {
    // Return SSE observable from gateway stream
  }
}
```

**Note:** The chat-engine (Phase 4) will be the primary consumer of this endpoint, not the frontend directly. The controller here is for direct gateway testing.

---

## Task 3.8 — Cost Tracker Service

**File:** `ai-gateway/services/cost-tracker.service.ts`

```typescript
@Injectable()
export class CostTrackerService {
  private logger = new Logger(CostTrackerService.name);

  async log(
    userId: string,
    provider: string,
    taskType: string,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number },
  ): Promise<void> {
    // V1: Log to console + structured logging
    // V2: Persist to database for billing analytics
    this.logger.log({
      userId,
      provider,
      taskType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      estimatedCost: this.estimateCost(provider, usage),
    });
  }

  private estimateCost(provider: string, usage: { inputTokens: number; outputTokens: number }): number {
    const rates: Record<string, { input: number; output: number }> = {
      claude: { input: 0.003, output: 0.015 },
      openai: { input: 0.005, output: 0.015 },
    };
    const rate = rates[provider] ?? rates.claude;
    return (usage.inputTokens / 1000) * rate.input + (usage.outputTokens / 1000) * rate.output;
  }
}
```

---

## Task 3.9 — Unit Tests

**File:** `ai-gateway/ai-gateway.spec.ts`

Test with mocked provider responses:
1. Gateway routes to correct provider based on slug
2. Gateway falls back to other provider when primary fails
3. Claude adapter formats messages correctly (system prompt separate)
4. OpenAI adapter formats messages correctly (system prompt as message)
5. Cost tracker logs correct token counts
6. Unknown provider slug throws BadRequestException
7. JSON mode returns parsed object
8. Stream yields chunks and final usage

**Mock the SDK clients** — do not make real API calls in unit tests.

---

## Task 3.10 — Integration Test

**File:** `test/integration/ai-gateway.integration.spec.ts`

**Only if API keys available.** Test:
1. Send same simple prompt to both providers
2. Both return valid text responses
3. Both have usage data
4. Streaming returns chunks

Mark as `@SkipIf(!process.env.ANTHROPIC_API_KEY)` so CI doesn't fail without keys.

---

## Completion

```bash
npm run build  # compiles without errors
npm test  # all tests pass (including new gateway tests)

git add -A
git commit -m "Phase 3: AI Gateway — Claude + OpenAI adapters with streaming and fallback"
git push origin phase-3/ai-gateway
```

**Acceptance checklist:**
- [ ] AI Gateway module registered in app.module.ts
- [ ] Claude adapter implements full AiProviderAdapter interface
- [ ] OpenAI adapter implements full AiProviderAdapter interface
- [ ] Gateway routes to correct adapter based on slug
- [ ] Fallback works when primary provider fails
- [ ] SSE streaming endpoint returns chunks
- [ ] Cost tracker logs token usage
- [ ] JSON mode works for structured output
- [ ] Unit tests pass with mocked providers
- [ ] Integration test passes with real API keys (if available)
- [ ] ALL existing tests still pass
