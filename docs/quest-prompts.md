# Quest Mode Prompts

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | AI-assisted development prompts |

---

## 1. Overview

This document contains structured prompts for AI-assisted development of the Adaptive Client Questionnaire System. These prompts are designed to be used with AI coding assistants to accelerate development while maintaining consistency and quality.

---

## 2. Project Setup Prompts

### 2.1 Initialize Monorepo

```markdown
# Prompt: Initialize Project Structure

Create a monorepo structure for an Adaptive Questionnaire System with the following requirements:

**Project Structure:**
- Monorepo using Turborepo or Nx
- Shared packages for types, utilities, and UI components
- Apps: web (React), mobile (React Native), api (NestJS)

**Technical Stack:**
- TypeScript throughout
- React 18+ for web
- React Native 0.73+ for mobile
- NestJS 10+ for API
- PostgreSQL with Prisma ORM
- Redis for caching

**Requirements:**
1. Configure ESLint with shared rules
2. Configure Prettier with consistent formatting
3. Set up Husky for pre-commit hooks
4. Configure TypeScript with strict mode
5. Set up path aliases (@shared, @api, @web, @mobile)

Generate the complete folder structure, package.json files, and configuration files.
```

### 2.2 Database Schema Setup

```markdown
# Prompt: Create Database Schema

Create a Prisma schema for an Adaptive Questionnaire System based on these requirements:

**Core Entities:**
1. User - authentication and profile
2. Organization - multi-tenant support
3. QuestionnaireSession - user's questionnaire progress
4. Response - individual question responses (JSONB)
5. GeneratedDocument - output documents

**Schema Requirements:**
- Use UUID for all primary keys
- Include audit fields (createdAt, updatedAt, createdBy)
- Soft delete support (deletedAt)
- Multi-tenant isolation via organizationId
- JSONB for flexible response storage

**Relationships:**
- User belongs to Organization
- QuestionnaireSession belongs to User
- Response belongs to QuestionnaireSession
- GeneratedDocument belongs to QuestionnaireSession

Include indexes for common query patterns and foreign key constraints.
```

### 2.3 API Module Structure

```markdown
# Prompt: Generate NestJS API Structure

Create a NestJS API module structure for an Adaptive Questionnaire System:

**Modules Required:**
1. AuthModule - JWT authentication, refresh tokens
2. UserModule - user management, profiles
3. QuestionnaireModule - session management, responses
4. AdaptiveLogicModule - rule evaluation engine
5. DocumentGeneratorModule - document generation
6. AdminModule - admin dashboard APIs

**For Each Module Generate:**
- Controller with REST endpoints
- Service with business logic
- DTOs with class-validator decorators
- Entity/Model definitions
- Unit test files

**Cross-Cutting Concerns:**
- Global exception filter
- Request logging interceptor
- Response transformation interceptor
- Rate limiting guard
- API versioning (v1)

Follow NestJS best practices and include Swagger/OpenAPI decorators.
```

---

## 3. Core Feature Prompts

### 3.1 Adaptive Logic Engine

```markdown
# Prompt: Implement Adaptive Logic Engine

Create an Adaptive Logic Engine service that evaluates conditional rules to determine question visibility, requirements, and branching.

**Rule Types:**
1. Visibility Rules - show/hide questions
2. Requirement Rules - make questions required/optional
3. Skip Rules - skip entire sections
4. Branching Rules - route to different question paths

**Condition Operators:**
- equals, not_equals
- includes, not_includes (for arrays)
- in, not_in
- greater_than, less_than, between
- is_empty, is_not_empty

**Implementation Requirements:**
1. Rule evaluation should be efficient (O(n) or better)
2. Support AND/OR operators for combining conditions
3. Cache evaluation results with invalidation on response change
4. Build dependency graph for efficient re-evaluation
5. Support nested conditions

**Interface:**
```typescript
interface AdaptiveLogicEngine {
  evaluateQuestion(questionId: string, responses: Map<string, any>): QuestionState;
  getNextQuestion(currentId: string, responses: Map<string, any>): string | null;
  evaluateSection(sectionId: string, responses: Map<string, any>): SectionState;
}
```

Include comprehensive unit tests for all rule types and edge cases.
```

### 3.2 Question Renderer

```markdown
# Prompt: Create Question Renderer Component

Create a React component system for rendering different question types in a one-question-at-a-time interface.

**Question Types to Support:**
1. SingleChoice - radio buttons
2. MultiChoice - checkboxes  
3. TextInput - single line text
4. TextArea - multi-line text
5. NumberInput - numeric with validation
6. DatePicker - date selection
7. Scale - 1-5 or 1-10 rating
8. FileUpload - document attachment

**Requirements:**
1. Each question type as a separate component
2. Factory pattern for question rendering
3. Consistent animation between questions
4. Progress indicator
5. Help text/tooltip support
6. Validation feedback
7. Keyboard navigation (Enter to continue)
8. Mobile-responsive design

**Accessibility:**
- WCAG 2.1 AA compliant
- Screen reader support
- Focus management
- Error announcements

**Props Interface:**
```typescript
interface QuestionProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
  isLoading?: boolean;
}
```

Include Storybook stories for each component variant.
```

### 3.3 Session Management

```markdown
# Prompt: Implement Session Management

Create a questionnaire session management system with these features:

**Session Lifecycle:**
1. Create session with initial context
2. Save responses incrementally (auto-save)
3. Calculate progress percentage
4. Handle session pause/resume
5. Session expiration handling
6. Session completion and locking

**State Management (React Context + Reducer):**
```typescript
interface SessionState {
  sessionId: string;
  currentQuestionId: string;
  responses: Map<string, any>;
  progress: number;
  completedSections: string[];
  validationErrors: Map<string, string>;
  isLoading: boolean;
  isSaving: boolean;
}
```

**Actions:**
- START_SESSION
- SET_RESPONSE
- NAVIGATE_NEXT
- NAVIGATE_BACK
- NAVIGATE_TO_QUESTION
- SAVE_PROGRESS
- COMPLETE_SESSION
- RESET_SESSION

**Persistence:**
- Auto-save to API every 30 seconds
- Save on question change
- Local storage backup for offline
- Conflict resolution for concurrent edits

Include optimistic updates and error recovery.
```

### 3.4 Document Generator

