# Engineering Handbook / Playbook
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Engineering Manager  
**Classification:** Internal

---

## 1. Introduction

### 1.1 Purpose
This Engineering Handbook defines the development lifecycle (SDLC), coding standards, testing expectations, and operational procedures for the Adaptive Client Questionnaire System engineering team.

### 1.2 Scope
This handbook applies to all engineers, contractors, and contributors working on the system.

### 1.3 Values
1. **Quality First** - Ship reliable, secure, maintainable code
2. **User Focus** - Every decision considers user impact
3. **Transparency** - Open communication, documented decisions
4. **Continuous Improvement** - Learn from mistakes, iterate

---

## 2. Development Lifecycle (SDLC)

### 2.1 Methodology
We follow an Agile/Scrum methodology with 2-week sprints.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT LIFECYCLE                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1                              Week 2                                  │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │ Sprint Planning             │    │ Development continues           │    │
│  │ Development begins          │    │ Code reviews                    │    │
│  │ Daily standups              │    │ Testing & QA                    │    │
│  │ Mid-sprint review           │    │ Sprint review                   │    │
│  │                             │    │ Retrospective                   │    │
│  └─────────────────────────────┘    └─────────────────────────────────┘    │
│                                                                              │
│  Sprint Ceremonies:                                                          │
│  • Planning: Monday Week 1 (2 hours)                                        │
│  • Daily Standup: 15 minutes                                                │
│  • Review: Friday Week 2 (1 hour)                                           │
│  • Retrospective: Friday Week 2 (1 hour)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Development Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEATURE DEVELOPMENT WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Ticket Created] → [Backlog Grooming] → [Sprint Planning] → [Development]  │
│                                                                              │
│  Development:                                                                │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│  │ Branch  │──▶│  Code   │──▶│  Test   │──▶│   PR    │──▶│  Review │      │
│  │ from    │   │         │   │  Local  │   │ Created │   │         │      │
│  │ main    │   │         │   │         │   │         │   │         │      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └────┬────┘      │
│                                                                │           │
│                                           ┌────────────────────┴───────┐   │
│                                           │                            │   │
│                                           ▼                            ▼   │
│                                    [Changes Requested]            [Approved]│
│                                           │                            │   │
│                                           │                            ▼   │
│                                           │                       ┌─────────┐
│                                           └───────────────────────│  Merge  │
│                                                                   │ to main │
│                                                                   └────┬────┘
│                                                                        │    │
│  Post-Merge:                                                           ▼    │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐               │    │
│  │   CI    │──▶│ Deploy  │──▶│  Smoke  │──▶│  Done   │◀──────────────┘    │
│  │  Build  │   │   Dev   │   │  Test   │   │         │                    │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | Required reviews, CI pass |
| `develop` | Integration branch | Required reviews |
| `feature/*` | New features | None |
| `bugfix/*` | Bug fixes | None |
| `hotfix/*` | Production emergencies | Fast-track review |
| `release/*` | Release preparation | Required reviews |

**Naming Convention:**
```
feature/TICKET-123-short-description
bugfix/TICKET-456-fix-login-error
hotfix/TICKET-789-critical-security-fix
```

---

## 3. Coding Standards

### 3.1 General Principles
- Write code for humans first, computers second
- Follow the Single Responsibility Principle
- Prefer composition over inheritance
- Keep functions small and focused
- Use meaningful names

### 3.2 Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `QuestionRenderer`, `ProgressBar` |
| Functions | camelCase | `calculateProgress`, `validateResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUESTIONS`, `API_BASE_URL` |
| Variables | camelCase | `currentQuestion`, `userSession` |
| Files (Components) | PascalCase | `QuestionRenderer.tsx` |
| Files (Utils) | camelCase | `dateUtils.ts` |
| CSS Classes | kebab-case | `question-container`, `progress-bar` |
| Database Tables | snake_case | `user_sessions`, `questionnaire_responses` |
| API Endpoints | kebab-case | `/api/v1/user-sessions` |

### 3.3 TypeScript Standards

