# Phase 9: Workspace & Navigation

> **Objective:** Build the workspace (multi-project hub), wire up all navigation, disable V2 features.
> **Branch:** `phase-9/workspace-nav`
> **Dependencies:** Phase 8 complete (document generation works). Can start frontend work in parallel with Phase 8 backend.
> **Acceptance:** User logs in to workspace, creates projects, navigates freely. V2 features hidden.

---

## Pre-flight

```bash
git checkout main
git merge phase-8/document-generation
git checkout -b phase-9/workspace-nav
```

---

## Task 9.1 — Workspace Page

**File:** `apps/web/src/pages/workspace/WorkspacePage.tsx`

This is the post-login landing page. Replaces the old dashboard.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Quiz2Biz                    [Settings] [Log out] │
├─────────────────────────────────────────────┤
│                                             │
│ Your Projects                [+ New Project] │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ My SaaS Idea            Score: 67/100   │ │
│ │ 3 documents · Last active 2h ago        │ │
│ │                              [Open →]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Coffee Shop Business    Score: 23/100   │ │
│ │ 0 documents · Last active 3d ago        │ │
│ │                              [Open →]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ (empty state: "Start your first project")   │
└─────────────────────────────────────────────┘
```

**Data:** `GET /api/workspaces/:id/projects` — returns all projects for user's workspace with summary data (name, score, doc count, last message date, status).

---

## Task 9.2 — Project Card Component

**File:** `apps/web/src/components/workspace/ProjectCard.tsx`

Props: `{ project }` — shows name, score as coloured badge, document count, relative time, status badge.

Click anywhere on the card → navigate to `/project/:id/chat`.

---

## Task 9.3 — New Project Flow

**File:** `apps/web/src/components/workspace/NewProjectFlow.tsx`

Modal or page with:
1. Project name (text input, required)
2. Project type (dropdown: Business Plan, Tech Architecture, Marketing Strategy, Financial Projections, Investor Pitch, AI Development, Custom)
3. Optional description (textarea)
4. "Start Chatting" button

On submit: `POST /api/projects` → redirect to `/project/:id/chat`.

---

## Task 9.4 — POST /projects

**Endpoint:** `POST /api/projects`

```typescript
{
  name: string;
  projectType: ProjectType;
  description?: string;
}
```

Creates project linked to user's workspace (Organization). Sets default AI provider to "claude". Returns project ID.

**Also create:** `GET /api/workspaces/:id/projects` — returns all projects for workspace.

**Note:** The "workspace" maps to the existing Organization model. The user's first Organization is their workspace. If they don't have one, create it on first project creation.

---

## Task 9.5 — Rewire App.tsx Router

**Modify:** `apps/web/src/App.tsx`

New route structure:
```typescript
<Routes>
  {/* Auth */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

  {/* Authenticated */}
  <Route element={<AuthGuard />}>
    {/* Workspace (post-login landing) */}
    <Route path="/" element={<WorkspacePage />} />

    {/* Project routes */}
    <Route path="/project/:projectId" element={<ProjectLayout />}>
      <Route index element={<Navigate to="chat" />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="documents" element={<DocumentMenuPage />} />
      <Route path="documents/review" element={<FactReviewPage />} />
      <Route path="documents/my" element={<MyDocumentsPage />} />
    </Route>

    {/* Settings */}
    <Route path="/settings" element={<SettingsPage />} />

    {/* Legal (keep existing) */}
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
  </Route>

  {/* Help (keep existing, accessible without auth) */}
  <Route path="/help" element={<HelpPage />} />
</Routes>
```

**Remove routes for:** Evidence Registry, Decision Log, Policy Pack, Heatmap, Questionnaire.

---

## Task 9.6 — Project Layout with Sidebar

**File:** `apps/web/src/components/layout/ProjectLayout.tsx`

Wraps all `/project/:id/*` routes. Provides:
- Project header (name, score badge)
- Sidebar navigation: Chat | Dashboard | Documents
- Main content area (renders child route via `<Outlet />`)
- Back to Workspace link

**File:** `apps/web/src/components/layout/ProjectSidebar.tsx`

Three navigation items with icons:
- 💬 Chat (default active)
- 📊 Dashboard
- 📄 Documents

Active state based on current route. Badge on Dashboard showing score. Badge on Documents showing doc count.

---

## Task 9.7 — Remove V2 Features from Navigation

**Modify:** Layout components to remove links to:
- Evidence Registry
- Decision Log
- Policy Pack
- Engineering Standards
- Heatmap
- Questionnaire

**Do NOT delete the page/module files.** Only remove navigation links and route definitions. The code stays for V2.

---

## Task 9.8 — Remove QPG Module Import

**Modify:** `apps/api/src/app.module.ts`

Remove or comment out the QPG (Qoder Prompt Generator) module import. It's not needed for Quiz2Biz.

```typescript
// Remove this line:
// import { QpgModule } from './modules/qpg/qpg.module';
// And remove from imports array
```

---

## Task 9.9 — Update Help Page

**Modify:** `apps/web/src/pages/help/HelpPage.tsx`

Update content to reflect the new product:
- What is Quiz2Biz? → Chat with AI, benchmark quality, generate documents
- How to start → Create project, chat about your idea
- Understanding your score → Quality dimensions and standards
- Generating documents → Quality slider, pricing, formats
- Comparing providers → Side-by-side comparison feature
- Pricing → Per-document, no subscriptions

---

## Task 9.10 — E2E Test

Full flow: Login → Workspace → New Project → Chat (3 messages) → Dashboard (score visible) → Documents → Select type → Slider → Review → Pay → Generate → Download → Back to Workspace.

---

## Completion

```bash
git add -A
git commit -m "Phase 9: Workspace and navigation — multi-project hub with chat-first routing"
git push origin phase-9/workspace-nav
```

**Acceptance checklist:**
- [ ] Workspace page is post-login landing
- [ ] User can create new projects with type selection
- [ ] Project sidebar navigates between Chat, Dashboard, Documents
- [ ] All routes work: /, /project/:id/chat, /dashboard, /documents
- [ ] Evidence, Decision Log, Policy Pack, Standards hidden from nav
- [ ] QPG module removed from app.module.ts
- [ ] Help page updated for new product
- [ ] Full E2E flow passes
- [ ] ALL existing tests still pass