```markdown
# Prompt: Create Document Generator Service

Create a document generation service that transforms questionnaire responses into professional documents.

**Output Documents:**
1. Business Plan (PDF/DOCX)
2. Technical Architecture Document
3. Requirements Document (BRD/FRD)
4. User Stories Export
5. Executive Summary

**Generation Pipeline:**
1. Collect all responses for session
2. Apply industry template transformations
3. Map responses to document sections
4. Generate markdown/structured content
5. Apply document template
6. Render to final format (PDF/DOCX)

**Technology:**
- Use Handlebars for templating
- Use Puppeteer for PDF generation
- Use docx library for Word documents
- Use marked for markdown processing

**Template System:**
```typescript
interface DocumentTemplate {
  id: string;
  name: string;
  format: 'pdf' | 'docx' | 'md';
  sections: TemplateSection[];
  styles: DocumentStyles;
  outputMapping: OutputMapping[];
}
```

**Requirements:**
1. Support conditional sections based on responses
2. Dynamic table generation
3. Chart/graph embedding
4. Professional styling
5. Table of contents generation
6. Page numbering
7. Watermark support

Include background job processing for large documents.
```

---

## 4. UI/UX Prompts

### 4.1 Design System

```markdown
# Prompt: Create Design System

Create a design system for the Adaptive Questionnaire using these specifications:

**Color Palette:**
- Primary: #2563EB (Blue)
- Secondary: #7C3AED (Purple)
- Success: #059669 (Green)
- Warning: #D97706 (Amber)
- Error: #DC2626 (Red)
- Neutral: Gray scale

**Typography:**
- Font Family: Inter
- Headings: 600-700 weight
- Body: 400 weight
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48px

**Spacing:**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

**Components to Create:**
1. Button (primary, secondary, outline, ghost, sizes)
2. Input (text, number, textarea, with validation states)
3. Select (single, multi, searchable)
4. Checkbox and Radio
5. Progress Bar and Progress Ring
6. Card and Container
7. Modal and Drawer
8. Toast notifications
9. Loading states (skeleton, spinner)
10. Navigation components

Use CSS-in-JS (styled-components or Emotion) with theme support.
Include dark mode variants.
```

### 4.2 Questionnaire Flow UI

```markdown
# Prompt: Design Questionnaire Flow Interface

Create the main questionnaire flow interface with these features:

**Layout:**
- Full-screen, distraction-free design
- Centered question card (max-width: 600px)
- Progress bar at top
- Navigation at bottom

**Question Card:**
- Question text (large, clear typography)
- Help text (subtle, expandable)
- Input area (type-specific)
- Continue button
- Back button (secondary)

**Animations:**
- Smooth transitions between questions (slide/fade)
- Progress bar animation
- Input focus animations
- Validation error shake

**Progress Indicator:**
- Percentage complete
- Section indicators
- Estimated time remaining

**Responsive Behavior:**
- Desktop: centered card with padding
- Tablet: full-width with margins
- Mobile: full-width, bottom-anchored navigation

**Keyboard Shortcuts:**
- Enter: Continue to next
- Escape: Back to previous
- Tab: Navigate options
- Number keys: Select option (1-9)

Include loading states and error handling UI.
```

### 4.3 Results Dashboard

```markdown
# Prompt: Create Results Dashboard

Create a dashboard for viewing completed questionnaire results and generated documents.

**Dashboard Sections:**
1. Summary Overview
   - Completion status
   - Key metrics extracted
   - Document readiness

2. Response Review
   - Categorized by section
   - Editable responses
   - Validation status

3. Generated Documents
   - Document cards with preview
   - Download options (PDF, DOCX)
   - Regenerate button

4. Export Options
   - Export all as ZIP
   - Share link generation
   - Integration options

**Visualizations:**
- Completion progress chart
- Response breakdown by category
- Key metrics cards

**Actions:**
- Edit responses (reopen questionnaire)
- Regenerate documents
- Download individual or all
- Share results

Make it responsive and include print-friendly styles.
```

---

## 5. API Endpoint Prompts

### 5.1 Authentication Endpoints

```markdown
# Prompt: Implement Authentication API

Create NestJS authentication endpoints with these specifications:

**Endpoints:**
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET /api/v1/auth/me

**Requirements:**
1. JWT access tokens (15 min expiry)
2. Refresh tokens (7 day expiry, stored in DB)
3. Password hashing with bcrypt (12 rounds)
4. Rate limiting (5 attempts per minute)
5. Email verification flow
6. Password reset with secure tokens

**Security:**
- Secure HTTP-only cookies for refresh tokens
- CSRF protection
- Request signing for sensitive operations
- Audit logging for auth events

**DTOs with Validation:**
```typescript
class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;
  
  @IsString()
  @MinLength(2)
  name: string;
}
```

Include Swagger documentation and comprehensive error responses.
```

### 5.2 Questionnaire Session Endpoints

```markdown
# Prompt: Create Session Management API

Create NestJS endpoints for questionnaire session management:

**Endpoints:**
POST   /api/v1/sessions              - Create new session
GET    /api/v1/sessions              - List user's sessions
GET    /api/v1/sessions/:id          - Get session details
PUT    /api/v1/sessions/:id          - Update session
DELETE /api/v1/sessions/:id          - Delete session
POST   /api/v1/sessions/:id/complete - Complete session

**Response Endpoints:**
POST   /api/v1/sessions/:id/responses           - Save response
GET    /api/v1/sessions/:id/responses           - Get all responses
PUT    /api/v1/sessions/:id/responses/:questionId - Update response

**Question Flow Endpoints:**
GET    /api/v1/sessions/:id/current-question    - Get current question
GET    /api/v1/sessions/:id/next-question       - Get next question
GET    /api/v1/sessions/:id/progress            - Get progress info

**Response Format:**
```json
{
  "success": true,
  "data": {
    "session": {...},
    "currentQuestion": {...},
    "progress": {
      "percentage": 45,
      "completedQuestions": 12,
      "totalQuestions": 27,
      "estimatedTimeRemaining": "8 minutes"
    }
  }
}
```

Include pagination for session list and response validation.
```

### 5.3 Document Generation Endpoints

```markdown
# Prompt: Create Document Generation API

Create NestJS endpoints for document generation:

**Endpoints:**
POST   /api/v1/sessions/:id/documents/generate   - Generate documents
GET    /api/v1/sessions/:id/documents            - List generated docs
GET    /api/v1/sessions/:id/documents/:docId     - Get document details
GET    /api/v1/sessions/:id/documents/:docId/download - Download document

**Generation Request:**
```json
{
  "documentTypes": ["business_plan", "technical_architecture"],
  "format": "pdf",
  "options": {
    "includeTableOfContents": true,
    "includeExecutiveSummary": true,
    "watermark": null
  }
}
```

**Generation Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "estimatedTime": 30,
    "documents": [
      {
        "id": "uuid",
        "type": "business_plan",
        "status": "processing",
        "progress": 45
      }
    ]
  }
}
```

