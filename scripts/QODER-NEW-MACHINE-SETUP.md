# Qoder New Machine Setup — Quiz2Biz

## Prerequisites

- Windows 10/11
- Node.js 22+ (`node -v`)
- Git (`git --version`)
- VS Code with Qoder extension
- PowerShell 5.1+

---

## Step 1: Clone Repository

```powershell
git clone https://github.com/AviTech82/Quiz-to-Build.git c:\Repos\Quiz-to-Build
cd c:\Repos\Quiz-to-Build
```

This gives you ALL config files automatically:
- `.qoder/rules/` — 31 rule files (AVI-OS, project standards, etc.)
- `.vscode/settings.json` — workspace settings
- `.vscode/launch.json` — 8 debug configurations
- `.vscode/extensions.json` — recommended extensions
- `CLAUDE.md` — project context and operational rules
- `.avi-os-SKILL.md` — pre-flight validation protocol
- `.avi-os-coding-quality-SKILL.md` — ISO/OWASP/SOLID standards
- `.prettierrc` — code formatting config
- `eslint.config.mjs` — ESLint with ISO complexity rules
- `tsconfig.json` — TypeScript strict mode config
- `turbo.json` — monorepo pipeline config
- `jest.config.js` — test runner config
- `playwright.config.ts` — E2E test config

---

## Step 2: Install VS Code Extensions

Copy and run this entire block in PowerShell:

```powershell
$extensions = @(
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "firefox-devtools.vscode-firefox-debug",
    "github.copilot",
    "github.copilot-chat",
    "github.remotehub",
    "github.vscode-github-actions",
    "github.vscode-pull-request-github",
    "humao.rest-client",
    "ms-azuretools.azure-dev",
    "ms-azuretools.vscode-azureappservice",
    "ms-azuretools.vscode-azurecontainerapps",
    "ms-azuretools.vscode-azurefunctions",
    "ms-azuretools.vscode-azureresourcegroups",
    "ms-azuretools.vscode-azurestaticwebapps",
    "ms-azuretools.vscode-azurestorage",
    "ms-azuretools.vscode-azurevirtualmachines",
    "ms-azuretools.vscode-containers",
    "ms-azuretools.vscode-cosmosdb",
    "ms-azuretools.vscode-docker",
    "ms-ossdata.vscode-pgsql",
    "ms-playwright.playwright",
    "ms-python.debugpy",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.vscode-python-envs",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.azure-repos",
    "ms-vscode.powershell",
    "ms-vscode.remote-repositories",
    "ms-vscode.vscode-node-azure-pack",
    "orta.vscode-jest",
    "prisma.prisma",
    "ryanluker.vscode-coverage-gutters",
    "streetsidesoftware.code-spell-checker",
    "vitest.explorer",
    "yzhang.markdown-all-in-one"
)
foreach ($ext in $extensions) {
    Write-Host "Installing $ext..." -ForegroundColor Cyan
    code --install-extension $ext
}
Write-Host "Done! $($extensions.Count) extensions installed." -ForegroundColor Green
```

---

## Step 3: Install Dependencies & Generate Prisma Client

```powershell
cd c:\Repos\Quiz-to-Build
npm ci --legacy-peer-deps
npx prisma generate
```

---

## Step 4: Create .env File

```powershell
Copy-Item .env.example .env
```

Then edit `.env` with your actual values (database URL, JWT secrets, API keys, etc.).

---

## Step 5: Verify Setup

```powershell
# Check Node
node -v

# Check extensions
code --list-extensions | Measure-Object

# Check rules
Get-ChildItem ".qoder\rules\*.md" | Measure-Object

# Check key files exist
@("CLAUDE.md", ".avi-os-SKILL.md", ".avi-os-coding-quality-SKILL.md", ".prettierrc", ".vscode\settings.json", ".vscode\launch.json", "eslint.config.mjs", "tsconfig.json", "turbo.json", "playwright.config.ts") | ForEach-Object {
    $exists = Test-Path $_
    Write-Host "$_ : $exists"
}
```

---

## Step 6: Qoder Memories

Open a new Qoder conversation and paste each block below as a **separate message**. Wait for Qoder to confirm each one before sending the next.

---

### Memory 1 of 10 — Honesty Protocol

```
Please remember this as a mandatory rule:

MANDATORY HONESTY RULES - NO EXCEPTIONS:
1. Never claim completion without evidence (show proof: command output, file content, test results)
2. Measure before committing (run measurement FIRST, report actual values)
3. Uncertainty = Say so ("I don't know" or "I need to verify first")
4. Immediate mistake admission (admit immediately, explain, fix)
5. No inflated claims (don't say "95%" when actual is "81%")
6. Verification before declaration (run the test before saying "tests pass")
If you violate any of these rules, I will call you out immediately.
```

---

### Memory 2 of 10 — Development Standards

```
Please remember these as my development standards:

Performance: Lighthouse 90+ Performance/SEO/Best Practices; INP <=200ms; WebP/AVIF images; lazy-load below-the-fold.
Error Handling: Form fields validate on blur; empty states for all lists/dashboards; loading skeleton/spinner >300ms.
Responsive: Breakpoints 320/768/1024/1440px; prefers-color-scheme dark mode; button states Idle/Hover/Active/Disabled.
Security: Parameterized queries only; auth checks on all endpoints; no hardcoded passwords/tokens; validate all external input.
WCAG: Text contrast 4.5:1; UI components 3:1; visible focus ring; logical Tab order; aria-labels on icon buttons; 44x44px touch targets.
Naming: Components PascalCase; utilities camelCase; constants UPPER_SNAKE_CASE; use async/await not Promise.then.
Testing: Unit tests for all new functions; integration tests for API endpoints.
Docs: JSDoc/docstrings for public APIs; README updates for new features.
```