```typescript
// ✅ Good: Use explicit types
interface QuestionProps {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  onAnswer: (value: ResponseValue) => void;
}

// ✅ Good: Use async/await instead of .then()
async function fetchQuestions(sessionId: string): Promise<Question[]> {
  try {
    const response = await api.get(`/sessions/${sessionId}/questions`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch questions', { sessionId, error });
    throw new QuestionFetchError(error);
  }
}

// ❌ Bad: Promise chains
function fetchQuestions(sessionId: string) {
  return api.get(`/sessions/${sessionId}/questions`)
    .then(response => response.data)
    .catch(error => {
      throw error;
    });
}

// ✅ Good: Null checks with optional chaining
const userName = user?.profile?.name ?? 'Anonymous';

// ✅ Good: Destructuring with defaults
function createSession({ 
  userId, 
  questionnaireId, 
  industry = 'general' 
}: CreateSessionParams): Session {
  // ...
}
```

### 3.4 React Component Standards

```tsx
// ✅ Good: Functional component with proper typing
interface ProgressIndicatorProps {
  percentage: number;
  label?: string;
  showAnimation?: boolean;
}

/**
 * Displays questionnaire completion progress
 * @param percentage - Progress value between 0-100
 * @param label - Optional label text
 * @param showAnimation - Enable progress animation
 */
export function ProgressIndicator({
  percentage,
  label,
  showAnimation = true,
}: ProgressIndicatorProps): JSX.Element {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div 
      className="progress-indicator"
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${clampedPercentage}%`}
    >
      <div 
        className={`progress-bar ${showAnimation ? 'animated' : ''}`}
        style={{ width: `${clampedPercentage}%` }}
      />
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}
```

### 3.5 API/Backend Standards

```typescript
// ✅ Good: Controller with proper validation
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createSession(
    @Body() createDto: CreateSessionDto,
    @User() user: AuthenticatedUser,
  ): Promise<SessionResponse> {
    // Authorization check
    if (!user.canCreateSession()) {
      throw new ForbiddenException('Session creation not allowed');
    }

    // Input is already validated by DTO
    const session = await this.sessionService.create({
      userId: user.id,
      ...createDto,
    });

    return SessionResponse.from(session);
  }
}

// ✅ Good: DTO with validation
export class CreateSessionDto {
  @IsUUID()
  questionnaireId: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  industry?: string;
}
```

### 3.6 Database Query Standards

```typescript
// ✅ Good: Parameterized queries (prevents SQL injection)
const session = await prisma.session.findFirst({
  where: {
    id: sessionId,
    userId: userId,
  },
});

// ✅ Good: Raw query with parameters
const results = await prisma.$queryRaw`
  SELECT * FROM sessions 
  WHERE id = ${sessionId} AND user_id = ${userId}
`;

// ❌ Bad: String concatenation (SQL injection risk!)
const query = `SELECT * FROM sessions WHERE id = '${sessionId}'`;
```

---

## 4. Testing Requirements

### 4.1 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  10%
                    │  Tests    │
                ┌───┴───────────┴───┐
                │   Integration     │  20%
                │      Tests        │
            ┌───┴───────────────────┴───┐
            │        Unit Tests         │  70%
            └───────────────────────────┘
```

### 4.2 Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Line Coverage | 70% | 85% |
| Branch Coverage | 60% | 75% |
| Function Coverage | 80% | 90% |

### 4.3 Unit Test Standards

```typescript
// ✅ Good: Descriptive test names, AAA pattern
describe('calculateProgress', () => {
  it('should return 0 when no questions answered', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 0, totalCount: 10 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(0);
  });

  it('should return 100 when all questions answered', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 10, totalCount: 10 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(100);
  });

  it('should handle edge case of zero total questions', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 0, totalCount: 0 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(true);
  });
});
```

### 4.4 Integration Test Standards

```typescript
// ✅ Good: API integration test
describe('POST /sessions', () => {
  it('should create session for authenticated user', async () => {
    // Arrange
    const user = await createTestUser();
    const token = await getAuthToken(user);
    const questionnaire = await createTestQuestionnaire();

    // Act
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionnaireId: questionnaire.id });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      questionnaireId: questionnaire.id,
      userId: user.id,
      status: 'IN_PROGRESS',
    });
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .send({ questionnaireId: 'quest-123' });

    expect(response.status).toBe(401);
  });
});
```