**Requirements:**
1. Async generation with job queue
2. Progress tracking via polling or WebSocket
3. Secure download URLs (signed, time-limited)
4. Caching for regeneration

Include error handling for generation failures.
```

---

## 6. Testing Prompts

### 6.1 Unit Tests

```markdown
# Prompt: Create Unit Tests for Adaptive Logic Engine

Create comprehensive unit tests for the Adaptive Logic Engine:

**Test Categories:**
1. Condition Evaluation
   - Test each operator (equals, not_equals, includes, etc.)
   - Test with different data types
   - Test null/undefined handling

2. Rule Evaluation
   - Visibility rules
   - Requirement rules
   - Skip rules
   - Branching rules

3. Rule Combination
   - AND operator
   - OR operator
   - Nested conditions

4. Performance
   - Large rule sets (1000+ rules)
   - Deep dependency chains
   - Cache effectiveness

**Example Test Structure:**
```typescript
describe('AdaptiveLogicEngine', () => {
  describe('evaluateCondition', () => {
    describe('equals operator', () => {
      it('should return true when values match exactly', () => {});
      it('should return false when values differ', () => {});
      it('should handle null values correctly', () => {});
    });
  });
  
  describe('evaluateQuestion', () => {
    it('should show question when visibility rule passes', () => {});
    it('should hide question when visibility rule fails', () => {});
    it('should apply multiple rules in priority order', () => {});
  });
});
```

Use Jest with coverage requirements (80% minimum).
```

### 6.2 Integration Tests

```markdown
# Prompt: Create Integration Tests for Session API

Create integration tests for the questionnaire session API:

**Test Setup:**
- Use test database (PostgreSQL)
- Seed with test data
- Authenticated test user

**Test Scenarios:**
1. Session Lifecycle
   - Create session
   - Add responses
   - Navigate questions
   - Complete session

2. Response Handling
   - Save valid response
   - Validate required fields
   - Handle invalid data
   - Update existing response

3. Progress Calculation
   - Verify percentage calculation
   - Section completion tracking
   - Conditional question handling

4. Concurrency
   - Simultaneous response saves
   - Session locking on completion

**Example:**
```typescript
describe('Session API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    testUser = await createTestUser();
  });
  
  describe('POST /sessions', () => {
    it('should create a new session', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ templateId: 'default' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.session.id).toBeDefined();
    });
  });
});
```

Use Supertest and include cleanup after tests.
```

### 6.3 E2E Tests

```markdown
# Prompt: Create E2E Tests for Questionnaire Flow

Create end-to-end tests for the complete questionnaire flow using Playwright:

**Test Flows:**
1. Complete Questionnaire
   - Login
   - Start new questionnaire
   - Answer all questions
   - Navigate back and forth
   - Complete and generate documents
   - Download documents

2. Resume Session
   - Start questionnaire
   - Answer partial questions
   - Close browser
   - Reopen and verify progress
   - Continue from saved point

3. Adaptive Logic
   - Answer branching question
   - Verify correct path shown
   - Verify skipped questions

**Example:**
```typescript
test('complete questionnaire flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Start questionnaire
  await page.click('text=Start New Questionnaire');
  
  // Answer questions
  await expect(page.locator('h1')).toContainText('Company Name');
  await page.fill('[name="company_name"]', 'Test Company');
  await page.click('text=Continue');
  
  // Verify progress
  await expect(page.locator('[data-testid="progress"]')).toContainText('5%');
});
```

Include visual regression tests and accessibility checks.
```

---

## 7. DevOps Prompts

### 7.1 Docker Configuration

```markdown
# Prompt: Create Docker Configuration

Create Docker configuration for the Adaptive Questionnaire System:

**Services:**
1. API (NestJS)
2. Web (React/Next.js)
3. PostgreSQL
4. Redis
5. Worker (for async jobs)

**Requirements:**
1. Multi-stage builds for production
2. Development configuration with hot reload
3. Health checks for all services
4. Network isolation
5. Volume mounts for persistence

**Files to Generate:**
- Dockerfile.api
- Dockerfile.web
- docker-compose.yml (development)
- docker-compose.prod.yml (production)
- .dockerignore

**Example API Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Include environment variable handling and secrets management.
```

### 7.2 CI/CD Pipeline

```markdown
# Prompt: Create CI/CD Pipeline

Create a GitHub Actions CI/CD pipeline:

**Workflow Triggers:**
- Push to main/develop
- Pull request to main
- Manual dispatch

**Pipeline Stages:**
1. Lint and Type Check
2. Unit Tests (parallel by package)
3. Integration Tests
4. E2E Tests (on PR merge)
5. Build Docker Images
6. Security Scan (Snyk/Trivy)
7. Deploy to Environment

**Environments:**
- development (auto-deploy from develop)
- staging (auto-deploy from main)
- production (manual approval)

**Jobs:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

Include caching for node_modules and build artifacts.
```

### 7.3 Infrastructure as Code

```markdown
# Prompt: Create Terraform Infrastructure

Create Terraform configuration for AWS deployment:

**Resources:**
1. VPC with public/private subnets
2. ECS Fargate cluster
3. RDS PostgreSQL (Multi-AZ)
4. ElastiCache Redis
5. Application Load Balancer
6. CloudFront distribution
7. S3 buckets (assets, documents)
8. Route53 DNS
9. ACM certificates
10. Secrets Manager

**Modules:**
- networking
- database
- cache
- compute
- storage
- cdn

**Requirements:**
1. Environment-specific configurations (dev, staging, prod)
2. Auto-scaling policies
3. Backup configurations
4. Monitoring and alerting
5. Cost optimization tags

**Example:**
```hcl
module "ecs_cluster" {
  source = "./modules/compute"
  
  cluster_name = "${var.project_name}-${var.environment}"
  vpc_id       = module.networking.vpc_id
  subnets      = module.networking.private_subnets
  
  services = {
    api = {
      image       = "${var.ecr_repository}/api:${var.api_version}"
      cpu         = 512
      memory      = 1024
      port        = 3000
      min_count   = 2
      max_count   = 10
    }
  }
}
```

Include state management with S3 backend and state locking.
```

---

## 8. Mobile Development Prompts

### 8.1 React Native Setup

```markdown
# Prompt: Initialize React Native App

Create a React Native application for the Adaptive Questionnaire:

**Configuration:**
- React Native 0.73+
- TypeScript
- React Navigation
- React Query for data fetching
- Zustand for state management
- React Native Paper for UI

**Project Structure:**
```
mobile/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   └── types/
├── ios/
├── android/
└── package.json
```

**Screens:**
1. AuthScreen (Login/Register)
2. HomeScreen (Session list)
3. QuestionnaireScreen (Question flow)
4. ProgressScreen (Session progress)
5. ResultsScreen (Documents view)
6. SettingsScreen

**Requirements:**
1. Offline-first with sync
2. Push notifications
3. Biometric authentication
4. Deep linking
5. Crash reporting (Sentry)

Include Fastlane configuration for automated builds.
```

### 8.2 Mobile Question Components

```markdown
# Prompt: Create Mobile Question Components

Create React Native components for question rendering:

**Components:**
1. QuestionCard - container with animation
2. SingleChoiceInput - radio-style selection
3. MultiChoiceInput - checkbox-style selection
4. TextInputField - styled text input
5. NumberInputField - numeric keypad
6. DatePickerField - native date picker
7. ScaleInput - slider component
8. FileUploadField - image/document picker

**Mobile-Specific Requirements:**
1. Gesture handling (swipe to navigate)
2. Haptic feedback on selection
3. Native keyboard handling
4. Orientation support
5. Safe area handling

**Example:**
```tsx
const SingleChoiceInput: FC<SingleChoiceProps> = ({
  options,
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.option,
            value === option.id && styles.selected,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(option.id);
          }}
        >
          <Text style={styles.optionText}>{option.label}</Text>
          {value === option.id && (
            <Icon name="check" style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

Include accessibility labels and test IDs.
```

---

## 9. Security Prompts

### 9.1 Security Implementation

```markdown
# Prompt: Implement Security Controls

Implement security controls for the questionnaire system:

**Authentication:**
1. JWT with RSA signing
2. Refresh token rotation
3. Session management
4. MFA support (TOTP)

**Authorization:**
1. Role-based access control (RBAC)
2. Resource-level permissions
3. API rate limiting
4. IP allowlisting (admin)

**Data Protection:**
1. Encryption at rest (AES-256)
2. Encryption in transit (TLS 1.3)
3. PII masking in logs
4. Secure session storage

**Input Validation:**
1. Request sanitization
2. SQL injection prevention
3. XSS prevention
4. CSRF protection

**Audit:**
1. Authentication events
2. Data access logging
3. Admin actions
4. API request logging

**Implementation:**
```typescript
// Rate limiting middleware
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `rate_limit:${request.ip}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    
    if (count > 100) {
      throw new TooManyRequestsException();
    }
    
    return true;
  }
}
```

Include security testing with OWASP ZAP integration.
```

### 9.2 Data Privacy Implementation

```markdown
# Prompt: Implement Privacy Controls

Implement GDPR/CCPA compliant privacy controls:

**Features:**
1. Consent Management
   - Cookie consent
   - Data processing consent
   - Marketing consent

2. Data Subject Rights
   - Right to access (data export)
   - Right to rectification
   - Right to erasure
   - Right to portability

3. Data Minimization
   - Collect only necessary data
   - Automatic data retention
   - Anonymization after retention

**API Endpoints:**
```
POST /api/v1/privacy/consent     - Record consent
GET  /api/v1/privacy/data        - Export user data
DELETE /api/v1/privacy/data      - Delete user data
GET  /api/v1/privacy/preferences - Get privacy settings
PUT  /api/v1/privacy/preferences - Update preferences
```

**Implementation:**
```typescript
@Injectable()
export class PrivacyService {
  async exportUserData(userId: string): Promise<DataExport> {
    const user = await this.userService.findById(userId);
    const sessions = await this.sessionService.findByUser(userId);
    const responses = await this.responseService.findByUser(userId);
    
    return {
      exportDate: new Date(),
      user: this.sanitizeUser(user),
      questionnaireSessions: sessions,
      responses: responses,
      consents: await this.getConsents(userId),
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Soft delete with 30-day grace period
    await this.userService.softDelete(userId);
    await this.scheduleHardDelete(userId, 30);
    await this.auditService.log('USER_DATA_DELETION_REQUESTED', userId);
  }
}
```

Include data processing records and DPA templates.
```

---

## 10. Performance Prompts

### 10.1 Database Optimization

```markdown
# Prompt: Optimize Database Performance

Optimize PostgreSQL database for the questionnaire system:

**Indexes:**
1. Create indexes for common query patterns
2. Partial indexes for filtered queries
3. GIN indexes for JSONB columns
4. Composite indexes for joins

**Query Optimization:**
1. Analyze slow queries
2. Optimize N+1 queries
3. Use database views for complex queries
4. Implement pagination efficiently

**Example Indexes:**
```sql
-- Sessions lookup
CREATE INDEX idx_sessions_user_id ON questionnaire_sessions(user_id);
CREATE INDEX idx_sessions_status ON questionnaire_sessions(status) 
  WHERE status != 'completed';

-- JSONB response queries  
CREATE INDEX idx_responses_data ON responses USING GIN (data);

-- Full-text search
CREATE INDEX idx_questions_search ON questions 
  USING GIN (to_tsvector('english', question_text));
```

**Connection Pooling:**
```typescript
// Prisma configuration
datasources:
  db:
    connection_limit: 20
    pool_timeout: 10
```

Include explain analyze examples and monitoring setup.
```

### 10.2 API Caching

```markdown
# Prompt: Implement API Caching

Implement caching strategy for the questionnaire API:

**Caching Layers:**
1. Redis for session data
2. CDN for static assets
3. HTTP caching headers
4. Query result caching

**Cacheable Resources:**
- Question definitions (long TTL)
- Industry templates (medium TTL)
- User sessions (short TTL)
- Generated documents (until invalidated)

**Implementation:**
```typescript
@Injectable()
export class CacheService {
  constructor(private redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const value = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(value));
    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}

// Usage
@Get('questions/:id')
@UseInterceptors(CacheInterceptor)
@CacheTTL(3600)
async getQuestion(@Param('id') id: string) {
  return this.questionService.findById(id);
}
```

Include cache warming and invalidation strategies.
```

---

## Usage Instructions

1. **Copy** the relevant prompt section
2. **Customize** variables and requirements for your specific use case
3. **Provide** to your AI coding assistant
4. **Review** generated code for security and best practices
5. **Iterate** with follow-up prompts for refinements

---

*These prompts are designed to accelerate development while maintaining quality and consistency across the codebase.*
# Quest Mode Prompts

## Document Control
| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | System | AI-assisted development prompts |

---

## 1. Overview

This document contains structured prompts for AI-assisted development of the Adaptive Client Questionnaire System. These prompts are designed to be used with AI coding assistants to accelerate development while maintaining consistency and quality.

---

## 2. Project Setup Prompts

### 2.1 Initialize Monorepo

```markdown
# Prompt: Initialize Project Structure

