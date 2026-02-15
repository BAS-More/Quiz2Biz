# Phase 4: Chat Engine

> **Objective:** Build the conversational AI chat as the primary user interface, replacing the form-based questionnaire.
> **Branch:** `phase-4/chat-engine`
> **Dependencies:** Phase 3 complete (AI Gateway works)
> **Acceptance:** User chats with AI in real-time. Provider selectable. Messages persist. 50-message limit enforced. Streaming works.

---

## Pre-flight

```bash
git checkout main
git merge phase-3/ai-gateway
git checkout -b phase-4/chat-engine
```

---

## Task 4.1 — Create Chat Engine Module

**Create directory:** `apps/api/src/modules/chat-engine/`

```
chat-engine/
├── chat-engine.module.ts
├── chat-engine.controller.ts
├── chat-engine.service.ts
├── services/
│   └── prompt-builder.service.ts
├── dto/
│   ├── send-message.dto.ts
│   └── chat-history.dto.ts
└── chat-engine.spec.ts
```

Register in `app.module.ts`. Import `AiGatewayModule`.

---

## Task 4.2 — POST /projects/:id/messages

**Endpoint:** `POST /api/projects/:projectId/messages`

**Request body:**
```typescript
{
  content: string;        // user message
  provider?: string;      // "claude" | "openai" (defaults to project setting)
}
```

**Flow:**
1. Validate project exists and belongs to user's workspace
2. Check message count against 50-message limit → return 402 if exceeded
3. Save user message to ChatMessage table
4. Increment `project.messageCount`
5. Build system prompt via PromptBuilderService
6. Retrieve chat history (all prior messages for this project)
7. Call AiGateway.stream() with provider preference
8. Stream response via SSE
9. On stream completion, save assistant message to ChatMessage table with metadata (token count, provider, latency)
10. Return message ID

**SSE Response format:**
```
event: chunk
data: {"content": "Here's what I think about..."}

event: chunk
data: {"content": " your business idea."}

event: done
data: {"messageId": "uuid", "usage": {"inputTokens": 150, "outputTokens": 89}}
```

---

## Task 4.3 — GET /projects/:id/messages

**Endpoint:** `GET /api/projects/:projectId/messages`

**Query params:** `page` (default 1), `limit` (default 50)

**Response:**
```typescript
{
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    metadata: { provider?: string; tokenCount?: number; latencyMs?: number } | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  hasMore: boolean;
}
```

Order by `createdAt ASC` (oldest first, like a chat).

---

## Task 4.4 — System Prompt Builder

**File:** `chat-engine/services/prompt-builder.service.ts`

This is the most critical component of the chat engine. The system prompt tells the AI how to behave and what information to gather.

**Build the prompt dynamically from:**
1. **Base persona:** "You are Quiz2Biz, an AI business consultant helping users develop their business ideas into professional-grade documents."
2. **Project type context:** If project type is set, include relevant dimensions and what information is needed.
3. **Extracted facts so far:** Inject known facts so the AI doesn't re-ask questions the user already answered.
4. **Quality gaps:** From the quality scoring engine (Phase 6 — for now, skip this part and add a placeholder). Tell the AI which dimensions are weak and need more information.
5. **Conversation stage:** Early (discovery), mid (deepening), late (refinement). Adjust tone accordingly.
6. **Behavioural rules:**
   - Be conversational, not interrogative
   - Don't ask more than 2 questions per response
   - Acknowledge what the user said before asking follow-ups
   - Proactively suggest areas the user may not have considered
   - If the user goes off-topic, gently redirect
   - Never reveal internal scoring or benchmark mechanics

**Template structure:**
```
You are Quiz2Biz, an AI business consultant...

PROJECT CONTEXT:
- Project type: {projectType}
- Current quality score: {score}/100

KNOWN FACTS:
{factsList}

INFORMATION GAPS:
{gapsList}

CONVERSATION RULES:
1. Be conversational...
2. ...

Your goal is to help the user develop their idea to the point where they can generate a high-quality {documentType} document.
```

---

## Task 4.5 — 50-Message Hard Limit

In `chat-engine.service.ts`:

```typescript
async validateMessageLimit(projectId: string): Promise<void> {
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
    select: { messageCount: true, status: true },
  });

  if (project.messageCount >= 50) {
    // Update project status
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'CHAT_LIMIT_REACHED' },
    });

    throw new PaymentRequiredException(
      'You have reached the 50-message limit for this project. ' +
      'Generate a document to continue your conversation.'
    );
  }
}
```

**Note:** `PaymentRequiredException` is a custom exception that returns HTTP 402. Create it in `apps/api/src/common/exceptions/`.

**Count rule:** Only USER messages count toward the limit (not assistant responses).

---

## Task 4.6 — Store Messages with Metadata

Every message saved must include:
```typescript
await this.prisma.chatMessage.create({
  data: {
    projectId,
    role: 'ASSISTANT',
    content: fullResponse,
    metadata: {
      provider: response.provider,
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latencyMs: response.latencyMs,
    },
  },
});
```

---

## Task 4.7 — Chat Page Frontend

**File:** `apps/web/src/pages/chat/ChatPage.tsx`

**Layout:**
```
┌─────────────────────────────────────┐
│ Project Name          [Claude ▾]    │  ← header with provider selector
├─────────────────────────────────────┤
│                                     │
│  [AI] Welcome! Tell me about your   │
│  business idea...                   │
│                                     │
│  [User] I want to build a SaaS...   │
│                                     │
│  [AI] That sounds interesting!      │
│  What problem does it solve...      │
│                                     │
│  ░░░░░░░░░░░░░░░░  (streaming)     │
│                                     │
├─────────────────────────────────────┤
│ [Message limit: 47/50 remaining]    │  ← ChatLimitBanner
├─────────────────────────────────────┤
│ [Type your message...        ] [➤]  │  ← input + send button
└─────────────────────────────────────┘
```

**Requirements:**
- Auto-scroll to bottom on new messages
- Show typing indicator while streaming
- Markdown rendering in AI responses (use react-markdown or similar)
- Disable input while AI is responding
- Load chat history on page load
- Show provider badge on each AI message

---

## Task 4.8 — MessageBubble Component

**File:** `apps/web/src/components/chat/MessageBubble.tsx`

Props: `{ role, content, metadata?, createdAt }`

- User messages: right-aligned, solid background
- AI messages: left-aligned, lighter background, with provider badge
- Markdown rendering for AI messages
- Timestamp on hover

---

## Task 4.9 — Provider Selector Component

**File:** `apps/web/src/components/chat/ProviderSelector.tsx`

Simple dropdown: Claude | OpenAI. Persists selection to project record via API.

---

## Task 4.10 — Chat Limit Banner

**File:** `apps/web/src/components/chat/ChatLimitBanner.tsx`

- Shows "{N} messages remaining" when under 10 remaining
- Shows warning at 5 remaining
- Shows blocking message at 0 with link to Document Menu
- Hidden when plenty of messages remaining

---

## Task 4.11 — SSE Streaming Connection

**File:** `apps/web/src/api/chat.ts`

```typescript
export async function sendMessage(
  projectId: string,
  content: string,
  provider: string,
  onChunk: (text: string) => void,
  onDone: (messageId: string) => void,
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content, provider }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // Parse SSE events and call onChunk/onDone
  }
}
```

---

## Tasks 4.12–4.13 — Tests

**Unit tests:** Test prompt builder generates correct prompts for different project types and fact states. Test message limit enforcement. Test message storage with metadata.

**E2E test:** Send message → receive streamed response → verify message persisted in DB → verify history endpoint returns both messages.

---

## Completion

```bash
npm run build
npm test

git add -A
git commit -m "Phase 4: Chat Engine — conversational AI with streaming and message limits"
git push origin phase-4/chat-engine
```

**Acceptance checklist:**
- [ ] POST /projects/:id/messages sends user message and streams AI response
- [ ] GET /projects/:id/messages returns paginated chat history
- [ ] System prompt includes project context and known facts
- [ ] 50-message limit enforced (returns 402 at limit)
- [ ] Only USER messages count toward limit
- [ ] Messages stored with metadata (provider, tokens, latency)
- [ ] Chat page renders with message bubbles, streaming, and input
- [ ] Provider selector works and persists choice
- [ ] Chat limit banner shows remaining messages
- [ ] SSE streaming renders AI response in real-time
- [ ] ALL existing tests still pass