---

### Memory 3 of 10 — Communication Preferences

```
Please remember my communication preferences:

Status updates every 5 minutes during long operations. Respond instantly to 'update?'. Brief action-focused responses. Report blockages immediately with exact issue details. Mirror my labeled list format.
All tasks require pre-approval: confirm plan before execution. After approval, execute autonomously with continuous testing until ALL GREEN. If stuck, provide 2-3 concrete options.
Command response style: imperative verb-first phrases only, no explanations or filler.
TODOLIST-first response: respond with concise numbered TODOLIST as primary output. I reference tasks by numeric identifiers like '3 and 4'.
Debugging Swagger/Prisma enum issues: respond exclusively with prioritized executable to-do list.
Monitor GitHub for new repos and ask "New repository detected: [repo-name]. Should I link it to Qoder?" Link if I say YES.
```

---

### Memory 4 of 10 — User Identity

```
Please remember my identity:

GitHub username: AviTech82
Azure subscription: Visual Studio Enterprise
```

---

### Memory 5 of 10 — UI/UX Preferences

```
Please remember my UI/UX design preferences:

Visual design-focused with Nielsen's 10 heuristics enforcement.
Dark mode preference with micro-animations.
Modern, clean aesthetic; accessible-first design.
```

---

### Memory 6 of 10 — Prettier Config

```
Please remember this project's Prettier config:

singleQuote: true, trailingComma: all, printWidth: 100, tabWidth: 2, semi: true, bracketSpacing: true, arrowParens: always, endOfLine: lf
```

---

### Memory 7 of 10 — Common Pitfalls

```
Please remember these common pitfalls I've encountered:

- Windows PowerShell: use New-Item -ItemType Directory -Force, not mkdir in run_in_terminal
- JSON editing: preserve trailing commas when using search_replace on settings.json
- Prisma seed files: cast JSON.parse results to Prisma.InputJsonValue
- ts-jest preset prevents coverage instrumentation (use default jest config instead)
- Use @libs/database workspace package imports, not relative paths like ../../libs
- Jest ESM mocking: requires __esModule:true and beforeEach re-setup for each test
- GitHub Actions inline JS in script:| blocks causes YAML parser false positives - extract to .github/scripts/*.js
```

---

### Memory 8 of 10 — Prisma Skills

```
Please remember this about Prisma schema evolution:

When adding new Prisma models/enums: update schema.prisma, create migration with npx prisma migrate dev, run npx prisma generate.
For JSON fields: use Prisma.InputJsonValue for writes, Prisma.JsonNull for null values instead of literal null.
Always regenerate client after schema changes. TypeScript types come from generated .d.ts in node_modules/.prisma/client.
Cast JSON.parse() results with 'as Prisma.InputJsonValue' or 'as string[]' to satisfy strict TypeScript.
```

---

### Memory 9 of 10 — ISO Standards

```
Please remember these ISO and coding standards I enforce:

Act as Senior Software Architect and ISO Compliance Officer.
ISO/IEC 5055 and 25010: MI > 65, cyclomatic complexity <=15 per module, zero critical weaknesses.
ISO/IEC 27001/27002: Security by Design, parameterized queries, least privilege, zero hardcoded credentials.
ISO/IEC 12207: Structure for CI/CD, version control, traceability.
SOLID, DRY, KISS, YAGNI enforced. Functions <=30 lines, files <=400 lines, params <=3, nesting <=3.
Descriptive naming (no abbreviations). Comments explain "why" not "what". JSDoc for all public APIs.
Code review checklist: SOLID? No injection? All error paths? Coverage met? No N+1?
```

---

### Memory 10 of 10 — Measurable Targets

```
Please remember these measurable development targets:

ISO/IEC 5055 targets: Security >=90%, Reliability >=90%, Efficiency >=85%, Maintainability >=85%.
Cyclomatic complexity: target 10-15, max 20. MI: minimum 65, target >=80.
DORA: Lead time <1hr (elite), rework rate <5%, 70% PRs under 200 lines, max 300.
Security gates: SAST + DAST no HIGH/CRITICAL, dependency scan clean, zero secrets.
AI verification: static analysis + type check + >=80% coverage + peer review + hallucination scan.
Sprint validation scoring: ISO 20%, Complexity 10%, MI 15%, Docs 10%, DORA 15%, Security 20%, AI 10%.
Deploy blocked if score <70%.
```

---

## Checklist

After completing all steps:

- [ ] Repository cloned
- [ ] VS Code extensions installed (39+)
- [ ] `npm ci` completed
- [ ] `npx prisma generate` completed
- [ ] `.env` created from `.env.example`
- [ ] All 10 memories pasted into Qoder (one per message)
- [ ] `.qoder/rules/` has 31 rule files
- [ ] `CLAUDE.md` exists
- [ ] `.avi-os-SKILL.md` exists
- [ ] `.avi-os-coding-quality-SKILL.md` exists

**Setup complete. Qoder is ready.**