Create a monorepo structure for an Adaptive Questionnaire System with the following requirements:

**Project Structure:**
- Monorepo using Turborepo or Nx
- Shared packages for types, utilities, and UI components
- Apps: web (React), mobile (React Native), api (NestJS)

**Technical Stack:**
- TypeScript throughout
- React 18+ for web
- React Native 0.73+ for mobile
- NestJS 10+ for API
- PostgreSQL with Prisma ORM
- Redis for caching

**Requirements:**
1. Configure ESLint with shared rules
2. Configure Prettier with consistent formatting
3. Set up Husky for pre-commit hooks
4. Configure TypeScript with strict mode
5. Set up path aliases (@shared, @api, @web, @mobile)

Generate the complete folder structure, package.json files, and configuration files.
```

### 2.2 Database Schema Setup

```markdown
# Prompt: Create Database Schema

Create a Prisma schema for an Adaptive Questionnaire System based on these requirements:

**Core Entities:**
1. User - authentication and profile
2. Organization - multi-tenant support
3. QuestionnaireSession - user's questionnaire progress
4. Response - individual question responses (JSONB)
5. GeneratedDocument - output documents

**Schema Requirements:**
- Use UUID for all primary keys
- Include audit fields (createdAt, updatedAt, createdBy)
- Soft delete support (deletedAt)
- Multi-tenant isolation via organizationId
- JSONB for flexible response storage

**Relationships:**
- User belongs to Organization
- QuestionnaireSession belongs to User
- Response belongs to QuestionnaireSession
- GeneratedDocument belongs to QuestionnaireSession

Include indexes for common query patterns and foreign key constraints.
```

### 2.3 API Module Structure

```markdown
# Prompt: Generate NestJS API Structure

Create a NestJS API module structure for an Adaptive Questionnaire System:

**Modules Required:**
1. AuthModule - JWT authentication, refresh tokens
2. UserModule - user management, profiles
3. QuestionnaireModule - session management, responses
4. AdaptiveLogicModule - rule evaluation engine
5. DocumentGeneratorModule - document generation
6. AdminModule - admin dashboard APIs

**For Each Module Generate:**
- Controller with REST endpoints
- Service with business logic
- DTOs with class-validator decorators
- Entity/Model definitions
- Unit test files

**Cross-Cutting Concerns:**
- Global exception filter
- Request logging interceptor
- Response transformation interceptor
- Rate limiting guard
- API versioning (v1)

Follow NestJS best practices and include Swagger/OpenAPI decorators.
```

---

## 3. Core Feature Prompts

### 3.1 Adaptive Logic Engine

```markdown
# Prompt: Implement Adaptive Logic Engine

Create an Adaptive Logic Engine service that evaluates conditional rules to determine question visibility, requirements, and branching.

**Rule Types:**
1. Visibility Rules - show/hide questions
2. Requirement Rules - make questions required/optional
3. Skip Rules - skip entire sections
4. Branching Rules - route to different question paths

**Condition Operators:**
- equals, not_equals
- includes, not_includes (for arrays)
- in, not_in
- greater_than, less_than, between
- is_empty, is_not_empty

**Implementation Requirements:**
1. Rule evaluation should be efficient (O(n) or better)
2. Support AND/OR operators for combining conditions
3. Cache evaluation results with invalidation on response change
4. Build dependency graph for efficient re-evaluation
5. Support nested conditions

**Interface:**
```typescript
interface AdaptiveLogicEngine {
  evaluateQuestion(questionId: string, responses: Map<string, any>): QuestionState;
  getNextQuestion(currentId: string, responses: Map<string, any>): string | null;
  evaluateSection(sectionId: string, responses: Map<string, any>): SectionState;
}
```

Include comprehensive unit tests for all rule types and edge cases.
```

### 3.2 Question Renderer

```markdown
# Prompt: Create Question Renderer Component

Create a React component system for rendering different question types in a one-question-at-a-time interface.

**Question Types to Support:**
1. SingleChoice - radio buttons
2. MultiChoice - checkboxes  
3. TextInput - single line text
4. TextArea - multi-line text
5. NumberInput - numeric with validation
6. DatePicker - date selection
7. Scale - 1-5 or 1-10 rating
8. FileUpload - document attachment

**Requirements:**
1. Each question type as a separate component
2. Factory pattern for question rendering
3. Consistent animation between questions
4. Progress indicator
5. Help text/tooltip support
6. Validation feedback
7. Keyboard navigation (Enter to continue)
8. Mobile-responsive design

**Accessibility:**
- WCAG 2.1 AA compliant
- Screen reader support
- Focus management
- Error announcements

**Props Interface:**
```typescript
interface QuestionProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
  isLoading?: boolean;
}
```

Include Storybook stories for each component variant.
```

### 3.3 Session Management

```markdown
# Prompt: Implement Session Management

Create a questionnaire session management system with these features:

**Session Lifecycle:**
1. Create session with initial context
2. Save responses incrementally (auto-save)
3. Calculate progress percentage
4. Handle session pause/resume
5. Session expiration handling
6. Session completion and locking

**State Management (React Context + Reducer):**
```typescript
interface SessionState {
  sessionId: string;
  currentQuestionId: string;
  responses: Map<string, any>;
  progress: number;
  completedSections: string[];
  validationErrors: Map<string, string>;
  isLoading: boolean;
  isSaving: boolean;
}
```

**Actions:**
- START_SESSION
- SET_RESPONSE
- NAVIGATE_NEXT
- NAVIGATE_BACK
- NAVIGATE_TO_QUESTION
- SAVE_PROGRESS
- COMPLETE_SESSION
- RESET_SESSION

**Persistence:**
- Auto-save to API every 30 seconds
- Save on question change
- Local storage backup for offline
- Conflict resolution for concurrent edits

Include optimistic updates and error recovery.
```

### 3.4 Document Generator

```markdown
# Prompt: Create Document Generator Service

Create a document generation service that transforms questionnaire responses into professional documents.

**Output Documents:**
1. Business Plan (PDF/DOCX)
2. Technical Architecture Document
3. Requirements Document (BRD/FRD)
4. User Stories Export
5. Executive Summary