### 4.5 Performance Testing (k6)

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const response = http.get('https://api.questionnaire.app/v1/health');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## 5. Code Review Process

### 5.1 PR Requirements

Before requesting review:
- [ ] Code compiles without errors
- [ ] All tests pass locally
- [ ] New tests written for new functionality
- [ ] Code follows style guidelines
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated if needed
- [ ] Self-review completed

### 5.2 Review Checklist

| Category | Check |
|----------|-------|
| **Correctness** | Does the code do what it's supposed to? |
| **Security** | Any injection risks? Auth checks in place? |
| **Performance** | Any N+1 queries? Unnecessary operations? |
| **Maintainability** | Is this code easy to understand? |
| **Testing** | Are the tests adequate? Edge cases covered? |
| **Error Handling** | Are errors handled gracefully? |
| **Accessibility** | UI changes meet WCAG requirements? |

### 5.3 Review Guidelines

**For Authors:**
- Keep PRs small (<400 lines when possible)
- Write clear PR descriptions
- Link to related tickets
- Respond to feedback promptly

**For Reviewers:**
- Review within 24 hours
- Be constructive and respectful
- Explain the "why" behind suggestions
- Use "nit:" prefix for minor suggestions
- Approve when satisfied, don't block on nits

---

## 6. Deployment Process

### 6.1 Environment Progression

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [main branch] ──▶ [Build] ──▶ [Test] ──▶ [Dev] ──▶ [Staging] ──▶ [Prod]  │
│                                            │          │            │        │
│                                            │          │            │        │
│                                        Auto       Manual        Manual      │
│                                        Deploy    Promote       Promote      │
│                                                  (after QA)   (approval)    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Deployment Checklist

**Pre-Deployment:**
- [ ] All CI checks passing
- [ ] Database migrations reviewed
- [ ] Feature flags configured
- [ ] Rollback plan documented

**Deployment:**
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Deploy to production (off-peak preferred)

**Post-Deployment:**
- [ ] Verify health checks
- [ ] Monitor metrics for 30 minutes
- [ ] Confirm no increase in error rates
- [ ] Update deployment log

### 6.3 Rollback Procedure

```
ROLLBACK PROCEDURE
==================

1. IDENTIFY ISSUE
   □ Confirm issue is deployment-related
   □ Document the issue

2. INITIATE ROLLBACK
   □ Run: kubectl rollout undo deployment/<service>
   □ Or: Deploy previous version tag

3. VERIFY
   □ Health checks passing
   □ Error rates normalized
   □ Functionality restored

4. POST-ROLLBACK
   □ Create incident ticket
   □ Notify stakeholders
   □ Root cause analysis
```

---

## 7. Monitoring and Observability

### 7.1 Logging Standards

```typescript
// ✅ Good: Structured logging with context
logger.info('Session created', {
  sessionId: session.id,
  userId: user.id,
  questionnaireId: questionnaire.id,
  duration: Date.now() - startTime,
});

// ✅ Good: Error logging with stack trace
logger.error('Failed to generate document', {
  sessionId,
  documentType,
  error: error.message,
  stack: error.stack,
});

// ❌ Bad: Logging sensitive data
logger.info(`User logged in: ${user.email}, password: ${password}`);
```

### 7.2 Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Errors requiring immediate attention |
| WARN | Potential issues, degraded functionality |
| INFO | Significant business events |
| DEBUG | Detailed diagnostic information |

### 7.3 Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Error Rate | > 1% | Page on-call |
| Response Time (p95) | > 500ms | Investigate |
| CPU Usage | > 80% | Scale up |
| Memory Usage | > 85% | Investigate |
| Database Connections | > 80% | Review pool |

---

## 8. On-Call Procedures

### 8.1 On-Call Rotation
- Weekly rotation
- Primary and secondary on-call
- Handoff meeting at rotation change

### 8.2 Incident Response

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| P1 | 15 minutes | Immediate |
| P2 | 1 hour | If unresolved in 2h |
| P3 | 4 hours | If unresolved in 8h |
| P4 | 24 hours | Normal review |

### 8.3 On-Call Checklist