**Generation Pipeline:**
1. Collect all responses for session
2. Apply industry template transformations
3. Map responses to document sections
4. Generate markdown/structured content
5. Apply document template
6. Render to final format (PDF/DOCX)

**Technology:**
- Use Handlebars for templating
- Use Puppeteer for PDF generation
- Use docx library for Word documents
- Use marked for markdown processing

**Template System:**
```typescript
interface DocumentTemplate {
  id: string;
  name: string;
  format: 'pdf' | 'docx' | 'md';
  sections: TemplateSection[];
  styles: DocumentStyles;
  outputMapping: OutputMapping[];
}
```

**Requirements:**
1. Support conditional sections based on responses
2. Dynamic table generation
3. Chart/graph embedding
4. Professional styling
5. Table of contents generation
6. Page numbering
7. Watermark support

Include background job processing for large documents.
```

---

## 4. UI/UX Prompts

### 4.1 Design System

```markdown
# Prompt: Create Design System

Create a design system for the Adaptive Questionnaire using these specifications:

**Color Palette:**
- Primary: #2563EB (Blue)
- Secondary: #7C3AED (Purple)
- Success: #059669 (Green)
- Warning: #D97706 (Amber)
- Error: #DC2626 (Red)
- Neutral: Gray scale

**Typography:**
- Font Family: Inter
- Headings: 600-700 weight
- Body: 400 weight
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48px

**Spacing:**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

**Components to Create:**
1. Button (primary, secondary, outline, ghost, sizes)
2. Input (text, number, textarea, with validation states)
3. Select (single, multi, searchable)
4. Checkbox and Radio
5. Progress Bar and Progress Ring
6. Card and Container
7. Modal and Drawer
8. Toast notifications
9. Loading states (skeleton, spinner)
10. Navigation components

Use CSS-in-JS (styled-components or Emotion) with theme support.
Include dark mode variants.
```

### 4.2 Questionnaire Flow UI

```markdown
# Prompt: Design Questionnaire Flow Interface

Create the main questionnaire flow interface with these features:

**Layout:**
- Full-screen, distraction-free design
- Centered question card (max-width: 600px)
- Progress bar at top
- Navigation at bottom

**Question Card:**
- Question text (large, clear typography)
- Help text (subtle, expandable)
- Input area (type-specific)
- Continue button
- Back button (secondary)

**Animations:**
- Smooth transitions between questions (slide/fade)
- Progress bar animation
- Input focus animations
- Validation error shake

**Progress Indicator:**
- Percentage complete
- Section indicators
- Estimated time remaining

**Responsive Behavior:**
- Desktop: centered card with padding
- Tablet: full-width with margins
- Mobile: full-width, bottom-anchored navigation

**Keyboard Shortcuts:**
- Enter: Continue to next
- Escape: Back to previous
- Tab: Navigate options
- Number keys: Select option (1-9)

Include loading states and error handling UI.
```

### 4.3 Results Dashboard

```markdown
# Prompt: Create Results Dashboard

Create a dashboard for viewing completed questionnaire results and generated documents.

**Dashboard Sections:**
1. Summary Overview
   - Completion status
   - Key metrics extracted
   - Document readiness

2. Response Review
   - Categorized by section
   - Editable responses
   - Validation status

3. Generated Documents
   - Document cards with preview
   - Download options (PDF, DOCX)
   - Regenerate button

4. Export Options
   - Export all as ZIP
   - Share link generation
   - Integration options

**Visualizations:**
- Completion progress chart
- Response breakdown by category
- Key metrics cards

**Actions:**
- Edit responses (reopen questionnaire)
- Regenerate documents
- Download individual or all
- Share results

Make it responsive and include print-friendly styles.
```

---

## 5. API Endpoint Prompts

### 5.1 Authentication Endpoints

```markdown
# Prompt: Implement Authentication API

Create NestJS authentication endpoints with these specifications:

**Endpoints:**
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET /api/v1/auth/me

**Requirements:**
1. JWT access tokens (15 min expiry)
2. Refresh tokens (7 day expiry, stored in DB)
3. Password hashing with bcrypt (12 rounds)
4. Rate limiting (5 attempts per minute)
5. Email verification flow
6. Password reset with secure tokens

**Security:**
- Secure HTTP-only cookies for refresh tokens
- CSRF protection
- Request signing for sensitive operations
- Audit logging for auth events

**DTOs with Validation:**
```typescript
class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;
  
  @IsString()
  @MinLength(2)
  name: string;
}
```

Include Swagger documentation and comprehensive error responses.
```

### 5.2 Questionnaire Session Endpoints

```markdown
# Prompt: Create Session Management API

Create NestJS endpoints for questionnaire session management:

**Endpoints:**
POST   /api/v1/sessions              - Create new session
GET    /api/v1/sessions              - List user's sessions
GET    /api/v1/sessions/:id          - Get session details
PUT    /api/v1/sessions/:id          - Update session
DELETE /api/v1/sessions/:id          - Delete session
POST   /api/v1/sessions/:id/complete - Complete session

**Response Endpoints:**
POST   /api/v1/sessions/:id/responses           - Save response
GET    /api/v1/sessions/:id/responses           - Get all responses
PUT    /api/v1/sessions/:id/responses/:questionId - Update response

**Question Flow Endpoints:**
GET    /api/v1/sessions/:id/current-question    - Get current question
GET    /api/v1/sessions/:id/next-question       - Get next question
GET    /api/v1/sessions/:id/progress            - Get progress info

**Response Format:**
```json
{
  "success": true,
  "data": {
    "session": {...},
    "currentQuestion": {...},
    "progress": {
      "percentage": 45,
      "completedQuestions": 12,
      "totalQuestions": 27,
      "estimatedTimeRemaining": "8 minutes"
    }
  }
}
```

Include pagination for session list and response validation.
```

### 5.3 Document Generation Endpoints

```markdown
# Prompt: Create Document Generation API

Create NestJS endpoints for document generation:

**Endpoints:**
POST   /api/v1/sessions/:id/documents/generate   - Generate documents
GET    /api/v1/sessions/:id/documents            - List generated docs
GET    /api/v1/sessions/:id/documents/:docId     - Get document details
GET    /api/v1/sessions/:id/documents/:docId/download - Download document

**Generation Request:**
```json
{
  "documentTypes": ["business_plan", "technical_architecture"],
  "format": "pdf",
  "options": {
    "includeTableOfContents": true,
    "includeExecutiveSummary": true,
    "watermark": null
  }
}
```

**Generation Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "estimatedTime": 30,
    "documents": [
      {
        "id": "uuid",
        "type": "business_plan",
        "status": "processing",
        "progress": 45
      }
    ]
  }
}
```

**Requirements:**
1. Async generation with job queue
2. Progress tracking via polling or WebSocket
3. Secure download URLs (signed, time-limited)
4. Caching for regeneration

Include error handling for generation failures.
```

---

## 6. Testing Prompts

### 6.1 Unit Tests

```markdown
# Prompt: Create Unit Tests for Adaptive Logic Engine

Create comprehensive unit tests for the Adaptive Logic Engine:

**Test Categories:**
1. Condition Evaluation
   - Test each operator (equals, not_equals, includes, etc.)
   - Test with different data types
   - Test null/undefined handling

2. Rule Evaluation
   - Visibility rules
   - Requirement rules
   - Skip rules
   - Branching rules

3. Rule Combination
   - AND operator
   - OR operator
   - Nested conditions

4. Performance
   - Large rule sets (1000+ rules)
   - Deep dependency chains
   - Cache effectiveness

**Example Test Structure:**
```typescript
describe('AdaptiveLogicEngine', () => {
  describe('evaluateCondition', () => {
    describe('equals operator', () => {
      it('should return true when values match exactly', () => {});
      it('should return false when values differ', () => {});
      it('should handle null values correctly', () => {});
    });
  });
  
  describe('evaluateQuestion', () => {
    it('should show question when visibility rule passes', () => {});
    it('should hide question when visibility rule fails', () => {});
    it('should apply multiple rules in priority order', () => {});
  });
});
```

Use Jest with coverage requirements (80% minimum).
```

### 6.2 Integration Tests

```markdown
# Prompt: Create Integration Tests for Session API

Create integration tests for the questionnaire session API:

**Test Setup:**
- Use test database (PostgreSQL)
- Seed with test data
- Authenticated test user

**Test Scenarios:**
1. Session Lifecycle
   - Create session
   - Add responses
   - Navigate questions
   - Complete session

2. Response Handling
   - Save valid response
   - Validate required fields
   - Handle invalid data
   - Update existing response

3. Progress Calculation
   - Verify percentage calculation
   - Section completion tracking
   - Conditional question handling

4. Concurrency
   - Simultaneous response saves
   - Session locking on completion

**Example:**
```typescript
describe('Session API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    testUser = await createTestUser();
  });
  
  describe('POST /sessions', () => {
    it('should create a new session', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ templateId: 'default' });
      
      expect(response.status).toBe(201);
      expect(response.body.data.session.id).toBeDefined();
    });
  });
});
```

Use Supertest and include cleanup after tests.
```

### 6.3 E2E Tests

```markdown
# Prompt: Create E2E Tests for Questionnaire Flow

Create end-to-end tests for the complete questionnaire flow using Playwright:

**Test Flows:**
1. Complete Questionnaire
   - Login
   - Start new questionnaire
   - Answer all questions
   - Navigate back and forth
   - Complete and generate documents
   - Download documents

2. Resume Session
   - Start questionnaire
   - Answer partial questions
   - Close browser
   - Reopen and verify progress
   - Continue from saved point

3. Adaptive Logic
   - Answer branching question
   - Verify correct path shown
   - Verify skipped questions

**Example:**
```typescript
test('complete questionnaire flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Start questionnaire
  await page.click('text=Start New Questionnaire');
  
  // Answer questions
  await expect(page.locator('h1')).toContainText('Company Name');
  await page.fill('[name="company_name"]', 'Test Company');
  await page.click('text=Continue');
  
  // Verify progress
  await expect(page.locator('[data-testid="progress"]')).toContainText('5%');
});
```

Include visual regression tests and accessibility checks.
```

---

## 7. DevOps Prompts

### 7.1 Docker Configuration

```markdown
# Prompt: Create Docker Configuration

Create Docker configuration for the Adaptive Questionnaire System:

**Services:**
1. API (NestJS)
2. Web (React/Next.js)
3. PostgreSQL
4. Redis
5. Worker (for async jobs)

**Requirements:**
1. Multi-stage builds for production
2. Development configuration with hot reload
3. Health checks for all services
4. Network isolation
5. Volume mounts for persistence

**Files to Generate:**
- Dockerfile.api
- Dockerfile.web
- docker-compose.yml (development)
- docker-compose.prod.yml (production)
- .dockerignore

**Example API Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Include environment variable handling and secrets management.
```

### 7.2 CI/CD Pipeline

```markdown
# Prompt: Create CI/CD Pipeline

Create a GitHub Actions CI/CD pipeline:

**Workflow Triggers:**
- Push to main/develop
- Pull request to main
- Manual dispatch

**Pipeline Stages:**
1. Lint and Type Check
2. Unit Tests (parallel by package)
3. Integration Tests
4. E2E Tests (on PR merge)
5. Build Docker Images
6. Security Scan (Snyk/Trivy)
7. Deploy to Environment

**Environments:**
- development (auto-deploy from develop)
- staging (auto-deploy from main)
- production (manual approval)

**Jobs:**
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

Include caching for node_modules and build artifacts.
```

### 7.3 Infrastructure as Code

```markdown
# Prompt: Create Terraform Infrastructure

Create Terraform configuration for AWS deployment:

**Resources:**
1. VPC with public/private subnets
2. ECS Fargate cluster
3. RDS PostgreSQL (Multi-AZ)
4. ElastiCache Redis
5. Application Load Balancer
6. CloudFront distribution
7. S3 buckets (assets, documents)
8. Route53 DNS
9. ACM certificates
10. Secrets Manager

**Modules:**
- networking
- database
- cache
- compute
- storage
- cdn

**Requirements:**
1. Environment-specific configurations (dev, staging, prod)
2. Auto-scaling policies
3. Backup configurations
4. Monitoring and alerting
5. Cost optimization tags

**Example:**
```hcl
module "ecs_cluster" {
  source = "./modules/compute"
  
  cluster_name = "${var.project_name}-${var.environment}"
  vpc_id       = module.networking.vpc_id
  subnets      = module.networking.private_subnets
  
  services = {
    api = {
      image       = "${var.ecr_repository}/api:${var.api_version}"
      cpu         = 512
      memory      = 1024
      port        = 3000
      min_count   = 2
      max_count   = 10
    }
  }
}
```

Include state management with S3 backend and state locking.
```

---

## 8. Mobile Development Prompts

### 8.1 React Native Setup