- [ ] PagerDuty app installed and configured
- [ ] VPN access working
- [ ] Access to all production systems verified
- [ ] Runbooks bookmarked
- [ ] Escalation contacts saved

---

## 9. Security Requirements

### 9.1 Secure Coding Checklist

- [ ] No hardcoded credentials
- [ ] All inputs validated and sanitized
- [ ] Parameterized database queries
- [ ] Authorization checks on all endpoints
- [ ] Sensitive data encrypted
- [ ] No secrets in logs
- [ ] Dependencies scanned for vulnerabilities

### 9.2 AI Code Verification

All AI-generated code must:
1. Pass static analysis (ESLint, SonarQube)
2. Have unit tests written
3. Be reviewed by human developer
4. Pass compilation without warnings
5. Not contain placeholder or hallucinated APIs

---

## 10. Documentation Requirements

### 10.1 Code Documentation

```typescript
/**
 * Calculates the adaptive visibility of questions based on previous responses.
 * 
 * @param session - The current questionnaire session
 * @param rules - Visibility rules to evaluate
 * @returns Array of question IDs that should be visible
 * 
 * @example
 * const visibleQuestions = evaluateVisibility(session, rules);
 * // Returns: ['q_001', 'q_002', 'q_005']
 * 
 * @throws {InvalidRuleError} When a rule references non-existent question
 */
export function evaluateVisibility(
  session: Session,
  rules: VisibilityRule[],
): string[] {
  // Implementation
}
```

### 10.2 README Requirements

Every repository/service must have:
- Project description
- Setup instructions
- Environment variables
- Available scripts
- Testing instructions
- Deployment information

---

## 11. Related Documents

- [Technology Strategy](./02-technology-strategy.md)
- [Product Architecture](./03-product-architecture.md)
- [Information Security Policy](./08-information-security-policy.md)
- [Technical Debt Register](./07-technical-debt-register.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Engineering Manager | {{EM_NAME}} | | |
# Engineering Handbook / Playbook
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Engineering Manager  
**Classification:** Internal

---

## 1. Introduction

### 1.1 Purpose
This Engineering Handbook defines the development lifecycle (SDLC), coding standards, testing expectations, and operational procedures for the Adaptive Client Questionnaire System engineering team.

### 1.2 Scope
This handbook applies to all engineers, contractors, and contributors working on the system.

### 1.3 Values
1. **Quality First** - Ship reliable, secure, maintainable code
2. **User Focus** - Every decision considers user impact
3. **Transparency** - Open communication, documented decisions
4. **Continuous Improvement** - Learn from mistakes, iterate

---

## 2. Development Lifecycle (SDLC)

### 2.1 Methodology
We follow an Agile/Scrum methodology with 2-week sprints.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT LIFECYCLE                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1                              Week 2                                  │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │ Sprint Planning             │    │ Development continues           │    │
│  │ Development begins          │    │ Code reviews                    │    │
│  │ Daily standups              │    │ Testing & QA                    │    │
│  │ Mid-sprint review           │    │ Sprint review                   │    │
│  │                             │    │ Retrospective                   │    │
│  └─────────────────────────────┘    └─────────────────────────────────┘    │
│                                                                              │
│  Sprint Ceremonies:                                                          │
│  • Planning: Monday Week 1 (2 hours)                                        │
│  • Daily Standup: 15 minutes                                                │
│  • Review: Friday Week 2 (1 hour)                                           │
│  • Retrospective: Friday Week 2 (1 hour)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Development Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEATURE DEVELOPMENT WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Ticket Created] → [Backlog Grooming] → [Sprint Planning] → [Development]  │
│                                                                              │
│  Development:                                                                │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│  │ Branch  │──▶│  Code   │──▶│  Test   │──▶│   PR    │──▶│  Review │      │
│  │ from    │   │         │   │  Local  │   │ Created │   │         │      │
│  │ main    │   │         │   │         │   │         │   │         │      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └────┬────┘      │
│                                                                │           │
│                                           ┌────────────────────┴───────┐   │
│                                           │                            │   │
│                                           ▼                            ▼   │
│                                    [Changes Requested]            [Approved]│
│                                           │                            │   │
│                                           │                            ▼   │
│                                           │                       ┌─────────┐
│                                           └───────────────────────│  Merge  │
│                                                                   │ to main │
│                                                                   └────┬────┘
│                                                                        │    │
│  Post-Merge:                                                           ▼    │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐               │    │
│  │   CI    │──▶│ Deploy  │──▶│  Smoke  │──▶│  Done   │◀──────────────┘    │
│  │  Build  │   │   Dev   │   │  Test   │   │         │                    │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | Required reviews, CI pass |
| `develop` | Integration branch | Required reviews |
| `feature/*` | New features | None |
| `bugfix/*` | Bug fixes | None |
| `hotfix/*` | Production emergencies | Fast-track review |
| `release/*` | Release preparation | Required reviews |