```markdown
# Prompt: Initialize React Native App

Create a React Native application for the Adaptive Questionnaire:

**Configuration:**
- React Native 0.73+
- TypeScript
- React Navigation
- React Query for data fetching
- Zustand for state management
- React Native Paper for UI

**Project Structure:**
```
mobile/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   └── types/
├── ios/
├── android/
└── package.json
```

**Screens:**
1. AuthScreen (Login/Register)
2. HomeScreen (Session list)
3. QuestionnaireScreen (Question flow)
4. ProgressScreen (Session progress)
5. ResultsScreen (Documents view)
6. SettingsScreen

**Requirements:**
1. Offline-first with sync
2. Push notifications
3. Biometric authentication
4. Deep linking
5. Crash reporting (Sentry)

Include Fastlane configuration for automated builds.
```

### 8.2 Mobile Question Components

```markdown
# Prompt: Create Mobile Question Components

Create React Native components for question rendering:

**Components:**
1. QuestionCard - container with animation
2. SingleChoiceInput - radio-style selection
3. MultiChoiceInput - checkbox-style selection
4. TextInputField - styled text input
5. NumberInputField - numeric keypad
6. DatePickerField - native date picker
7. ScaleInput - slider component
8. FileUploadField - image/document picker

**Mobile-Specific Requirements:**
1. Gesture handling (swipe to navigate)
2. Haptic feedback on selection
3. Native keyboard handling
4. Orientation support
5. Safe area handling

**Example:**
```tsx
const SingleChoiceInput: FC<SingleChoiceProps> = ({
  options,
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.option,
            value === option.id && styles.selected,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(option.id);
          }}
        >
          <Text style={styles.optionText}>{option.label}</Text>
          {value === option.id && (
            <Icon name="check" style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

Include accessibility labels and test IDs.
```

---

## 9. Security Prompts

### 9.1 Security Implementation

```markdown
# Prompt: Implement Security Controls

Implement security controls for the questionnaire system:

**Authentication:**
1. JWT with RSA signing
2. Refresh token rotation
3. Session management
4. MFA support (TOTP)

**Authorization:**
1. Role-based access control (RBAC)
2. Resource-level permissions
3. API rate limiting
4. IP allowlisting (admin)

**Data Protection:**
1. Encryption at rest (AES-256)
2. Encryption in transit (TLS 1.3)
3. PII masking in logs
4. Secure session storage

**Input Validation:**
1. Request sanitization
2. SQL injection prevention
3. XSS prevention
4. CSRF protection

**Audit:**
1. Authentication events
2. Data access logging
3. Admin actions
4. API request logging

**Implementation:**
```typescript
// Rate limiting middleware
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `rate_limit:${request.ip}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    
    if (count > 100) {
      throw new TooManyRequestsException();
    }
    
    return true;
  }
}
```

Include security testing with OWASP ZAP integration.
```

### 9.2 Data Privacy Implementation

```markdown
# Prompt: Implement Privacy Controls

Implement GDPR/CCPA compliant privacy controls:

**Features:**
1. Consent Management
   - Cookie consent
   - Data processing consent
   - Marketing consent

2. Data Subject Rights
   - Right to access (data export)
   - Right to rectification
   - Right to erasure
   - Right to portability

3. Data Minimization
   - Collect only necessary data
   - Automatic data retention
   - Anonymization after retention

**API Endpoints:**
```
POST /api/v1/privacy/consent     - Record consent
GET  /api/v1/privacy/data        - Export user data
DELETE /api/v1/privacy/data      - Delete user data
GET  /api/v1/privacy/preferences - Get privacy settings
PUT  /api/v1/privacy/preferences - Update preferences
```

**Implementation:**
```typescript
@Injectable()
export class PrivacyService {
  async exportUserData(userId: string): Promise<DataExport> {
    const user = await this.userService.findById(userId);
    const sessions = await this.sessionService.findByUser(userId);
    const responses = await this.responseService.findByUser(userId);
    
    return {
      exportDate: new Date(),
      user: this.sanitizeUser(user),
      questionnaireSessions: sessions,
      responses: responses,
      consents: await this.getConsents(userId),
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Soft delete with 30-day grace period
    await this.userService.softDelete(userId);
    await this.scheduleHardDelete(userId, 30);
    await this.auditService.log('USER_DATA_DELETION_REQUESTED', userId);
  }
}
```

Include data processing records and DPA templates.
```

---

## 10. Performance Prompts

### 10.1 Database Optimization

```markdown
# Prompt: Optimize Database Performance

Optimize PostgreSQL database for the questionnaire system:

**Indexes:**
1. Create indexes for common query patterns
2. Partial indexes for filtered queries
3. GIN indexes for JSONB columns
4. Composite indexes for joins

**Query Optimization:**
1. Analyze slow queries
2. Optimize N+1 queries
3. Use database views for complex queries
4. Implement pagination efficiently

**Example Indexes:**
```sql
-- Sessions lookup
CREATE INDEX idx_sessions_user_id ON questionnaire_sessions(user_id);
CREATE INDEX idx_sessions_status ON questionnaire_sessions(status) 
  WHERE status != 'completed';

-- JSONB response queries  
CREATE INDEX idx_responses_data ON responses USING GIN (data);

-- Full-text search
CREATE INDEX idx_questions_search ON questions 
  USING GIN (to_tsvector('english', question_text));
```

**Connection Pooling:**
```typescript
// Prisma configuration
datasources:
  db:
    connection_limit: 20
    pool_timeout: 10
```

Include explain analyze examples and monitoring setup.
```

### 10.2 API Caching

```markdown
# Prompt: Implement API Caching

Implement caching strategy for the questionnaire API:

**Caching Layers:**
1. Redis for session data
2. CDN for static assets
3. HTTP caching headers
4. Query result caching

**Cacheable Resources:**
- Question definitions (long TTL)
- Industry templates (medium TTL)
- User sessions (short TTL)
- Generated documents (until invalidated)

**Implementation:**
```typescript
@Injectable()
export class CacheService {
  constructor(private redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const value = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(value));
    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}

// Usage
@Get('questions/:id')
@UseInterceptors(CacheInterceptor)
@CacheTTL(3600)
async getQuestion(@Param('id') id: string) {
  return this.questionService.findById(id);
}
```

Include cache warming and invalidation strategies.
```

---

## Usage Instructions

1. **Copy** the relevant prompt section
2. **Customize** variables and requirements for your specific use case
3. **Provide** to your AI coding assistant
4. **Review** generated code for security and best practices
5. **Iterate** with follow-up prompts for refinements

---

*These prompts are designed to accelerate development while maintaining quality and consistency across the codebase.*