**Naming Convention:**
```
feature/TICKET-123-short-description
bugfix/TICKET-456-fix-login-error
hotfix/TICKET-789-critical-security-fix
```

---

## 3. Coding Standards

### 3.1 General Principles
- Write code for humans first, computers second
- Follow the Single Responsibility Principle
- Prefer composition over inheritance
- Keep functions small and focused
- Use meaningful names

### 3.2 Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `QuestionRenderer`, `ProgressBar` |
| Functions | camelCase | `calculateProgress`, `validateResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUESTIONS`, `API_BASE_URL` |
| Variables | camelCase | `currentQuestion`, `userSession` |
| Files (Components) | PascalCase | `QuestionRenderer.tsx` |
| Files (Utils) | camelCase | `dateUtils.ts` |
| CSS Classes | kebab-case | `question-container`, `progress-bar` |
| Database Tables | snake_case | `user_sessions`, `questionnaire_responses` |
| API Endpoints | kebab-case | `/api/v1/user-sessions` |

### 3.3 TypeScript Standards

```typescript
// ✅ Good: Use explicit types
interface QuestionProps {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  onAnswer: (value: ResponseValue) => void;
}

// ✅ Good: Use async/await instead of .then()
async function fetchQuestions(sessionId: string): Promise<Question[]> {
  try {
    const response = await api.get(`/sessions/${sessionId}/questions`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch questions', { sessionId, error });
    throw new QuestionFetchError(error);
  }
}

// ❌ Bad: Promise chains
function fetchQuestions(sessionId: string) {
  return api.get(`/sessions/${sessionId}/questions`)
    .then(response => response.data)
    .catch(error => {
      throw error;
    });
}

// ✅ Good: Null checks with optional chaining
const userName = user?.profile?.name ?? 'Anonymous';

// ✅ Good: Destructuring with defaults
function createSession({ 
  userId, 
  questionnaireId, 
  industry = 'general' 
}: CreateSessionParams): Session {
  // ...
}
```

### 3.4 React Component Standards

```tsx
// ✅ Good: Functional component with proper typing
interface ProgressIndicatorProps {
  percentage: number;
  label?: string;
  showAnimation?: boolean;
}

/**
 * Displays questionnaire completion progress
 * @param percentage - Progress value between 0-100
 * @param label - Optional label text
 * @param showAnimation - Enable progress animation
 */
export function ProgressIndicator({
  percentage,
  label,
  showAnimation = true,
}: ProgressIndicatorProps): JSX.Element {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div 
      className="progress-indicator"
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${clampedPercentage}%`}
    >
      <div 
        className={`progress-bar ${showAnimation ? 'animated' : ''}`}
        style={{ width: `${clampedPercentage}%` }}
      />
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}
```

### 3.5 API/Backend Standards

```typescript
// ✅ Good: Controller with proper validation
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createSession(
    @Body() createDto: CreateSessionDto,
    @User() user: AuthenticatedUser,
  ): Promise<SessionResponse> {
    // Authorization check
    if (!user.canCreateSession()) {
      throw new ForbiddenException('Session creation not allowed');
    }

    // Input is already validated by DTO
    const session = await this.sessionService.create({
      userId: user.id,
      ...createDto,
    });

    return SessionResponse.from(session);
  }
}

// ✅ Good: DTO with validation
export class CreateSessionDto {
  @IsUUID()
  questionnaireId: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  industry?: string;
}
```

### 3.6 Database Query Standards

```typescript
// ✅ Good: Parameterized queries (prevents SQL injection)
const session = await prisma.session.findFirst({
  where: {
    id: sessionId,
    userId: userId,
  },
});

// ✅ Good: Raw query with parameters
const results = await prisma.$queryRaw`
  SELECT * FROM sessions 
  WHERE id = ${sessionId} AND user_id = ${userId}
`;

// ❌ Bad: String concatenation (SQL injection risk!)
const query = `SELECT * FROM sessions WHERE id = '${sessionId}'`;
```

---

## 4. Testing Requirements

### 4.1 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  10%
                    │  Tests    │
                ┌───┴───────────┴───┐
                │   Integration     │  20%
                │      Tests        │
            ┌───┴───────────────────┴───┐
            │        Unit Tests         │  70%
            └───────────────────────────┘
```

### 4.2 Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Line Coverage | 70% | 85% |
| Branch Coverage | 60% | 75% |
| Function Coverage | 80% | 90% |

### 4.3 Unit Test Standards

```typescript
// ✅ Good: Descriptive test names, AAA pattern
describe('calculateProgress', () => {
  it('should return 0 when no questions answered', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 0, totalCount: 10 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(0);
  });

  it('should return 100 when all questions answered', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 10, totalCount: 10 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(100);
  });

  it('should handle edge case of zero total questions', () => {
    // Arrange
    const session = createMockSession({ answeredCount: 0, totalCount: 0 });

    // Act
    const result = calculateProgress(session);

    // Assert
    expect(result.percentage).toBe(0);
    expect(result.isComplete).toBe(true);
  });
});
```

### 4.4 Integration Test Standards

```typescript
// ✅ Good: API integration test
describe('POST /sessions', () => {
  it('should create session for authenticated user', async () => {
    // Arrange
    const user = await createTestUser();
    const token = await getAuthToken(user);
    const questionnaire = await createTestQuestionnaire();

    // Act
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionnaireId: questionnaire.id });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      questionnaireId: questionnaire.id,
      userId: user.id,
      status: 'IN_PROGRESS',
    });
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .send({ questionnaireId: 'quest-123' });

    expect(response.status).toBe(401);
  });
});
```

### 4.5 Performance Testing (k6)

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  const response = http.get('https://api.questionnaire.app/v1/health');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## 5. Code Review Process

### 5.1 PR Requirements

Before requesting review:
- [ ] Code compiles without errors
- [ ] All tests pass locally
- [ ] New tests written for new functionality
- [ ] Code follows style guidelines
- [ ] No hardcoded secrets or credentials
- [ ] Documentation updated if needed
- [ ] Self-review completed

### 5.2 Review Checklist

| Category | Check |
|----------|-------|
| **Correctness** | Does the code do what it's supposed to? |
| **Security** | Any injection risks? Auth checks in place? |
| **Performance** | Any N+1 queries? Unnecessary operations? |
| **Maintainability** | Is this code easy to understand? |
| **Testing** | Are the tests adequate? Edge cases covered? |
| **Error Handling** | Are errors handled gracefully? |
| **Accessibility** | UI changes meet WCAG requirements? |

### 5.3 Review Guidelines

**For Authors:**
- Keep PRs small (<400 lines when possible)
- Write clear PR descriptions
- Link to related tickets
- Respond to feedback promptly

**For Reviewers:**
- Review within 24 hours
- Be constructive and respectful
- Explain the "why" behind suggestions
- Use "nit:" prefix for minor suggestions
- Approve when satisfied, don't block on nits

---

## 6. Deployment Process

### 6.1 Environment Progression

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [main branch] ──▶ [Build] ──▶ [Test] ──▶ [Dev] ──▶ [Staging] ──▶ [Prod]  │
│                                            │          │            │        │
│                                            │          │            │        │
│                                        Auto       Manual        Manual      │
│                                        Deploy    Promote       Promote      │
│                                                  (after QA)   (approval)    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Deployment Checklist

**Pre-Deployment:**
- [ ] All CI checks passing
- [ ] Database migrations reviewed
- [ ] Feature flags configured
- [ ] Rollback plan documented

**Deployment:**
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Deploy to production (off-peak preferred)

**Post-Deployment:**
- [ ] Verify health checks
- [ ] Monitor metrics for 30 minutes
- [ ] Confirm no increase in error rates
- [ ] Update deployment log

### 6.3 Rollback Procedure

```
ROLLBACK PROCEDURE
==================

1. IDENTIFY ISSUE
   □ Confirm issue is deployment-related
   □ Document the issue

2. INITIATE ROLLBACK
   □ Run: kubectl rollout undo deployment/<service>
   □ Or: Deploy previous version tag

3. VERIFY
   □ Health checks passing
   □ Error rates normalized
   □ Functionality restored

4. POST-ROLLBACK
   □ Create incident ticket
   □ Notify stakeholders
   □ Root cause analysis
```

---

## 7. Monitoring and Observability

### 7.1 Logging Standards

```typescript
// ✅ Good: Structured logging with context
logger.info('Session created', {
  sessionId: session.id,
  userId: user.id,
  questionnaireId: questionnaire.id,
  duration: Date.now() - startTime,
});

// ✅ Good: Error logging with stack trace
logger.error('Failed to generate document', {
  sessionId,
  documentType,
  error: error.message,
  stack: error.stack,
});

// ❌ Bad: Logging sensitive data
logger.info(`User logged in: ${user.email}, password: ${password}`);
```

### 7.2 Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Errors requiring immediate attention |
| WARN | Potential issues, degraded functionality |
| INFO | Significant business events |
| DEBUG | Detailed diagnostic information |

### 7.3 Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Error Rate | > 1% | Page on-call |
| Response Time (p95) | > 500ms | Investigate |
| CPU Usage | > 80% | Scale up |
| Memory Usage | > 85% | Investigate |
| Database Connections | > 80% | Review pool |

---

## 8. On-Call Procedures

### 8.1 On-Call Rotation
- Weekly rotation
- Primary and secondary on-call
- Handoff meeting at rotation change

### 8.2 Incident Response

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| P1 | 15 minutes | Immediate |
| P2 | 1 hour | If unresolved in 2h |
| P3 | 4 hours | If unresolved in 8h |
| P4 | 24 hours | Normal review |

### 8.3 On-Call Checklist

- [ ] PagerDuty app installed and configured
- [ ] VPN access working
- [ ] Access to all production systems verified
- [ ] Runbooks bookmarked
- [ ] Escalation contacts saved

---

## 9. Security Requirements

### 9.1 Secure Coding Checklist

- [ ] No hardcoded credentials
- [ ] All inputs validated and sanitized
- [ ] Parameterized database queries
- [ ] Authorization checks on all endpoints
- [ ] Sensitive data encrypted
- [ ] No secrets in logs
- [ ] Dependencies scanned for vulnerabilities

### 9.2 AI Code Verification

All AI-generated code must:
1. Pass static analysis (ESLint, SonarQube)
2. Have unit tests written
3. Be reviewed by human developer
4. Pass compilation without warnings
5. Not contain placeholder or hallucinated APIs

---

## 10. Documentation Requirements

### 10.1 Code Documentation

```typescript
/**
 * Calculates the adaptive visibility of questions based on previous responses.
 * 
 * @param session - The current questionnaire session
 * @param rules - Visibility rules to evaluate
 * @returns Array of question IDs that should be visible
 * 
 * @example
 * const visibleQuestions = evaluateVisibility(session, rules);
 * // Returns: ['q_001', 'q_002', 'q_005']
 * 
 * @throws {InvalidRuleError} When a rule references non-existent question
 */
export function evaluateVisibility(
  session: Session,
  rules: VisibilityRule[],
): string[] {
  // Implementation
}
```

### 10.2 README Requirements

Every repository/service must have:
- Project description
- Setup instructions
- Environment variables
- Available scripts
- Testing instructions
- Deployment information

---

## 11. Related Documents

- [Technology Strategy](./02-technology-strategy.md)
- [Product Architecture](./03-product-architecture.md)
- [Information Security Policy](./08-information-security-policy.md)
- [Technical Debt Register](./07-technical-debt-register.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Engineering Manager | {{EM_NAME}} | | |
